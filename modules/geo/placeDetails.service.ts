/**
 * Full reverse geocode for storing event location (Nominatim).
 */
const UA = 'VIBO-Backend/1.0 (local-events; contact: hello@vibo.in)';

export type PlaceDetailsResult = {
  latitude: number
  longitude: number
  /** Full line for maps / attendees */
  displayName: string
  /** Stored as location.address */
  addressLine: string
  placeName: string
  city: string
  state: string
  country: string
  postcode: string
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function pickCity(addr: Record<string, unknown>): string {
  const keys = ['city', 'town', 'municipality', 'village', 'county', 'state_district'] as const
  for (const k of keys) {
    const s = str(addr[k])
    if (s) return s
  }
  return ''
}

function buildPlaceName(addr: Record<string, unknown>, fallback: string): string {
  const road = str(addr.road)
  const house = str(addr.house_number)
  const suburb = str(addr.suburb || addr.neighbourhood || addr.quarter)
  const line = [house && road ? `${house} ${road}` : road || house, suburb].filter(Boolean).join(', ')
  return line || fallback.slice(0, 120)
}

export async function reverseGeocodePlaceDetails(
  lat: number,
  lng: number
): Promise<PlaceDetailsResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    display_name?: string
    address?: Record<string, unknown>
  }
  const displayName = str(data.display_name)
  if (!displayName) return null

  const addr = data.address ?? {}
  const city = pickCity(addr)
  const state = str(addr.state)
  const code = str(addr.country_code).toLowerCase()
  const country = str(addr.country) || (code === 'in' ? 'India' : code ? code.toUpperCase() : 'India')
  const postcode = str(addr.postcode)
  const placeName = buildPlaceName(addr, displayName.split(',')[0] || 'Venue')

  return {
    latitude: lat,
    longitude: lng,
    displayName,
    addressLine: displayName,
    placeName,
    city: city || 'Unknown',
    state: state || country || 'Unknown',
    country: country || 'IN',
    postcode,
  }
}
