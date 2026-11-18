import type { StyleSpecification } from 'maplibre-gl';

/** Required by OpenStreetMap's ODbL and CARTO's basemap terms on every map. */
export const BASEMAP_ATTRIBUTION =
  '&copy; OpenStreetMap contributors &copy; CARTO';

// Documented CARTO raster form (docs.carto.com/faqs/carto-basemaps). `{z}/{x}/{y}` are
// MapLibre template tokens and must stay literal; only the key query is appended.
const CARTO_DARK_MATTER_TILES =
  'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png';

/** Returns the trimmed key, or undefined when none is configured. */
export function normalizeBasemapKey(rawKey?: string): string | undefined {
  const key = rawKey?.trim();
  return key ? key : undefined;
}

/**
 * Dark Matter raster basemap. CARTO has required a free key since 2026-09-25; the key is
 * a browser-visible usage identifier, not a secret. Without one CARTO serves gray
 * "API KEY REQUIRED" placeholder tiles (still HTTP 200), so callers should warn.
 */
export function cartoDarkMatterStyle(rawKey?: string): StyleSpecification {
  const key = normalizeBasemapKey(rawKey);
  const tile = key
    ? `${CARTO_DARK_MATTER_TILES}?key=${encodeURIComponent(key)}`
    : CARTO_DARK_MATTER_TILES;
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [tile],
        tileSize: 512,
        attribution: BASEMAP_ATTRIBUTION,
      },
    },
    layers: [{ id: 'carto-dark-matter', type: 'raster', source: 'carto' }],
  };
}
