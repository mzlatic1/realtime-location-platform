import { randomUUID } from 'node:crypto';
import type { LocationEvent } from '@realtime/contracts';
export function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
export function generate(
  seed: number,
  device: number,
  sequence: number,
  now = '2026-08-13T19:00:00.000Z',
): LocationEvent {
  const random = rng(seed * 1000003 + device * 7919 + sequence);
  const angle = random() * Math.PI * 2;
  const radius = 0.01 * Math.sqrt(random());
  return {
    event_id: randomUUID(),
    event_version: 1,
    device_id: `device-${String(device).padStart(5, '0')}`,
    event_time: new Date(Date.parse(now) + sequence * 1000).toISOString(),
    received_time: new Date(
      Date.parse(now) + sequence * 1000 + 100,
    ).toISOString(),
    sequence_number: sequence,
    latitude: 33.77 + Math.sin(angle) * radius,
    longitude: -118.1937 + Math.cos(angle) * radius,
    accuracy_m: 5 + random() * 10,
    speed_mps: 2 + random() * 15,
    heading_deg: ((angle * 180) / Math.PI + 360) % 360,
    source: 'simulator',
    metadata: { seed },
  };
}
