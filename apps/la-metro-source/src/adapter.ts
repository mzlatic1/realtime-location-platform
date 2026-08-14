import { createHash } from 'node:crypto';
import type { LocationEvent } from '@realtime/contracts';

export type LaMetroVehicleMessage = {
  id?: string;
  route_code?: string;
  vehicle?: {
    position?: {
      latitude?: number;
      longitude?: number;
      bearing?: number;
      speed?: number;
    };
    timestamp?: string | number;
    trip?: { trip_id?: string; route_id?: string };
    vehicle?: { id?: string; label?: string };
  };
};

export function deterministicUuid(value: string) {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function toLocationEvent(
  message: LaMetroVehicleMessage,
  receivedAt = new Date(),
): LocationEvent | undefined {
  const vehicle = message.vehicle;
  const position = vehicle?.position;
  const providerId = vehicle?.vehicle?.id || message.id;
  const latitude = position?.latitude;
  const longitude = position?.longitude;
  const timestamp = Number(vehicle?.timestamp);
  if (
    !providerId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  )
    return undefined;

  const deviceId = `la-metro:${providerId}`;
  const eventTime = new Date(timestamp * 1000).toISOString();
  const identity = [
    deviceId,
    timestamp,
    latitude,
    longitude,
    position?.bearing ?? '',
  ].join('|');
  return {
    event_id: deterministicUuid(identity),
    event_version: 1,
    device_id: deviceId,
    event_time: eventTime,
    received_time: receivedAt.toISOString(),
    sequence_number: Math.trunc(timestamp),
    latitude: latitude!,
    longitude: longitude!,
    speed_mps:
      position?.speed !== undefined && position.speed >= 0
        ? position.speed
        : undefined,
    heading_deg:
      position?.bearing !== undefined &&
      position.bearing >= 0 &&
      position.bearing < 360
        ? position.bearing
        : undefined,
    source: 'la-metro-gtfs-realtime',
    metadata: {
      agency: 'Los Angeles County Metropolitan Transportation Authority',
      agency_id: 'LACMTA_Rail',
      provider_vehicle_id: providerId,
      vehicle_label: vehicle?.vehicle?.label,
      route_code: message.route_code || vehicle?.trip?.route_id,
      trip_id: vehicle?.trip?.trip_id,
      provider: 'api.metro.net',
    },
  };
}
