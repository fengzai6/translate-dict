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
  const entries = new Map<K, CacheEntry<V>>();
  const { ttlMs, maxEntries } = options;

  const isExpired = (entry: CacheEntry<V>): boolean =>
    entry.expiresAt !== undefined && entry.expiresAt <= Date.now();

  const removeExpired = (key: K, entry: CacheEntry<V>): boolean => {
    if (!isExpired(entry)) {
      return false;
    }

    entries.delete(key);
    return true;
  };

  return {
    get(key: K): V | undefined {
      const entry = entries.get(key);
      if (!entry || removeExpired(key, entry)) {
        return undefined;
      }

      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },

    set(key: K, value: V): void {
      if (entries.has(key)) {
        entries.delete(key);
      } else if (
        maxEntries !== undefined &&
        entries.size >= maxEntries
      ) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey !== undefined) {
          entries.delete(oldestKey);
        }
      }

      entries.set(key, {
        value,
        expiresAt: ttlMs === undefined ? undefined : Date.now() + ttlMs,
      });
    },

    has(key: K): boolean {
      const entry = entries.get(key);
      if (!entry) {
        return false;
      }

      return !removeExpired(key, entry);
    },

    clear(): void {
      entries.clear();
    },
  };
}
