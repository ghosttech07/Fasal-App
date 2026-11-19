import { INDIA_STATES, districtCode } from '@fasalshield/shared/geo';

export type Place = { stateCode?: string; district?: string; village?: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/district|division/g, '')
    .replace(/[^a-z]/g, '');

// Old names some maps still use for renamed districts.
const RENAMED: Record<string, string> = {
  osmanabad: 'Dharashiv',
  aurangabad: 'Chhatrapati Sambhajinagar',
  ahmednagar: 'Ahilyanagar',
  gurgaon: 'Gurugram',
  allahabad: 'Prayagraj',
  faizabad: 'Ayodhya',
};

/**
 * Turns a GPS position into state, district and village using OpenStreetMap's free reverse geocoder.
 * Only called when the farmer taps "Use my location". Anything it cannot match is left for the farmer to pick.
 * shortcut: public Nominatim (1 request/second policy); move behind our API with caching before launch.
 */
export async function placeFromPosition(lat: number, lng: number): Promise<Place> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=en`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('lookup_failed');
  const a = ((await r.json()) as { address?: Record<string, string> }).address ?? {};

  const state = INDIA_STATES.find((s) => norm(s.name) === norm(a.state ?? ''));
  const rawDistrict = a.state_district ?? a.county ?? a.district ?? '';
  const wanted = RENAMED[norm(rawDistrict)] ?? rawDistrict;
  const district = state?.districts.find((d) => norm(d) === norm(wanted));
  const village = a.village ?? a.hamlet ?? a.town ?? a.suburb ?? a.city_district ?? a.city;

  return { stateCode: state?.code, district, village };
}

export { INDIA_STATES, districtCode };
