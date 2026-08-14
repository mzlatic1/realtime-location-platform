import type { LocationEvent } from '@realtime/contracts';
import { toLocationEvent, type LaMetroVehicleMessage } from './adapter.js';

const sourceUrl =
  process.env.METRO_WS_URL ??
  'wss://api.metro.net/ws/LACMTA_Rail/vehicle_positions';
const ingestionUrl = process.env.INGESTION_URL ?? 'http://localhost:4100';
const apiKey = process.env.API_KEY ?? 'local-demo-key';
const flushIntervalMs = Number(process.env.SOURCE_FLUSH_INTERVAL_MS ?? 1000);
const maxBatch = Number(process.env.SOURCE_MAX_BATCH ?? 400);
const latest = new Map<string, LocationEvent>();
let stopped = false;
let reconnectAttempt = 0;
let received = 0;
let accepted = 0;
let rejected = 0;

function log(level: string, message: string, detail: object = {}) {
  console.log(
    JSON.stringify({
      level,
      service: 'la-metro-source',
      message,
      ...detail,
      timestamp: new Date().toISOString(),
    }),
  );
}

async function publish(events: LocationEvent[]) {
  const response = await fetch(`${ingestionUrl}/api/v1/location-events/batch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(events),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(`Ingestion returned HTTP ${response.status}`);
  accepted += events.length;
}

async function flush() {
  if (!latest.size) return;
  const events = [...latest.values()].slice(0, maxBatch);
  for (const event of events) latest.delete(event.device_id);
  try {
    await publish(events);
  } catch (error) {
    rejected += events.length;
    for (const event of events) {
      const queued = latest.get(event.device_id);
      if (!queued || queued.sequence_number < event.sequence_number)
        latest.set(event.device_id, event);
    }
    log('warn', 'batch publish failed; latest vehicle states requeued', {
      count: events.length,
      error: String(error),
    });
  }
}

function connect() {
  if (stopped) return;
  const socket = new WebSocket(sourceUrl);
  socket.addEventListener('open', () => {
    reconnectAttempt = 0;
    log('info', 'connected to official LA Metro vehicle-position feed', {
      sourceUrl,
    });
  });
  socket.addEventListener('message', (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as LaMetroVehicleMessage;
      const location = toLocationEvent(parsed);
      if (!location) return;
      received += 1;
      latest.set(location.device_id, location);
    } catch (error) {
      log('warn', 'ignored malformed provider message', {
        error: String(error),
      });
    }
  });
  socket.addEventListener('error', () =>
    log('warn', 'provider websocket error'),
  );
  socket.addEventListener('close', () => {
    if (stopped) return;
    const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt++);
    log('warn', 'provider websocket closed; reconnect scheduled', {
      delayMs: delay,
    });
    setTimeout(connect, delay);
  });
}

const flushTimer = setInterval(() => void flush(), flushIntervalMs);
const statsTimer = setInterval(
  () =>
    log('info', 'source statistics', {
      received,
      accepted,
      rejected,
      queuedVehicles: latest.size,
    }),
  30_000,
);
connect();

async function shutdown() {
  stopped = true;
  clearInterval(flushTimer);
  clearInterval(statsTimer);
  await flush();
  log('info', 'source stopped', { received, accepted, rejected });
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
