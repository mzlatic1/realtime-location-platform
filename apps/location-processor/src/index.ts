import { Kafka } from 'kafkajs';
import { Redis } from 'ioredis';
import {
  DLQ_TOPIC,
  GEOFENCE_TOPIC,
  isRetryable,
  LOCATION_PROCESSED_TOPIC,
  LOCATION_RAW_TOPIC,
  locationEventSchema,
} from '@realtime/contracts';
import { LocationDatabase } from '@realtime/db';
import { metrics } from '@realtime/observability';
const kafka = new Kafka({
  clientId: 'location-processor',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(','),
});
const consumer = kafka.consumer({
  groupId: 'location-processors',
  maxBytesPerPartition: 1024 * 1024,
});
const producer = kafka.producer();
const db = new LocationDatabase();
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
  lazyConnect: true,
  connectTimeout: 250,
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
});
const m = metrics('processor');
await Promise.all([consumer.connect(), producer.connect()]);
await consumer.subscribe({ topic: LOCATION_RAW_TOPIC, fromBeginning: false });
await consumer.run({
  autoCommit: false,
  partitionsConsumedConcurrently: Number(
    process.env.PROCESSOR_CONCURRENCY ?? 8,
  ),
  eachMessage: async ({ topic, partition, message, heartbeat }) => {
    const timer = m.latency.startTimer({ operation: 'process' });
    let payload: unknown;
    try {
      payload = JSON.parse(message.value?.toString() ?? '');
      const event = locationEventSchema.parse(payload);
      const result = await db.process(event);
      m.events.inc({
        outcome: result.duplicate
          ? 'duplicate'
          : result.stale
            ? 'stale'
            : 'processed',
      });
      if (result.state) {
        try {
          if (redis.status === 'wait') await redis.connect();
          await redis.set(
            `device:${event.device_id}`,
            JSON.stringify(result.state),
            'EX',
            300,
          );
          await redis.publish(
            'live:updates',
            JSON.stringify({
              type: 'device_state_updated',
              payload: result.state,
            }),
          );
        } catch (error) {
          console.warn(
            JSON.stringify({
              service: 'processor',
              event_id: event.event_id,
              error: String(error),
              message: 'Redis unavailable; durable processing continued',
            }),
          );
        }
        await producer.send({
          topic: LOCATION_PROCESSED_TOPIC,
          messages: [
            { key: event.device_id, value: JSON.stringify(result.state) },
          ],
        });
      }
      if (result.transitions.length)
        await producer.send({
          topic: GEOFENCE_TOPIC,
          messages: result.transitions.map((x) => ({
            key: event.device_id,
            value: JSON.stringify(x),
          })),
        });
      await consumer.commitOffsets([
        { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
      ]);
      await heartbeat();
    } catch (error) {
      m.events.inc({ outcome: 'failed' });
      const retryable = isRetryable(error);
      await producer.send({
        topic: DLQ_TOPIC,
        messages: [
          {
            key: message.key,
            value: JSON.stringify({
              original_payload: payload,
              error_code: retryable ? 'RETRIES_EXHAUSTED' : 'INVALID_MESSAGE',
              error_message: String(error),
              attempt_count: retryable ? 3 : 1,
              failed_at: new Date().toISOString(),
              source_topic: topic,
              partition,
              offset: message.offset,
            }),
          },
        ],
      });
      await consumer.commitOffsets([
        { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
      ]);
    } finally {
      timer();
    }
  },
});
const shutdown = async () => {
  await consumer.stop();
  await Promise.allSettled([
    consumer.disconnect(),
    producer.disconnect(),
    db.close(),
  ]);
  redis.disconnect();
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
