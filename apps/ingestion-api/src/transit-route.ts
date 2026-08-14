export type TransitRoute = {
  routeCode: string;
  directionId: number;
  directionLabel: string;
  destination: string;
  description: string;
  geometry: { type: 'LineString'; coordinates: number[][] };
};

type RouteOverview = {
  route_code?: string | number;
  terminal_1?: string;
  terminal_2?: string;
  description_0?: string;
  description_1?: string;
  travel_direction_0?: string;
  travel_direction_1?: string;
};

type RouteStop = {
  route_id?: string;
  day_type?: string;
  stop_id?: string | number;
  stop_sequence?: number;
  direction_id?: number;
  geometry?: { type?: string; coordinates?: unknown };
};

export interface TransitRouteService {
  route(routeCode: string, directionId: number): Promise<TransitRoute>;
}

function bestStopPattern(stops: RouteStop[], directionId: number) {
  const groups = new Map<string, RouteStop[]>();
  for (const stop of stops) {
    if (stop.direction_id !== directionId) continue;
    const key = `${stop.route_id ?? ''}:${stop.day_type ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), stop]);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
}

export function buildTransitRoute(
  routeCode: string,
  directionId: number,
  overviews: RouteOverview[],
  stops: RouteStop[],
): TransitRoute {
  const overview = overviews[0] ?? {};
  const pattern = bestStopPattern(stops, directionId).sort(
    (a, b) => (a.stop_sequence ?? 0) - (b.stop_sequence ?? 0),
  );
  const coordinates = pattern
    .map((stop) => stop.geometry?.coordinates)
    .filter(
      (coordinate): coordinate is number[] =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        coordinate.every((value) => Number.isFinite(value)),
    );
  if (coordinates.length < 2)
    throw new Error('LA Metro returned no usable route stop pattern');
  const forward = directionId === 0;
  return {
    routeCode,
    directionId,
    directionLabel:
      (forward ? overview.travel_direction_0 : overview.travel_direction_1) ??
      `Direction ${directionId}`,
    destination:
      (forward ? overview.terminal_2 : overview.terminal_1) ?? 'Terminus',
    description:
      (forward ? overview.description_0 : overview.description_1) ??
      `Metro line ${routeCode}`,
    geometry: { type: 'LineString', coordinates },
  };
}

export class LaMetroTransitRouteService implements TransitRouteService {
  private readonly cache = new Map<string, Promise<TransitRoute>>();

  constructor(
    private readonly baseUrl = process.env.METRO_API_URL ??
      'https://api.metro.net/LACMTA',
  ) {}

  route(routeCode: string, directionId: number) {
    const key = `${routeCode}:${directionId}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    const loaded = this.load(routeCode, directionId).catch((error) => {
      this.cache.delete(key);
      throw error;
    });
    this.cache.set(key, loaded);
    return loaded;
  }

  private async load(routeCode: string, directionId: number) {
    const encoded = encodeURIComponent(routeCode);
    const [overviewResponse, stopsResponse] = await Promise.all([
      fetch(`${this.baseUrl}/route_overview/${encoded}?geojson=true`, {
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(`${this.baseUrl}/route_stops/${encoded}?geojson=true`, {
        signal: AbortSignal.timeout(8_000),
      }),
    ]);
    if (!overviewResponse.ok || !stopsResponse.ok)
      throw new Error('LA Metro route API is unavailable');
    return buildTransitRoute(
      routeCode,
      directionId,
      (await overviewResponse.json()) as RouteOverview[],
      (await stopsResponse.json()) as RouteStop[],
    );
  }
}
