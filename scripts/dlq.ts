import { Kafka } from 'kafkajs';
import { DLQ_TOPIC, LOCATION_RAW_TOPIC } from '@realtime/contracts';
const action = process.argv[2],
  eventId = process.argv[process.argv.indexOf('--event-id') + 1];
const kafka = new Kafka({
  clientId: 'dlq-cli',
  brokers: (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(','),
});
const consumer = kafka.consumer({ groupId: `dlq-cli-${Date.now()}` }),
  producer = kafka.producer();
await consumer.connect();
await consumer.subscribe({ topic: DLQ_TOPIC, fromBeginning: true });
let found = false;
await consumer.run({
  eachMessage: async ({ message }) => {
    const item = JSON.parse(message.value?.toString() ?? '{}');
    if (action === 'list') console.log(JSON.stringify(item));
    if (action === 'replay' && item.original_payload?.event_id === eventId) {
      await producer.connect();
      await producer.send({
        topic: LOCATION_RAW_TOPIC,
        messages: [
          {
            key: item.original_payload.device_id,
            value: JSON.stringify(item.original_payload),
          },
        ],
      });
      found = true;
      await consumer.stop();
    }
  },
});
setTimeout(async () => {
  await consumer.disconnect();
  await producer.disconnect().catch(() => {});
  if (action === 'replay' && !found) console.error('event not found');
  process.exit(found || action === 'list' ? 0 : 1);
}, 2000);
