import type * as vscode from "vscode";
import { MARKDOWN_LINE } from "./constants";
import type { HoverSessionState } from "./hover-session";
import { containsChinese, reverseQuery } from "./reverseQuery";
import { parseAndQuery } from "./utils/format";
import {
  buildOriginalTextMarkdown,
  convertQueryResultsToMarkdown,
  convertReverseResultsToMarkdown,
  type HoverCommandTarget,
  wrapHoverMarkdown,
} from "./utils/hover-markdown";
import type { HoverQuery } from "./utils/hover-query";
import {
  getApiLabel,
  type OnlineTranslateApi,
} from "./utils/onlineTranslate";
import {
  generatePlatformLinks,
  getDefaultPlatformUrl,
} from "./utils/platform";
import { fetchLatestOnlineTranslation } from "./utils/translation-request";

export type HoverPresentationConfig = {
  chineseToEnglishMaxResults: number;
  enableOnlineFallback: boolean;
  onlineFallbackApis: OnlineTranslateApi[];
};

export type BuildHoverPresentationInput = {
  query: HoverQuery;
  config: HoverPresentationConfig;
  state: HoverSessionState;
  commandTarget: HoverCommandTarget;
  token: vscode.CancellationToken;
};

export type HoverPresentation = {
  markdown: string;
};

export async function buildHoverPresentation({
  query,
  config,
  state,
  commandTarget,
  token,
}: BuildHoverPresentationInput): Promise<HoverPresentation | undefined> {
  const word = query.text;
  const isSelectWord = query.kind === "selection";
  const originText = word.replace(/"/g, "");
  const isChinese = containsChinese(originText);

  if (isChinese && !isSelectWord) {
    return undefined;
  }

  const headerText = buildOriginalTextMarkdown(
    isChinese ? "中译英" : "翻译",
    originText
  );

  if (isChinese) {
    const reverseResults = reverseQuery(
      originText,
      config.chineseToEnglishMaxResults
    );

    if (reverseResults.length > 0) {
      return present(
        headerText,
        convertReverseResultsToMarkdown(reverseResults),
        state,
        commandTarget
      );
    }

    if (config.enableOnlineFallback) {
      const online = await fetchLatestOnlineTranslation(
        originText,
        config.onlineFallbackApis,
        "zh-en",
        token
      );
      if (token.isCancellationRequested) {
        return undefined;
      }
      if (online) {
        const onlineMarkdown =
          `- ${online.translation}` +
          MARKDOWN_LINE +
          `*${getApiLabel(online.source)}*`;
        return present(headerText, onlineMarkdown, state, commandTarget);
      }
    }

    const platformLinks = generatePlatformLinks(originText);
    const emptyMarkdown = `- 本地词库暂无匹配的英文单词${
      platformLinks ? ` , 查看 ${platformLinks}` : ""
    }`;
    return present(headerText, emptyMarkdown, state, commandTarget);
  }

  const queryResults = parseAndQuery(word);
  const hasLocalResult = queryResults.some((r) => r.result !== undefined);

  if (hasLocalResult) {
    const wordsMarkdown = convertQueryResultsToMarkdown(queryResults);
    return wordsMarkdown
      ? present(headerText, wordsMarkdown, state, commandTarget)
      : undefined;
  }

  if (config.enableOnlineFallback) {
    const online = await fetchLatestOnlineTranslation(
      originText,
      config.onlineFallbackApis,
      "en-zh",
      token
    );
    if (token.isCancellationRequested) {
      return undefined;
    }
    if (online) {
      const defaultUrl = getDefaultPlatformUrl(originText);
      const onlineMarkdown =
        `- [${originText}](${defaultUrl}) :  \n` +
        `${online.translation}` +
        MARKDOWN_LINE +
        `*${getApiLabel(online.source)}*`;
      return present(headerText, onlineMarkdown, state, commandTarget);
    }
  }

  const wordsMarkdown = convertQueryResultsToMarkdown(queryResults);
  return wordsMarkdown
    ? present(headerText, wordsMarkdown, state, commandTarget)
    : undefined;
}

function present(
  originalTextMarkdown: string,
  dictionaryMarkdown: string,
  state: HoverSessionState,
  commandTarget: HoverCommandTarget
): HoverPresentation {
  return {
    markdown: wrapHoverMarkdown(
      originalTextMarkdown,
      dictionaryMarkdown,
      state,
      commandTarget
    ),
  };
}
