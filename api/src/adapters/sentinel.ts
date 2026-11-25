import type * as GeoTiff from 'geotiff';

/**
 * Satellite crop check (free, no key): Sentinel-2 L2A cloud-optimised GeoTIFFs on AWS, found through the
 * Earth Search STAC catalogue. For a field pin we read a 3×3 patch (30 m × 30 m) of red, near-infrared and the
 * scene classification on recent low-cloud scenes, drop cloud/shadow pixels, and compute NDVI
 * = (NIR − red) / (NIR + red). The greenest recent value says whether a crop is growing there.
 */
// geotiff is ESM-only; load it lazily with a native import (the Vercel build is CommonJS).
const loadGeoTiff = new Function('m', 'return import(m)') as (m: string) => Promise<typeof GeoTiff>;

const STAC = 'https://earth-search.aws.element84.com/v1/search';
// Scene classification values that are not ground we can trust: no data, saturated, cloud shadow, clouds, cirrus, snow.
const BAD_SCL = new Set([0, 1, 3, 8, 9, 10, 11]);

export type CropCheck = { status: 'GREEN' | 'SPARSE' | 'BARE' | 'UNKNOWN'; ndvi: number | null; sceneAt: string | null; scenes: number };

/** WGS84 lat/lng → UTM easting/northing for a given zone (standard series, accurate to centimetres). */
export function toUtm(lat: number, lng: number, zone: number, south: boolean) {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const φ = (lat * Math.PI) / 180, λ = (lng * Math.PI) / 180, λ0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const T = Math.tan(φ) ** 2, C = ep2 * Math.cos(φ) ** 2, A = Math.cos(φ) * (λ - λ0);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * φ -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * φ) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * φ) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * φ));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  let y =
    k0 *
    (M + N * Math.tan(φ) * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (south) y += 10000000;
  return { x, y };
}

export const statusFor = (ndvi: number | null): CropCheck['status'] =>
  ndvi === null ? 'UNKNOWN' : ndvi >= 0.4 ? 'GREEN' : ndvi >= 0.2 ? 'SPARSE' : 'BARE';

type Asset = { href: string; 'raster:bands'?: { scale?: number; offset?: number }[] };
type Item = { properties: { datetime: string; 'proj:epsg'?: number; 'proj:code'?: string }; assets: Record<string, Asset> };

async function patch(url: string, x: number, y: number) {
  const { fromUrl } = await loadGeoTiff('geotiff');
  const img = await (await fromUrl(url)).getImage();
  const [ox, oy] = img.getOrigin() as [number, number];
  const [rx, ry] = img.getResolution() as [number, number];
  const px = Math.floor((x - ox) / rx), py = Math.floor((y - oy) / ry);
  if (px < 1 || py < 1 || px >= img.getWidth() - 1 || py >= img.getHeight() - 1) return null;
  const r = await img.readRasters({ window: [px - 1, py - 1, px + 2, py + 2] });
  return Array.from(r[0] as ArrayLike<number>);
}

/** Crop check at a point over the last `days` days: the newest clear scene (up to 3 tried, newest first). */
export async function cropCheck(lat: number, lng: number, days = 45): Promise<CropCheck> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const r = await fetch(STAC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      intersects: { type: 'Point', coordinates: [lng, lat] },
      datetime: `${from.toISOString()}/${to.toISOString()}`,
      query: { 'eo:cloud_cover': { lt: 40 } },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
      limit: 3,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`Sentinel-2 search: HTTP ${r.status}`);
  const items = ((await r.json()) as { features?: Item[] }).features ?? [];
  let best: { ndvi: number; at: string } | null = null;
  for (const it of items) {
    const epsg = it.properties['proj:epsg'] ?? Number(it.properties['proj:code']?.split(':')[1]);
    if (!epsg || !it.assets.red || !it.assets.nir || !it.assets.scl) continue;
    const zone = epsg % 100, south = Math.floor(epsg / 100) === 327;
    const { x, y } = toUtm(lat, lng, zone, south);
    // All three bands at once; SCL is 20 m, so its centre pixel tells cloud from ground.
    const [red, nir, scl] = await Promise.all([
      patch(it.assets.red.href, x, y),
      patch(it.assets.nir.href, x, y),
      patch(it.assets.scl.href, x, y),
    ]);
    if (!red || !nir || !scl || BAD_SCL.has(scl[4]!)) continue;
    const band = (a: Asset) => ({ s: a['raster:bands']?.[0]?.scale ?? 0.0001, o: a['raster:bands']?.[0]?.offset ?? 0 });
    const R = band(it.assets.red), N = band(it.assets.nir);
    const vals = red
      .map((v, i) => {
        const re = v * R.s + R.o, ni = nir[i]! * N.s + N.o;
        return re + ni > 0 && v > 0 ? (ni - re) / (ni + re) : null;
      })
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (!vals.length) continue;
    const ndvi = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
    best = { ndvi, at: it.properties.datetime };
    break; // the newest clear scene is enough; older scenes are only tried when it is cloudy
  }
  return { status: statusFor(best?.ndvi ?? null), ndvi: best?.ndvi ?? null, sceneAt: best?.at ?? null, scenes: items.length };
}
