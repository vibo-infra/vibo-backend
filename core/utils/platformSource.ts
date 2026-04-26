export type PlatformSource = 'ios' | 'android' | 'web';

const PLATFORM_SOURCES = new Set<PlatformSource>(['ios', 'android', 'web']);

export function normalizePlatformSource(raw: unknown, fallback: PlatformSource): PlatformSource {
  if (typeof raw !== 'string') return fallback;
  const value = raw.trim().toLowerCase();
  return PLATFORM_SOURCES.has(value as PlatformSource) ? (value as PlatformSource) : fallback;
}
