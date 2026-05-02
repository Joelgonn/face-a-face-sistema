import { hasRouteCache, precacheRoute } from '@/app/lib/offlineRepository';

export const DEFAULT_FETCH_TIMEOUT_MS = 5000;
export const MAX_PREFETCH_ITEMS = 15;
export const BATCH_SIZE = 3;

export function toAbsoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).href;
}

export function getAdaptiveTimeout(): number {
  return DEFAULT_FETCH_TIMEOUT_MS;
}

export async function isUrlCached(url: string): Promise<boolean> {
  return hasRouteCache(url);
}

export async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    return await fetch(toAbsoluteUrl(url), {
      credentials: 'same-origin',
      headers: {
        'X-Precache': 'true',
      },
    });
  } catch {
    return null;
  }
}

export async function safeFetchForCache(url: string): Promise<boolean> {
  return precacheRoute(url);
}
