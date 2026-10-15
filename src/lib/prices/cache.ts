/**
 * Tiny in-memory TTL cache. Per serverless instance, which is fine: it only
 * exists to stop a burst of page views from hammering the public price APIs.
 */
const store = new Map<string, { value: unknown; expiresAt: number }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await load();
  store.set(key, { value, expiresAt: now + ttlMs });
  if (store.size > 2000) {
    for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);
  }
  return value;
}

/** Read without loading. */
export function peek<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  return undefined;
}

/** Store a value fetched elsewhere (e.g. from a batched request). */
export function prime<T>(key: string, ttlMs: number, value: T) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearPriceCache() {
  store.clear();
}
