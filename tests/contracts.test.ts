import { describe, it, expect } from 'vitest';
import {
  backoffMs,
  decodeCursor,
  encodeCursor,
  isNewer,
  locationEventSchema,
  transition,
} from '../packages/contracts/src/index.js';
const state = {
  device_id: 'd',
  last_event_id: '00000000-0000-4000-8000-000000000001',
  last_sequence_number: 10,
  last_event_time: '2026-08-13T00:00:00Z',
  latitude: 0,
  longitude: 0,
  updated_at: '',
};
describe('delivery semantics', () => {
  it('rejects invalid coordinates', () =>
    expect(locationEventSchema.safeParse({ latitude: 100 }).success).toBe(
      false,
    ));
  it('prevents state regression', () =>
    expect(
      isNewer(
        {
          sequence_number: 9,
          event_time: '2027-01-01T00:00:00Z',
          event_id: 'x',
        },
        state,
      ),
    ).toBe(false));
  it('uses deterministic tie breakers', () =>
    expect(
      isNewer(
        {
          sequence_number: 10,
          event_time: state.last_event_time,
          event_id: '00000000-0000-4000-8000-000000000002',
        },
        state,
      ),
    ).toBe(true));
  it('emits transitions only on changes', () => {
    expect(transition(undefined, true)).toBe('ENTER');
    expect(transition(true, true)).toBeUndefined();
    expect(transition(true, false)).toBe('EXIT');
  });
  it('round trips cursors', () =>
    expect(decodeCursor(encodeCursor({ time: 't', id: 'i' }))).toEqual({
      time: 't',
      id: 'i',
    }));
  it('bounds retry backoff', () => expect(backoffMs(99, 1)).toBe(12500));
});
