import { getConfigValueByKey } from './appConfig.repository';

export type OnboardingCity = {
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  country: string;
};

/** Used when DB row missing or JSON invalid — keep in sync with migration seed. */
export const DEFAULT_ONBOARDING_CITIES: OnboardingCity[] = [
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, state: 'Maharashtra', country: 'India' },
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209, state: 'Delhi', country: 'India' },
  { name: 'Pune', latitude: 18.5204, longitude: 73.8567, state: 'Maharashtra', country: 'India' },
  { name: 'Bangalore', latitude: 12.9716, longitude: 77.5946, state: 'Karnataka', country: 'India' },
  { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867, state: 'Telangana', country: 'India' },
  { name: 'Chennai', latitude: 13.0827, longitude: 80.2707, state: 'Tamil Nadu', country: 'India' },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, state: 'West Bengal', country: 'India' },
  { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, state: 'Gujarat', country: 'India' },
  { name: 'Noida', latitude: 28.5355, longitude: 77.391, state: 'Uttar Pradesh', country: 'India' },
  { name: 'Goa', latitude: 15.2993, longitude: 74.124, state: 'Goa', country: 'India' },
];

const CACHE_TTL_MS = 60_000;
let cache: { list: OnboardingCity[]; loadedAt: number } | null = null;

function parseCitiesFromConfig(raw: unknown): OnboardingCity[] | null {
  if (raw === null || raw === undefined) return null;
  const root = raw as Record<string, unknown>;
  const arr = Array.isArray(root.cities)
    ? root.cities
    : Array.isArray(raw)
      ? (raw as unknown[])
      : null;
  if (!arr?.length) return null;

  const out: OnboardingCity[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      name,
      latitude: lat,
      longitude: lng,
      state: typeof row.state === 'string' ? row.state : '',
      country: typeof row.country === 'string' ? row.country : 'India',
    });
  }
  return out.length ? out : null;
}

export const getOnboardingCities = async (): Promise<OnboardingCity[]> => {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.list;
  }

  const value = await getConfigValueByKey('onboarding_cities');
  const parsed = parseCitiesFromConfig(value);
  const list = parsed ?? DEFAULT_ONBOARDING_CITIES;
  cache = { list, loadedAt: now };
  return list;
};

export const getOnboardingCitiesPayload = async (): Promise<{ cities: OnboardingCity[] }> => ({
  cities: await getOnboardingCities(),
});

export const assertAllowedDefaultCity = async (cityInput: string): Promise<void> => {
  const t = String(cityInput ?? '').trim();
  if (!t) throw new Error('DEFAULT_CITY_REQUIRED');
  const list = await getOnboardingCities();
  const ok = list.some((c) => c.name.toLowerCase() === t.toLowerCase());
  if (!ok) throw new Error('INVALID_DEFAULT_CITY');
};
