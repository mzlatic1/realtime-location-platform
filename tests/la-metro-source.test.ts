import { describe, expect, it } from 'vitest';
import {
  deterministicUuid,
  toLocationEvent,
} from '../apps/la-metro-source/src/adapter.js';

const actualShape = {
  id: '1042-1044-1210',
  vehicle: {
    position: { latitude: 34.020203, longitude: -118.27941 },
    timestamp: '1786677991',
    vehicle: { id: '1042-1044-1210', label: '1042-1044-1210' },
  },
  route_code: '',
};

describe('LA Metro source adapter', () => {
  it('normalizes the official vehicle-position message shape', () => {
    expect(
      toLocationEvent(actualShape, new Date('2026-08-14T03:27:00Z')),
    ).toMatchObject({
      device_id: 'la-metro:1042-1044-1210',
      sequence_number: 1786677991,
      latitude: 34.020203,
      longitude: -118.27941,
      source: 'la-metro-gtfs-realtime',
      received_time: '2026-08-14T03:27:00.000Z',
    });
  });

  it('creates stable valid UUIDs for provider redelivery', () => {
    const first = toLocationEvent(actualShape)?.event_id;
    const second = toLocationEvent(actualShape)?.event_id;
    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(deterministicUuid('x')).toBe(deterministicUuid('x'));
  });

  it('drops messages without stable ids, timestamps, or coordinates', () => {
    expect(toLocationEvent({ vehicle: {} })).toBeUndefined();
  });
});
