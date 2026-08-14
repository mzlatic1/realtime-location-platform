import { generate, rng } from './generator.js';
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((x, i, a) => (x.startsWith('--') ? [x.slice(2), a[i + 1]] : []))
    .filter((x) => x.length),
);
const devices = Number(args.devices ?? 100),
  hz = Number(args.hz ?? 0.2),
  seed = Number(args.seed ?? 42),
  duplicateRate = Number(args.duplicates ?? 0.01),
  lateRate = Number(args.late ?? 0.02),
  duration = Number(args.duration ?? 30),
  random = rng(seed);
const api = process.env.INGESTION_URL ?? 'http://localhost:4100';
let generated = 0,
  accepted = 0,
  rejected = 0,
  retries = 0;
const start = Date.now();
for (let tick = 0; Date.now() - start < duration * 1000; tick++) {
  const events = [];
  for (let d = 0; d < devices; d++) {
    let e = generate(seed, d, tick);
    if (random() < lateRate)
      e = {
        ...e,
        sequence_number: Math.max(0, tick - 2),
        event_time: new Date(Date.parse(e.event_time) - 2000).toISOString(),
      };
    events.push(e);
    if (random() < duplicateRate) events.push(e);
  }
  generated += events.length;
  try {
    const r = await fetch(`${api}/api/v1/location-events/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.API_KEY ?? 'local-demo-key',
      },
      body: JSON.stringify(events),
    });
    if (r.ok) accepted += events.length;
    else rejected += events.length;
  } catch {
    retries++;
  }
  await new Promise((r) => setTimeout(r, Math.max(1, 1000 / hz)));
}
console.log(
  JSON.stringify({
    events_generated: generated,
    accepted,
    rejected,
    retries,
    duration_seconds: (Date.now() - start) / 1000,
  }),
);
