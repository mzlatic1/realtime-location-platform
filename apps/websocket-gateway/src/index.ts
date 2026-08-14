import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { Redis } from 'ioredis';
import { metrics } from '@realtime/observability';
const app = Fastify({ logger: true });
const m = metrics('websocket');
const subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380');
type Client = { socket: any; devices: Set<string>; queued: number };
const clients = new Set<Client>();
const max = Number(process.env.WS_MAX_SUBSCRIPTIONS ?? 1000);
await app.register(websocket);
app.get('/metrics', async (_q, r) =>
  r.type(m.registry.contentType).send(await m.registry.metrics()),
);
app.get('/live', { websocket: true }, (socket) => {
  const client: Client = { socket, devices: new Set(), queued: 0 };
  clients.add(client);
  m.connections.inc();
  socket.on('message', (raw: any) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (
        msg.type !== 'subscribe' ||
        !Array.isArray(msg.device_ids) ||
        msg.device_ids.length > max
      )
        throw new Error();
      client.devices = new Set(msg.device_ids);
      socket.send(
        JSON.stringify({
          type: 'system_status',
          payload: { status: 'subscribed', count: client.devices.size },
        }),
      );
    } catch {
      socket.send(
        JSON.stringify({
          type: 'system_status',
          payload: { status: 'invalid_subscription' },
        }),
      );
    }
  });
  socket.on('close', () => {
    clients.delete(client);
    m.connections.dec();
  });
});
await subscriber.subscribe('live:updates');
subscriber.on('message', (_channel, value) => {
  let message: any;
  try {
    message = JSON.parse(value);
  } catch {
    return;
  }
  for (const client of clients) {
    if (client.socket.readyState !== 1) continue;
    const id = message.payload?.device_id;
    if (client.devices.size && id && !client.devices.has(id)) continue;
    if (client.socket.bufferedAmount > 1_000_000) {
      m.events.inc({ outcome: 'backpressured' });
      client.socket.close(1013, 'slow consumer');
      continue;
    }
    client.socket.send(value);
    m.events.inc({ outcome: 'sent' });
  }
});
const heartbeat = setInterval(() => {
  for (const c of clients) if (c.socket.readyState === 1) c.socket.ping();
}, 20_000);
app.addHook('onClose', async () => {
  clearInterval(heartbeat);
  subscriber.disconnect();
});
await app.listen({
  host: '0.0.0.0',
  port: Number(process.env.WEBSOCKET_PORT ?? 4101),
});
