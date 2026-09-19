import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearOnlineTranslationCache,
  fetchOnlineTranslation,
} from "../utils/onlineTranslate";

describe("fetchOnlineTranslation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearOnlineTranslationCache();
  });

  it("请求超时应跳过当前 API 并尝试下一个", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_input: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              return;
            }
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          text: ["你好"],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchOnlineTranslation("hello", ["google", "yandex"], "en-zh");
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;

    expect(result).toEqual({
      translation: "你好",
      source: "yandex",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("所有 API 都超时时返回 null", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(
      (_input: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchOnlineTranslation("hello", ["google", "yandex"], "en-zh");
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    const result = await pending;

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("相同请求应复用缓存并只发起一次上游请求", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [{ trans: "你好" }],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchOnlineTranslation("hello", ["google"], "en-zh");
    const second = await fetchOnlineTranslation("hello", ["google"], "en-zh");

    expect(first).toEqual({ translation: "你好", source: "google" });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("不同翻译方向不应共享缓存", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sentences: [{ trans: "你好" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sentences: [{ trans: "hello" }],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await fetchOnlineTranslation("hello", ["google"], "en-zh");
    await fetchOnlineTranslation("hello", ["google"], "zh-en");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("取消请求后不应继续尝试下一个 API", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_input: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchOnlineTranslation(
      "hello",
      ["google", "yandex"],
      "en-zh",
      controller.signal
    );
    controller.abort();

    await expect(pending).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("缓存命中不应受到旧请求取消影响", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sentences: [{ trans: "你好" }],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await fetchOnlineTranslation("hello", ["google"], "en-zh");
    controller.abort();

    const result = await fetchOnlineTranslation(
      "hello",
      ["google"],
      "en-zh",
      controller.signal
    );

    expect(result).toEqual({ translation: "你好", source: "google" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
