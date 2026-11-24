import { fromUrl } from 'geotiff';
import { logger } from '../lib/logger';

/**
 * Real rainfall from two free, open sources (no keys):
 *  - CHIRPS v3 daily final (UC Santa Barbara): 0.05° grid, the same grid as our cells, published ~3-4 weeks
 *    after the day. Read straight from the cloud-optimised GeoTIFF with HTTP range requests (one pixel per cell).
 *  - NASA POWER daily (PRECTOTCORR): ~0.5° grid, 2-3 days behind. Fills the weeks CHIRPS has not published yet.
 * CHIRPS rows carry a higher sourceVersion, so once a day is published it replaces the NASA value for triggers.
 */
export const CHIRPS = { code: 'CHIRPS_V3', version: 2 } as const;
export const POWER = { code: 'NASA_POWER', version: 1 } as const;

export type CellRef = { id: number; minLat: number; minLng: number };
export type RainRow = { gridCellId: number; date: string; mm: number };

const CELL = 0.05;
const chirpsUrl = (date: string) => {
  const [y, m, d] = date.split('-');
  return `https://data.chc.ucsb.edu/products/CHIRPS/v3.0/daily/final/rnl/cogs/${y}/chirps-v3.0.rnl.${y}.${m}.${d}.cog`;
};

/** One day of CHIRPS for the given cells; null when that day's file is not published yet. */
export async function chirpsDay(date: string, cells: CellRef[]): Promise<RainRow[] | null> {
  const url = chirpsUrl(date);
  const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
  if (head.status === 404) return null;
  if (!head.ok) throw new Error(`CHIRPS ${date}: HTTP ${head.status}`);
  const img = await (await fromUrl(url)).getImage();
  const [ox, oy] = img.getOrigin() as [number, number];
  const [rx, ry] = img.getResolution() as [number, number];
  const rows: RainRow[] = [];
  for (const c of cells) {
    const x = Math.floor((c.minLng + CELL / 2 - ox) / rx);
    const y = Math.floor((c.minLat + CELL / 2 - oy) / ry);
    if (x < 0 || y < 0 || x >= img.getWidth() || y >= img.getHeight()) continue; // outside CHIRPS (±60° lat)
    const r = await img.readRasters({ window: [x, y, x + 1, y + 1] });
    const mm = Number((r[0] as ArrayLike<number>)[0]);
    if (Number.isFinite(mm) && mm >= 0) rows.push({ gridCellId: c.id, date, mm: Math.round(mm * 10) / 10 });
  }
  return rows;
}

/** NASA POWER daily rain for one cell over a date range; days not yet available (-999) are left out. */
export async function powerRange(cell: CellRef, from: string, to: string): Promise<RainRow[]> {
  const q = new URLSearchParams({
    parameters: 'PRECTOTCORR',
    community: 'AG',
    latitude: (cell.minLat + CELL / 2).toFixed(4),
    longitude: (cell.minLng + CELL / 2).toFixed(4),
    start: from.replaceAll('-', ''),
    end: to.replaceAll('-', ''),
    format: 'JSON',
  });
  const r = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${q}`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`NASA POWER cell ${cell.id}: HTTP ${r.status}`);
  const body = (await r.json()) as { properties?: { parameter?: { PRECTOTCORR?: Record<string, number> } } };
  const values = body.properties?.parameter?.PRECTOTCORR ?? {};
  return Object.entries(values)
    .filter(([, mm]) => Number.isFinite(mm) && mm >= 0)
    .map(([d, mm]) => ({ gridCellId: cell.id, date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, mm: Math.round(mm * 10) / 10 }));
}

/** Runs tasks a few at a time; a failed task is logged and skipped so one bad day never blocks the rest. */
export async function pool<T, R>(items: T[], limit: number, run: (t: T) => Promise<R>): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          out[i] = await run(items[i]!);
        } catch (err) {
          logger.warn({ err: (err as Error).message }, 'rain fetch failed');
        }
      }
    }),
  );
  return out;
}
