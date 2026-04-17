/**
 * Forward place search via Nominatim (same policy as reverseGeocode.service).
 */
const UA = 'VIBO-Backend/1.0 (local-events; contact: hello@vibo.in)';

export type PlaceSearchHit = {
  lat: number
  lon: number
  displayName: string
};

export async function searchPlaces(
  query: string,
  nearLat?: number | null,
  nearLon?: number | null
): Promise<PlaceSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '10');
  url.searchParams.set('addressdetails', '1');

  if (
    nearLat != null &&
    nearLon != null &&
    Number.isFinite(nearLat) &&
    Number.isFinite(nearLon)
  ) {
    const d = 0.45
    const minLon = nearLon - d
    const maxLon = nearLon + d
    const minLat = nearLat - d
    const maxLat = nearLat + d
    url.searchParams.set('viewbox', `${minLon},${maxLat},${maxLon},${minLat}`)
  }

  url.searchParams.set('countrycodes', 'in')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return []

  const rows = (await res.json()) as Array<{
    lat?: string
    lon?: string
    display_name?: string
  }>
  const out: PlaceSearchHit[] = []
  for (const r of rows) {
    const lat = r.lat != null ? Number(r.lat) : Number.NaN
    const lon = r.lon != null ? Number(r.lon) : Number.NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const displayName = typeof r.display_name === 'string' ? r.display_name.trim() : ''
    if (!displayName) continue
    out.push({ lat, lon, displayName })
  }
  return out
}
