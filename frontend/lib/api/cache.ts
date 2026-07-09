/**
 * Lightweight API cache — stale-while-revalidate + dedup + retry.
 *
 * Skipped:
 * - Full React Query (too heavy for this app scope)
 * - Complex cache invalidation (add when multi-user conflict arises)
 *
 * Usage: import { cachedGet } from './cache' instead of raw fetch.
 * ponytail: replace with TanStack Query when app grows >50 endpoints
 */

interface CacheEntry<T> {
  data: T;
  staleAt: number;
  expiresAt: number;
  promise?: Promise<T>;
}

const _store = new Map<string, CacheEntry<any>>();
const DEFAULT_STALE_MS = 30_000;
const DEFAULT_EXPIRE_MS = 120_000;

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = DEFAULT_STALE_MS,
  expireMs = DEFAULT_EXPIRE_MS,
): Promise<T> {
  const now = Date.now();
  const existing = _store.get(key);

  if (existing && now < existing.staleAt) {
    return existing.data;
  }

  if (existing && now < existing.expiresAt) {
    if (!existing.promise) {
      existing.promise = _refetch(key, fetcher, staleMs, expireMs);
    }
    return existing.data;
  }

  return _refetch(key, fetcher, staleMs, expireMs);
}

async function _refetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs: number,
  expireMs: number,
): Promise<T> {
  const now = Date.now();
  try {
    const data = await fetcher();
    _store.set(key, {
      data,
      staleAt: now + staleMs,
      expiresAt: now + expireMs,
    });
    return data;
  } catch (e) {
    const existing = _store.get(key);
    if (existing) return existing.data;
    throw e;
  }
}

export function invalidateCache(key?: string) {
  if (key) _store.delete(key);
  else _store.clear();
}
