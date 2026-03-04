export type OnlineTranslateApi = "google" | "yandex";
export type TranslateDirection = "en-zh" | "zh-en";

export interface OnlineTranslateResult {
  translation: string;
  source: OnlineTranslateApi;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function translateWithGoogle(
  word: string,
  direction: TranslateDirection
): Promise<string | null> {
  const [sl, tl] = direction === "en-zh" ? ["en", "zh-CN"] : ["zh-CN", "en"];
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dj=1&dt=t&q=${encodeURIComponent(word)}`;
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    sentences?: Array<{ trans?: string }>;
  };
  return data?.sentences?.[0]?.trans ?? null;
}

async function translateWithYandex(
  word: string,
  direction: TranslateDirection
): Promise<string | null> {
  const lang = direction === "en-zh" ? "en-zh" : "zh-en";
  const url = `https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget&format=text&lang=${lang}&text=${encodeURIComponent(word)}`;
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
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
  direction: TranslateDirection = "en-zh"
): Promise<OnlineTranslateResult | null> {
  for (const api of apis) {
    try {
      let translation: string | null = null;
      if (api === "google") {
        translation = await translateWithGoogle(word, direction);
      } else if (api === "yandex") {
        translation = await translateWithYandex(word, direction);
      }
      if (translation) {
        return { translation, source: api };
      }
    } catch {
      // 当前 API 失败，尝试下一个
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
