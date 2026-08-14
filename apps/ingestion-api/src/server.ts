import { buildApp } from './app.js';
const app = buildApp();
const stop = async () => {
  await app.close();
  process.exit(0);
};
process.once('SIGTERM', () => void stop());
process.once('SIGINT', () => void stop());
await app.listen({
  host: '0.0.0.0',
  port: Number(process.env.INGESTION_PORT ?? 4100),
});
