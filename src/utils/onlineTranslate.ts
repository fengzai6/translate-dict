import { createCache } from "./cache";

export type OnlineTranslateApi = "google" | "yandex";
export type TranslateDirection = "en-zh" | "zh-en";

export interface OnlineTranslateResult {
  translation: string;
  source: OnlineTranslateApi;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** 单个在线翻译 API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 3000;

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

const translationCache = createCache<string, OnlineTranslateResult>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
});

function getCacheKey(
  word: string,
  apis: OnlineTranslateApi[],
  direction: TranslateDirection
): string {
  return `${direction}\u0000${apis.join(",")}\u0000${word}`;
}

/**
 * 清空在线翻译缓存
 */
export function clearOnlineTranslationCache(): void {
  translationCache.clear();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const timeoutId = setTimeout(abort, timeoutMs);

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
}

async function translateWithGoogle(
  word: string,
  direction: TranslateDirection,
  signal?: AbortSignal
): Promise<string | null> {
  const [sl, tl] = direction === "en-zh" ? ["en", "zh-CN"] : ["zh-CN", "en"];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dj=1&dt=t&q=${encodeURIComponent(word)}`;
  const res = await fetchWithTimeout(url, {
    headers: { "user-agent": USER_AGENT },
  }, REQUEST_TIMEOUT_MS, signal);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    sentences?: Array<{ trans?: string }>;
  };
  return data?.sentences?.[0]?.trans ?? null;
}

async function translateWithYandex(
  word: string,
  direction: TranslateDirection,
  signal?: AbortSignal
): Promise<string | null> {
  const lang = direction === "en-zh" ? "en-zh" : "zh-en";
  const url = `https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget&format=text&lang=${lang}&text=${encodeURIComponent(word)}`;
  const res = await fetchWithTimeout(url, {
    headers: { "user-agent": USER_AGENT },
  }, REQUEST_TIMEOUT_MS, signal);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    code?: number;
    text?: string[];
  };
  if (data?.code !== 200) return null;
  return data?.text?.[0] ?? null;
}

/**
 * 通过在线 API 翻译，按顺序尝试指定的 API
 */
export async function fetchOnlineTranslation(
  word: string,
  apis: OnlineTranslateApi[],
  direction: TranslateDirection = "en-zh",
  signal?: AbortSignal
): Promise<OnlineTranslateResult | null> {
  const cacheKey = getCacheKey(word, apis, direction);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  for (const api of apis) {
    if (signal?.aborted) {
      return null;
    }

    try {
      let translation: string | null = null;
      if (api === "google") {
        translation = await translateWithGoogle(word, direction, signal);
      } else if (api === "yandex") {
        translation = await translateWithYandex(word, direction, signal);
      }
      if (translation) {
        const result = { translation, source: api };
        translationCache.set(cacheKey, result);
        return result;
      }
    } catch {
      if (signal?.aborted) {
        return null;
      }
      // 当前 API 失败（含超时），尝试下一个
    }
  }
  return null;
}

const API_LABEL: Record<OnlineTranslateApi, string> = {
  google: "Google 翻译",
  yandex: "Yandex 翻译",
};

export function getApiLabel(api: OnlineTranslateApi): string {
  return API_LABEL[api];
}
