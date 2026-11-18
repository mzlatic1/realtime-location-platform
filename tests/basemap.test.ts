import { describe, expect, it } from 'vitest';
import {
  BASEMAP_ATTRIBUTION,
  cartoDarkMatterStyle,
  normalizeBasemapKey,
} from '../apps/web/app/basemap.js';

function tileUrls(apiKey?: string): string[] {
  const source = cartoDarkMatterStyle(apiKey).sources.carto;
  if (source?.type !== 'raster' || !('tiles' in source) || !source.tiles)
    throw new Error('expected a raster tile source');
  return source.tiles;
}

describe('CARTO basemap style', () => {
  it('appends the API key to the documented raster tile URL', () => {
    expect(tileUrls('demo-key')).toEqual([
      'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png?key=demo-key',
    ]);
  });

  it('keeps the tile template placeholders literal and URL-encodes the key', () => {
    const [url] = tileUrls('a b&c=d');
    expect(url).toContain('/{z}/{x}/{y}@2x.png');
    expect(url).toContain('?key=a%20b%26c%3Dd');
  });

  it('trims surrounding whitespace from the key', () => {
    expect(tileUrls('  demo-key \n')[0]).toMatch(/\?key=demo-key$/);
  });

  it('omits the key parameter when no key is configured', () => {
    for (const missing of [undefined, '', '   ']) {
      const [url] = tileUrls(missing);
      expect(url).not.toContain('key=');
      expect(url).not.toContain('?');
    }
  });

  it('reports a missing key as undefined so the UI can warn', () => {
    expect(normalizeBasemapKey(undefined)).toBeUndefined();
    expect(normalizeBasemapKey('  ')).toBeUndefined();
    expect(normalizeBasemapKey(' abc ')).toBe('abc');
  });

  it('renders 512px retina tiles with required OSM and CARTO attribution', () => {
    const style = cartoDarkMatterStyle('demo-key');
    const source = style.sources.carto;
    expect(source?.type === 'raster' && source.tileSize).toBe(512);
    expect(BASEMAP_ATTRIBUTION).toContain('OpenStreetMap contributors');
    expect(BASEMAP_ATTRIBUTION).toContain('CARTO');
    expect(style.layers).toEqual([
      { id: 'carto-dark-matter', type: 'raster', source: 'carto' },
    ]);
  });
});
