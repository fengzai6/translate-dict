export interface CacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
}

interface CacheEntry<V> {
  value: V;
  expiresAt?: number;
}

/**
 * 创建带可选 TTL 和容量上限的 LRU 缓存
 */
export function createCache<K, V>(options: CacheOptions = {}): Cache<K, V> {
  const { ttlMs, maxEntries } = options;
  const entries = new Map<K, V>();

  if (ttlMs === undefined && maxEntries === undefined) {
    return entries;
  }

  const cacheEntries = new Map<K, CacheEntry<V>>();

  const isExpired = (entry: CacheEntry<V>): boolean =>
    entry.expiresAt !== undefined && entry.expiresAt <= Date.now();

  const removeExpired = (key: K, entry: CacheEntry<V>): boolean => {
    if (!isExpired(entry)) {
      return false;
    }

    cacheEntries.delete(key);
    return true;
  };

  return {
    get(key: K): V | undefined {
      const entry = cacheEntries.get(key);
      if (!entry || removeExpired(key, entry)) {
        return undefined;
      }

      if (maxEntries !== undefined) {
        cacheEntries.delete(key);
        cacheEntries.set(key, entry);
      }
      return entry.value;
    },

    set(key: K, value: V): void {
      if (maxEntries !== undefined) {
        if (cacheEntries.has(key)) {
          cacheEntries.delete(key);
        } else if (cacheEntries.size >= maxEntries) {
          const oldestKey = cacheEntries.keys().next().value;
          if (oldestKey !== undefined) {
            cacheEntries.delete(oldestKey);
          }
        }
      } else if (cacheEntries.has(key)) {
        cacheEntries.delete(key);
      }

      cacheEntries.set(key, {
        value,
        expiresAt: ttlMs === undefined ? undefined : Date.now() + ttlMs,
      });
    },

    has(key: K): boolean {
      const entry = cacheEntries.get(key);
      if (!entry) {
        return false;
      }

      return !removeExpired(key, entry);
    },

    clear(): void {
      cacheEntries.clear();
    },
  };
}
