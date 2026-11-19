import { GRID_RESOLUTION_DEG } from '@fasalshield/shared';

/**
 * Canonical 0.05° grid (docs §5.2). Cell id = row * 10000 + col, rows from -90°, cols from -180°.
 * Pure math gives the same answer as ST_Contains(grid_cell.geom, point) on a regular grid.
 */
export function cellFor(lat: number, lng: number) {
  // Rounding guard: 18.40/0.05 must be row 2168, not 2167.9999.
  const row = Math.floor(Number(((lat + 90) / GRID_RESOLUTION_DEG).toFixed(9)));
  const col = Math.floor(Number(((lng + 180) / GRID_RESOLUTION_DEG).toFixed(9)));
  return {
    id: row * 10_000 + col,
    minLat: row * GRID_RESOLUTION_DEG - 90,
    minLng: col * GRID_RESOLUTION_DEG - 180,
  };
}
