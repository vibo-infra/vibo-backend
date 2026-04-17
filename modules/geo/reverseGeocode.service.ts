/**
 * Server-side reverse geocode (keeps keys off the client; respect OSM usage policy).
 * https://operations.osmfoundation.org/policies/nominatim/
 */
const UA = 'VIBO-Backend/1.0 (local-events; contact: hello@vibo.in)';

export type ReverseGeocodeResult = {
  /** Neighbourhood / suburb / village when available */
  locality: string | null;
  /** City / town */
  city: string | null;
  /** Single line for UI: "Bandra · Mumbai" */
  label: string;
};

function pickLocality(addr: Record<string, unknown>): string | null {
  const keys = [
    'neighbourhood',
    'suburb',
    'quarter',
    'hamlet',
    'village',
    'town',
    'city_district',
  ] as const;
  for (const k of keys) {
    const v = addr[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function pickCity(addr: Record<string, unknown>): string | null {
  const keys = ['city', 'town', 'municipality', 'county', 'state_district'] as const;
  for (const k of keys) {
    const v = addr[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '14');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { address?: Record<string, unknown> };
  const addr = data.address ?? {};
  const locality = pickLocality(addr);
  const city = pickCity(addr);
  const label =
    locality && city && locality.toLowerCase() !== city.toLowerCase()
      ? `${locality} · ${city}`
      : city || locality || 'Near you';
  return { locality, city, label };
}
