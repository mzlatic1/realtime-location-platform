import { z } from 'zod';

export const LOCATION_RAW_TOPIC = 'location.raw';
export const LOCATION_PROCESSED_TOPIC = 'location.processed';
export const GEOFENCE_TOPIC = 'geofence.events';
export const DLQ_TOPIC = 'location.dlq';
export const locationEventSchema = z.object({
  event_id: z.string().uuid(),
  event_version: z.literal(1),
  device_id: z.string().trim().min(1).max(128),
  event_time: z.string().datetime({ offset: true }),
  received_time: z.string().datetime({ offset: true }),
  sequence_number: z.number().int().nonnegative(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_m: z.number().nonnegative().max(10000).optional(),
  speed_mps: z.number().nonnegative().max(500).optional(),
  heading_deg: z.number().min(0).lt(360).optional(),
  source: z.string().trim().min(1).max(80),
  metadata: z.record(z.unknown()).default({}),
});
export type LocationEvent = z.infer<typeof locationEventSchema>;
export type DeviceState = {
  device_id: string;
  last_event_id: string;
  last_sequence_number: number;
  last_event_time: string;
  latitude: number;
  longitude: number;
  speed_mps?: number;
  heading_deg?: number;
  updated_at: string;
};
export type GeofenceTransition = 'ENTER' | 'EXIT';
export type LiveMessage = {
  type:
    | 'device_state_updated'
    | 'geofence_enter'
    | 'geofence_exit'
    | 'system_status';
  payload: unknown;
};

export function isNewer(
  incoming: Pick<LocationEvent, 'sequence_number' | 'event_time' | 'event_id'>,
  current:
    | Pick<
        DeviceState,
        'last_sequence_number' | 'last_event_time' | 'last_event_id'
      >
    | undefined,
): boolean {
  if (!current) return true;
  if (incoming.sequence_number !== current.last_sequence_number)
    return incoming.sequence_number > current.last_sequence_number;
  const time = incoming.event_time.localeCompare(current.last_event_time);
  return time !== 0 ? time > 0 : incoming.event_id > current.last_event_id;
}
export function transition(
  previous: boolean | undefined,
  inside: boolean,
): GeofenceTransition | undefined {
  if (previous === undefined) return inside ? 'ENTER' : undefined;
  if (previous === inside) return undefined;
  return inside ? 'ENTER' : 'EXIT';
}
export function encodeCursor(value: { time: string; id: string }) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
export function decodeCursor(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString()) as {
      time: string;
      id: string;
    };
    if (!parsed.time || !parsed.id) throw new Error();
    return parsed;
  } catch {
    throw new Error('Invalid cursor');
  }
}
export function isRetryable(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', '57P01', '40001'].includes(
    code ?? '',
  );
}
export function backoffMs(attempt: number, random = 0.5) {
  const base = Math.min(10_000, 100 * 2 ** attempt);
  return Math.round(base * (0.75 + random * 0.5));
}
