import { describe, expect, it } from 'vitest';
import { buildTransitRoute } from '../apps/ingestion-api/src/transit-route.js';

describe('LA Metro route detail', () => {
  it('builds an ordered directional line and destination label', () => {
    const route = buildTransitRoute(
      '40',
      0,
      [
        {
          terminal_1: 'South Bay',
          terminal_2: 'Downtown LA',
          description_0: 'South Bay to Downtown LA',
          travel_direction_0: 'Northbound',
        },
      ],
      [
        {
          route_id: '40-a',
          day_type: 'weekday',
          direction_id: 0,
          stop_sequence: 2,
          geometry: { type: 'Point', coordinates: [-118.2, 34.1] },
        },
        {
          route_id: '40-a',
          day_type: 'weekday',
          direction_id: 0,
          stop_sequence: 1,
          geometry: { type: 'Point', coordinates: [-118.3, 34.0] },
        },
      ],
    );
    expect(route).toMatchObject({
      directionLabel: 'Northbound',
      destination: 'Downtown LA',
      geometry: {
        coordinates: [
          [-118.3, 34.0],
          [-118.2, 34.1],
        ],
      },
    });
  });
});
