export const TOGGLE_HOVER_EXPANDED_COMMAND =
  "translateDict.toggleHoverExpanded";

const HEADER_MAX_LENGTH = 48;
export const MAX_SELECTION_TRANSLATE_LENGTH = 200;

export type HoverToggleTarget = {
  uri: string;
  line: number;
  character: number;
};

export type HoverToggleArgs = HoverToggleTarget & {
  expanded: boolean;
};

/**
 * 校验折叠命令参数，避免非法坐标让 Position / lineAt 抛错。
 */
export function parseToggleHoverArgs(
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

/**
 * 选区为 [start, end) 时，位置是否落在选区内。空选区始终为 false。
 */
export function positionInExclusiveRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
  line: number,
  character: number
): boolean {
  if (startLine === endLine && startCharacter === endCharacter) {
    return false;
  }

  const geStart =
    line > startLine || (line === startLine && character >= startCharacter);
  const ltEnd =
    line < endLine || (line === endLine && character < endCharacter);
  return geStart && ltEnd;
}

export function shouldResetSessionHover(
  refreshing: boolean,
  session: HoverToggleTarget | undefined,
  uri: string,
  line: number,
  character: number
): boolean {
  if (refreshing || !session) {
    return false;
  }
  return (
    session.uri !== uri ||
    session.line !== line ||
    session.character !== character
  );
}

/**
 * 过长选区会拖垮拆词与 Markdown；超限时回退到单词。
 */
export function selectionTextForTranslate(
  selectText: string,
  maxLength: number = MAX_SELECTION_TRANSLATE_LENGTH
): string | undefined {
  if (!selectText.trim()) {
    return undefined;
  }
  if (selectText.length > maxLength) {
    return undefined;
  }
  return selectText;
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

/**
 * 生成折叠/展开命令链接。参数写入 URI，避免点击时丢失位置。
 */
export function toggleHoverCommandUri(
  nextExpanded: boolean,
  target: HoverToggleTarget
): string {
  const args = encodeURIComponent(
    JSON.stringify([
      target.uri,
      target.line,
      target.character,
      nextExpanded,
    ])
  );
  return `command:${TOGGLE_HOVER_EXPANDED_COMMAND}?${args}`;
}

function toggleLink(
  currentlyExpanded: boolean,
  target: HoverToggleTarget
): string {
  const label = currentlyExpanded ? "▼ 折叠词典" : "▶ 展开词典";
  return `[${label}](${toggleHoverCommandUri(!currentlyExpanded, target)})`;
}

/**
 * 在词典 Markdown 前加上折叠/展开按钮。不使用 HTML，避免悬浮框无法渲染。
 */
export function wrapHoverMarkdown(
  headerText: string,
  dictionaryMarkdown: string,
  expanded: boolean,
  target: HoverToggleTarget
): string {
  if (!expanded) {
    return toggleLink(false, target);
  }

  const header = headerText.replace(/\s+$/, "");
  const title =
    header.length > 0 && header.length <= HEADER_MAX_LENGTH
      ? `${header}  \n`
      : "";
  return `${toggleLink(true, target)}  \n${title}${dictionaryMarkdown}`;
}
