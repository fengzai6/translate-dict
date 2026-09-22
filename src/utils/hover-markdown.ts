import { MARKDOWN_LINE } from "../constants";
import { WordQueryResult } from "./format";
import { generatePlatformLinks, getDefaultPlatformUrl } from "./platform";

export const TOGGLE_HOVER_EXPANDED_COMMAND =
  "translateDict.toggleHoverExpanded";
export const TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND =
  "translateDict.toggleHoverOriginalText";
export const MAX_ORIGINAL_TEXT_LINES = 3;

export type HoverCommandTarget = {
  uri: string;
  line: number;
  character: number;
};

export type HoverToggleArgs = HoverCommandTarget & {
  expanded: boolean;
};

function buildDictionaryEntryMarkdown(
  word: string,
  translation?: string,
  phonetic?: string
): string {
  const defaultUrl = getDefaultPlatformUrl(word);

  if (!translation && !phonetic) {
    const platformLinks = generatePlatformLinks(word);
    return `- [${word}](${defaultUrl}) :  
本地词库暂无结果${platformLinks ? ` , 查看 ${platformLinks}` : ""}`;
  }

  return buildTranslationEntryMarkdown(word, translation ?? "", phonetic);
}

function buildTranslationEntryMarkdown(
  word: string,
  translation: string,
  phonetic?: string
): string {
  const defaultUrl = getDefaultPlatformUrl(word);
  const phoneticText = phonetic ? `/${phonetic}/` : "";
  return `- [${word}](${defaultUrl}) ${phoneticText}:  \n${translation.replace(
    /\\n/g,
    `  \n`
  )}`;
}

function joinDictionaryEntries(entries: string[]): string {
  return entries
    .map((entry, index) => (index === 0 ? entry : MARKDOWN_LINE + entry))
    .join("");
}

/**
 * 将英译中查询结果转为 Markdown
 */
export function convertQueryResultsToMarkdown(
  results: WordQueryResult[]
): string {
  if (results.length === 0) {
    return "";
  }

  return joinDictionaryEntries(
    results.map((item) => {
      const displayWord = item.result?.w ?? item.word;
      return buildDictionaryEntryMarkdown(
        displayWord,
        item.result?.t,
        item.result?.p
      );
    })
  );
}

/**
 * 生成中译英的 Markdown 结果
 */
export function convertReverseResultsToMarkdown(
  results: Array<{ word: string; translation: string; phonetic?: string }>
): string {
  if (results.length === 0) {
    return "- 本地词库暂无匹配的英文单词";
  }

  return joinDictionaryEntries(
    results.map((item) =>
      buildTranslationEntryMarkdown(
        item.word,
        item.translation,
        item.phonetic
      )
    )
  );
}

export function parseHoverToggleArgs(
  uri: unknown,
  line: unknown,
  character: unknown,
  expanded: unknown
): HoverToggleArgs | undefined {
  if (typeof uri !== "string" || uri.length === 0 || uri.length > 4096) {
    return undefined;
  }
  if (
    typeof line !== "number" ||
    typeof character !== "number" ||
    !Number.isInteger(line) ||
    !Number.isInteger(character) ||
    line < 0 ||
    character < 0 ||
    line > 10_000_000 ||
    character > 100_000
  ) {
    return undefined;
  }
  if (typeof expanded !== "boolean") {
    return undefined;
  }
  return { uri, line, character, expanded };
}

export function isPositionInDocument(
  line: number,
  character: number,
  lineCount: number,
  lineLength: number
): boolean {
  if (line < 0 || line >= lineCount) {
    return false;
  }
  return character >= 0 && character <= lineLength;
}

export function hoverToggleCommandUri(
  commandId: string,
  nextExpanded: boolean,
  target: HoverCommandTarget
): string {
  const args = encodeURIComponent(
    JSON.stringify([
      target.uri,
      target.line,
      target.character,
      nextExpanded,
    ])
  );
  return `command:${commandId}?${args}`;
}

function toggleLink(
  label: string,
  commandId: string,
  nextExpanded: boolean,
  target: HoverCommandTarget
): string {
  const escapedLabel = label.replace(/([\\[\]])/g, "\\$1");
  return `[${escapedLabel}](${hoverToggleCommandUri(
    commandId,
    nextExpanded,
    target
  )})`;
}

function splitLogicalLines(markdown: string): string[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function formatInlineCode(value: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...(value.match(/`+/g)?.map((run) => run.length) ?? [])
  );
  const fence = "`".repeat(longestBacktickRun + 1);
  const padding = value.startsWith("`") || value.endsWith("`") ? " " : "";
  return `${fence}${padding}${value}${padding}${fence}`;
}

export function buildOriginalTextMarkdown(
  titlePrefix: string,
  originalText: string
): string {
  const [firstLine = "", ...restLines] = splitLogicalLines(originalText);
  const title = `${titlePrefix} ${formatInlineCode(firstLine)} :`;
  return [title, ...restLines].join("  \n");
}

function renderOriginalTextBody(
  lines: string[],
  expanded: boolean,
  target: HoverCommandTarget
): string | undefined {
  if (lines.length === 0) {
    return undefined;
  }

  const visibleLineLimit = Math.max(MAX_ORIGINAL_TEXT_LINES - 1, 0);
  const visibleLines = (expanded ? lines : lines.slice(0, visibleLineLimit)).map(
    (line) => line.replace(/\s+$/, "")
  );
  const hasOverflow = lines.length > visibleLineLimit;
  const toggle = hasOverflow
    ? `  \n${toggleLink(
        expanded ? "收起" : "展开剩余原文",
        TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
        !expanded,
        target
      )}`
    : "";

  return `${visibleLines.join("  \n")}${toggle}`;
}

export function wrapHoverMarkdown(
  originalTextMarkdown: string,
  dictionaryMarkdown: string,
  state: {
    dictionaryExpanded: boolean;
    originalTextExpanded: boolean;
  },
  target: HoverCommandTarget
): string {
  const lines = splitLogicalLines(originalTextMarkdown);
  const summaryText = (lines.shift() ?? "").replace(/\s+$/, "");
  const titlePrefixMatch = summaryText.match(/^(翻译|中译英)\s+/);
  const titlePrefixMatchText = titlePrefixMatch?.[0];
  const titlePrefix = titlePrefixMatchText?.trimEnd();
  const summaryContent = titlePrefixMatchText
    ? summaryText.slice(titlePrefixMatchText.length)
    : summaryText;
  const summaryToggle = toggleLink(
    `${state.dictionaryExpanded ? "▼" : "▶"}${
      titlePrefix ? ` ${titlePrefix}` : ""
    }`,
    TOGGLE_HOVER_EXPANDED_COMMAND,
    !state.dictionaryExpanded,
    target
  );
  const summary = `${summaryToggle}${summaryContent ? ` ${summaryContent}` : ""}`;

  if (!state.dictionaryExpanded) {
    return summary;
  }

  const originalText = renderOriginalTextBody(
    lines,
    state.originalTextExpanded,
    target
  );
  const originalTextMarkdownWithToggle = originalText
    ? `  \n${originalText}`
    : "";

  return `${summary}${originalTextMarkdownWithToggle}  \n${dictionaryMarkdown}`;
}
