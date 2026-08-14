import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Kafka, type Producer } from 'kafkajs';
import { Redis } from 'ioredis';
import { z, ZodError } from 'zod';
import {
  decodeCursor,
  encodeCursor,
  LOCATION_RAW_TOPIC,
  locationEventSchema,
  type DeviceState,
  type LocationEvent,
} from '@realtime/contracts';
import { LocationDatabase } from '@realtime/db';
import { metrics } from '@realtime/observability';
export interface EventProducer {
  send(events: LocationEvent[]): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}
export class KafkaEventProducer implements EventProducer {
  private producer: Producer;
  private connected = false;
  constructor() {
    this.producer = new Kafka({
      clientId: 'ingestion-api',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(','),
    }).producer({ allowAutoTopicCreation: true });
  }
  async ensure() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }
  async send(events: LocationEvent[]) {
    await this.ensure();
    await this.producer.send({
      topic: LOCATION_RAW_TOPIC,
      acks: -1,
      messages: events.map((e) => ({
        key: e.device_id,
        value: JSON.stringify(e),
        headers: { event_version: '1' },
      })),
    });
  }
  async ping() {
    try {
      await this.ensure();
      return true;
    } catch {
      return false;
    }
  }
  async close() {
    if (this.connected) await this.producer.disconnect();
  }
}
type Db = Pick<
  LocationDatabase,
  | 'ping'
  | 'close'
  | 'device'
  | 'nearby'
  | 'history'
  | 'createGeofence'
  | 'geofences'
  | 'geofence'
  | 'deleteGeofence'
  | 'geofenceEvents'
>;
export function buildApp(
  deps: { producer?: EventProducer; db?: Db; redis?: Redis } = {},
) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    bodyLimit: 1024 * 1024,
    requestTimeout: 5000,
  });
  const producer = deps.producer ?? new KafkaEventProducer();
  const db = deps.db ?? new LocationDatabase();
  const redis =
    deps.redis ??
    new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
      lazyConnect: true,
      connectTimeout: 250,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
  const m = metrics('ingestion');
  void app.register(cors, {
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3100').split(','),
  });
  void app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  void app.register(swagger, {
    openapi: { info: { title: 'Real-time Location API', version: '0.1.0' } },
  });
  void app.register(swaggerUi, { routePrefix: '/docs' });
  const apiKey = process.env.API_KEY ?? 'local-demo-key';
  const auth = (request: any, reply: any, done: any) => {
    if (request.headers['x-api-key'] !== apiKey)
      return reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Valid x-api-key required' },
      });
    done();
  };
  app.get('/health', async (_q, r) => {
    const [database, broker] = await Promise.all([
      db.ping().catch(() => false),
      producer.ping(),
    ]);
    return r.code(database && broker ? 200 : 503).send({
      status: database && broker ? 'ok' : 'degraded',
      dependencies: { database, broker },
    });
  });
  app.get('/metrics', async (_q, r) =>
    r.type(m.registry.contentType).send(await m.registry.metrics()),
  );
  async function accept(events: LocationEvent[], requestId: string) {
    await producer.send(events);
    m.events.inc({ outcome: 'accepted' }, events.length);
    return { accepted: events.length, request_id: requestId };
  }
  app.post('/api/v1/location-events', { preHandler: auth }, async (req, r) =>
    r
      .code(202)
      .send(await accept([locationEventSchema.parse(req.body)], req.id)),
  );
  app.post(
    '/api/v1/location-events/batch',
    { preHandler: auth },
    async (req, r) => {
      const max = Number(process.env.MAX_EVENT_BATCH ?? 500);
      const events = z
        .array(locationEventSchema)
        .min(1)
        .max(max)
        .parse(req.body);
      return r.code(202).send(await accept(events, req.id));
    },
  );
  app.get('/api/v1/devices/nearby', async (req) => {
    const q = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lon: z.coerce.number().min(-180).max(180),
        radius_m: z.coerce.number().positive().max(100000).default(5000),
        limit: z.coerce.number().int().positive().max(2000).default(50),
      })
      .parse(req.query);
    return { data: await db.nearby(q.lat, q.lon, q.radius_m, q.limit) };
  });
  app.get('/api/v1/devices/:id', async (req, r) => {
    const { id } = z
      .object({ id: z.string().min(1).max(128) })
      .parse(req.params);
    let state: DeviceState | undefined;
    try {
      if (redis.status === 'wait') await redis.connect();
      const value = await redis.get(`device:${id}`);
      if (value) state = JSON.parse(value);
    } catch {
      // Redis is a disposable projection; PostgreSQL fallback follows.
    }
    if (!state) state = await db.device(id);
    return state
      ? { data: state }
      : r
          .code(404)
          .send({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
  });
  app.get('/api/v1/devices/:id/history', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z
      .object({
        limit: z.coerce.number().int().positive().max(200).default(50),
        cursor: z.string().optional(),
      })
      .parse(req.query);
    let cursor;
    try {
      cursor = decodeCursor(q.cursor);
    } catch {
      throw Object.assign(new Error('Invalid cursor'), {
        statusCode: 400,
        code: 'INVALID_CURSOR',
      });
    }
    const rows = await db.history(id, q.limit + 1, cursor);
    const page = rows.slice(0, q.limit);
    const last = page.at(-1);
    return {
      data: page,
      page: {
        hasMore: rows.length > q.limit,
        nextCursor:
          rows.length > q.limit && last
            ? encodeCursor({
                time: new Date(last.event_time).toISOString(),
                id: last.event_id,
              })
            : null,
      },
    };
  });
  app.post('/api/v1/geofences', { preHandler: auth }, async (req, r) => {
    const body = z
      .object({
        name: z.string().min(1).max(120),
        geometry: z.object({
          type: z.enum(['Polygon', 'MultiPolygon']),
          coordinates: z.array(z.unknown()),
        }),
      })
      .parse(req.body);
    return r
      .code(201)
      .send({ data: await db.createGeofence(body.name, body.geometry) });
  });
  app.get('/api/v1/geofences', async () => ({ data: await db.geofences() }));
  app.get('/api/v1/geofences/:id', async (req, r) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const x = await db.geofence(id);
    return x
      ? { data: x }
      : r.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Geofence not found' },
        });
  });
  app.delete('/api/v1/geofences/:id', { preHandler: auth }, async (req, r) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return (await db.deleteGeofence(id))
      ? r.code(204).send()
      : r.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Geofence not found' },
        });
  });
  app.get('/api/v1/geofence-events', async (req) => {
    const q = z
      .object({
        device_id: z.string().optional(),
        geofence_id: z.string().uuid().optional(),
        limit: z.coerce.number().int().positive().max(200).default(50),
      })
      .parse(req.query);
    return {
      data: await db.geofenceEvents({
        deviceId: q.device_id,
        geofenceId: q.geofence_id,
        limit: q.limit,
      }),
    };
  });
  app.setErrorHandler((e, req, r) => {
    if (e instanceof ZodError)
      return r.code(400).send({
        error: {
          code: 'INVALID_EVENT',
          message: e.issues.map((x) => x.message).join('; '),
        },
      });
    const status = (e as any).statusCode ?? 500;
    if (status === 500) req.log.error(e);
    return r.code(status).send({
      error: {
        code: (e as any).code ?? 'INTERNAL_ERROR',
        message:
          status === 500
            ? 'Internal server error'
            : String((e as Error).message),
      },
    });
  });
  app.addHook('onClose', async () => {
    await Promise.allSettled([producer.close(), db.close()]);
    redis.disconnect();
  });
  return app;
}
