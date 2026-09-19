import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOnlineTranslation } from "../utils/onlineTranslate";

describe("fetchOnlineTranslation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
});
