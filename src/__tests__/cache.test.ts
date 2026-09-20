import { afterEach, describe, expect, it, vi } from "vitest";
import { createCache } from "../utils/cache";

describe("createCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("应该通过 TTL 清理过期缓存", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const cache = createCache<string, string>({ ttlMs: 100 });
    cache.set("hello", "你好");

    expect(cache.get("hello")).toBe("你好");

    vi.advanceTimersByTime(101);

    expect(cache.get("hello")).toBeUndefined();
    expect(cache.has("hello")).toBe(false);
  });

  it("应该在达到容量上限时淘汰最久未使用的缓存", () => {
    const cache = createCache<string, number>({ maxEntries: 2 });

    cache.set("first", 1);
    cache.set("second", 2);
    expect(cache.get("first")).toBe(1);

    cache.set("third", 3);

    expect(cache.has("first")).toBe(true);
    expect(cache.has("second")).toBe(false);
    expect(cache.has("third")).toBe(true);
  });

  it("应该区分未命中和已缓存的 undefined", () => {
    const cache = createCache<string, string | undefined>();

    cache.set("missing", undefined);

    expect(cache.has("missing")).toBe(true);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.has("unknown")).toBe(false);
  });

  it("应该支持清空缓存", () => {
    const cache = createCache<string, number>();

    cache.set("hello", 1);
    cache.clear();

    expect(cache.has("hello")).toBe(false);
    expect(cache.get("hello")).toBeUndefined();
  });
});
