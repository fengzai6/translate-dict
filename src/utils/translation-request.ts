import type * as vscode from "vscode";
import {
  fetchOnlineTranslation,
  type OnlineTranslateApi,
  type OnlineTranslateResult,
  type TranslateDirection,
} from "./onlineTranslate";

let activeOnlineTranslation: AbortController | null = null;

/**
 * 请求最新在线翻译，并取消上一次未完成的请求
 */
export async function fetchLatestOnlineTranslation(
  word: string,
  apis: OnlineTranslateApi[],
  direction: TranslateDirection,
  token: vscode.CancellationToken
): Promise<OnlineTranslateResult | null> {
  activeOnlineTranslation?.abort();
  const controller = new AbortController();
  activeOnlineTranslation = controller;

  const abort = (): void => controller.abort();
  token.onCancellationRequested(abort);

  try {
    return await fetchOnlineTranslation(
      word,
      apis,
      direction,
      controller.signal
    );
  } finally {
    if (activeOnlineTranslation === controller) {
      activeOnlineTranslation = null;
    }
  }
}
