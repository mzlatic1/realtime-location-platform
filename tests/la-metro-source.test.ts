import { describe, expect, it } from 'vitest';
import {
  deterministicUuid,
  toLocationEvent,
} from '../apps/la-metro-source/src/adapter.js';

const actualShape = {
  id: '5819',
  vehicle: {
    trip: {
      tripId: '10040009472121-JUNE26',
      routeId: '40-13201',
    },
    position: { latitude: 34.057503, longitude: -118.23064 },
    timestamp: '1786677991',
    vehicle: { id: '5819', label: '5819' },
  },
  route_code: '40',
};

describe('LA Metro source adapter', () => {
  it('normalizes the official vehicle-position message shape', () => {
    expect(
      toLocationEvent(actualShape, new Date('2026-08-14T03:27:00Z')),
    ).toMatchObject({
      device_id: 'la-metro-bus:5819',
      sequence_number: 1786677991,
      latitude: 34.057503,
      longitude: -118.23064,
      source: 'la-metro-bus-gtfs-realtime',
      received_time: '2026-08-14T03:27:00.000Z',
      metadata: {
        agency_id: 'LACMTA',
        route_code: '40',
        route_id: '40-13201',
        trip_id: '10040009472121-JUNE26',
      },
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
