/**
 * Perils, index types, metrics and data sources from docs/README.md and docs/02 §5.3 / §6.1.
 */

export const PERILS = ['DROUGHT', 'FLOOD'] as const;
export type Peril = (typeof PERILS)[number];

export const INDEX_TYPES = [
  'DROUGHT_RAIN_DEFICIT',
  'DROUGHT_SOIL_MOISTURE',
  'DROUGHT_NDVI',
  'FLOOD_EXCESS_RAIN',
  'FLOOD_SAR_EXTENT',
] as const;
export type IndexType = (typeof INDEX_TYPES)[number];

export const INDEX_TYPE_PERIL: Readonly<Record<IndexType, Peril>> = {
  DROUGHT_RAIN_DEFICIT: 'DROUGHT',
  DROUGHT_SOIL_MOISTURE: 'DROUGHT',
  DROUGHT_NDVI: 'DROUGHT',
  FLOOD_EXCESS_RAIN: 'FLOOD',
  FLOOD_SAR_EXTENT: 'FLOOD',
};

export const METRICS = ['RAIN_MM', 'SOIL_MOISTURE', 'NDVI', 'FLOOD_FRACTION'] as const;
export type Metric = (typeof METRICS)[number];

export const INDEX_TYPE_METRIC: Readonly<Record<IndexType, Metric>> = {
  DROUGHT_RAIN_DEFICIT: 'RAIN_MM',
  DROUGHT_SOIL_MOISTURE: 'SOIL_MOISTURE',
  DROUGHT_NDVI: 'NDVI',
  FLOOD_EXCESS_RAIN: 'RAIN_MM',
  FLOOD_SAR_EXTENT: 'FLOOD_FRACTION',
};

export const DATA_SOURCE_CODES = [
  'SIMULATOR',
  'IMERG_EARLY',
  'CHIRPS_PRELIM',
  'IMD',
  'SMAP_L4',
  'S2_NDVI',
  'S1_SAR',
] as const;
export type DataSourceCode = (typeof DATA_SOURCE_CODES)[number];

/** Canonical grid resolution in degrees (docs: 0.05° ≈ 5.5 km, CHIRPS-aligned). */
export const GRID_RESOLUTION_DEG = 0.05;

export function perilOf(indexType: IndexType): Peril {
  return INDEX_TYPE_PERIL[indexType];
}
