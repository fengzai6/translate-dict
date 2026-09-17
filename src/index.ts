import * as vscode from "vscode";
import { MARKDOWN_FOOTER, MARKDOWN_HEADER, MARKDOWN_LINE } from "./constants";
import { containsChinese, reverseQuery } from "./reverseQuery";
import { convertToMarkdown } from "./utils/convert";
import { parseAndQuery } from "./utils/format";
import {
  isPositionInDocument,
  parseToggleHoverArgs,
  positionInExclusiveRange,
  selectionTextForTranslate,
  shouldResetSessionHover,
  TOGGLE_HOVER_EXPANDED_COMMAND,
  wrapHoverMarkdown,
} from "./utils/hoverMarkdown";
import {
  OnlineTranslateApi,
  fetchOnlineTranslation,
  getApiLabel,
} from "./utils/onlineTranslate";
import { getDefaultPlatformUrl } from "./utils/platform";

// 全局翻译开关状态
let translationEnabled = true;

// 快捷键触发标志（shortcut 模式下用于控制 hover provider）
let shortcutTriggered = false;

// 只覆盖当前单词的展开状态，不写入全局配置
let sessionHover:
  | { uri: string; line: number; character: number; expanded: boolean }
  | undefined;
let lastHoverUri: string | undefined;
let lastHoverPosition: vscode.Position | undefined;
let lastHoverSelection:
  | { uri: string; range: vscode.Selection }
  | undefined;
let refreshingHover = false;
let hoverRefreshSeq = 0;

type TranslationMode = "hover" | "shortcut";

/**
 * 读取当前翻译模式配置
 */
function getTranslationMode(): TranslationMode {
  const config = vscode.workspace.getConfiguration("translateDict");
  return config.get<TranslationMode>("translationMode", "hover");
}

function getAutoExpandHover(): boolean {
  const config = vscode.workspace.getConfiguration("translateDict");
  return config.get<boolean>("autoExpandHover", true);
}

function isSameHoverPosition(uri: string, position: vscode.Position): boolean {
  return (
    !!sessionHover &&
    sessionHover.uri === uri &&
    sessionHover.line === position.line &&
    sessionHover.character === position.character
  );
}

function isHoverExpanded(uri: string, position: vscode.Position): boolean {
  if (isSameHoverPosition(uri, position)) {
    return sessionHover!.expanded;
  }
  return getAutoExpandHover();
}

function toHover(
  headerText: string,
  dictionaryMarkdown: string,
  uri: string,
  position: vscode.Position,
  range?: vscode.Range
): vscode.Hover {
  const markdown = new vscode.MarkdownString(
    wrapHoverMarkdown(
      headerText,
      dictionaryMarkdown,
      isHoverExpanded(uri, position),
      {
        uri,
        line: position.line,
        character: position.character,
      }
    ) + MARKDOWN_FOOTER
  );
  markdown.isTrusted = {
    enabledCommands: [TOGGLE_HOVER_EXPANDED_COMMAND],
  };
  return new vscode.Hover(markdown, range);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 选区是否覆盖悬停位置（Range.end 为排他边界）
 */
function selectionCoversPosition(
  selection: vscode.Selection,
  position: vscode.Position
): boolean {
  return positionInExclusiveRange(
    selection.start.line,
    selection.start.character,
    selection.end.line,
    selection.end.character,
    position.line,
    position.character
  );
}

function selectionOverlapsRange(
  selection: vscode.Selection,
  range: vscode.Range
): boolean {
  const overlap = selection.intersection(range);
  return !!overlap && !overlap.isEmpty;
}

/**
 * 命令链接点击会先关掉 hover。连续点击只保留最后一次刷新。
 */
async function refreshHover(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (
    !editor ||
    !lastHoverUri ||
    !lastHoverPosition ||
    editor.document.uri.toString() !== lastHoverUri
  ) {
    return;
  }

  const position = lastHoverPosition;
  const document = editor.document;
  let lineLength = 0;
  try {
    lineLength = document.lineAt(position.line).range.end.character;
  } catch {
    return;
  }
  if (
    !isPositionInDocument(
      position.line,
      position.character,
      document.lineCount,
      lineLength
    )
  ) {
    return;
  }

  const previousSelection = editor.selection;
  const restoreSelection =
    !previousSelection.isEmpty &&
    selectionCoversPosition(previousSelection, position)
      ? previousSelection
      : lastHoverSelection &&
          lastHoverSelection.uri === lastHoverUri &&
          selectionCoversPosition(lastHoverSelection.range, position)
        ? lastHoverSelection.range
        : undefined;

  const seq = ++hoverRefreshSeq;
  const allowShortcut = getTranslationMode() === "shortcut";
  refreshingHover = true;
  if (allowShortcut) {
    shortcutTriggered = true;
  }

  try {
    const nudge =
      position.character > 0
        ? position.translate(0, -1)
        : lineLength > position.character
          ? position.translate(0, 1)
          : position;

    editor.selection = new vscode.Selection(nudge, nudge);

    try {
      await vscode.commands.executeCommand("editor.action.hideHover");
    } catch {
      // ignore
    }

    if (seq !== hoverRefreshSeq) {
      return;
    }
    await sleep(80);
    if (seq !== hoverRefreshSeq) {
      return;
    }

    if (restoreSelection) {
      editor.selection = restoreSelection;
    } else {
      editor.selection = new vscode.Selection(position, position);
    }
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.Default
    );

    await sleep(100);
    if (seq !== hoverRefreshSeq) {
      return;
    }
    await vscode.commands.executeCommand("editor.action.showHover", {
      focus: true,
    });
    await sleep(100);
    if (seq !== hoverRefreshSeq) {
      return;
    }
    await vscode.commands.executeCommand("editor.action.showHover", {
      focus: true,
    });
  } finally {
    if (seq === hoverRefreshSeq) {
      refreshingHover = false;
      if (allowShortcut) {
        shortcutTriggered = false;
      }
    }
  }
}

/**
 * 判断单词在本地词库中是否有翻译结果
 */
function hasLocalTranslation(word: string): boolean {
  const results = parseAndQuery(word);
  return results.some((r) => r.result !== undefined);
}

/**
 * 根据配置获取在线回退 API 列表（按优先级排序）
 */
function getOnlineFallbackApis(
  config: vscode.WorkspaceConfiguration
): OnlineTranslateApi[] {
  const apiSetting = config.get<string>("onlineFallbackApi", "auto");
  if (apiSetting === "google") return ["google"];
  if (apiSetting === "yandex") return ["yandex"];
  // auto：谷歌优先，失败则 Yandex
  return ["google", "yandex"];
}

/**
 * 初始化翻译插件
 */
export function init(context?: vscode.ExtensionContext): void {
  // 注册翻译控制命令
  if (context) {
    // 注册启用翻译的命令
    context.subscriptions.push(
      vscode.commands.registerCommand("translateDict.enableTranslation", () => {
        translationEnabled = true;
        vscode.window.setStatusBarMessage("✅ 翻译功能已启用", 3000);
      })
    );

    // 注册禁用翻译的命令
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "translateDict.disableTranslation",
        () => {
          translationEnabled = false;
          vscode.window.setStatusBarMessage("❌ 翻译功能已禁用", 3000);
        }
      )
    );

    // 注册切换翻译模式的命令
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "translateDict.toggleTranslationMode",
        async () => {
          const config = vscode.workspace.getConfiguration("translateDict");
          const currentMode = config.get<TranslationMode>(
            "translationMode",
            "hover"
          );
          const nextMode: TranslationMode =
            currentMode === "hover" ? "shortcut" : "hover";

          await config.update(
            "translationMode",
            nextMode,
            vscode.ConfigurationTarget.Global
          );

          const modeLabel =
            nextMode === "hover"
              ? "悬浮即翻译（hover）"
              : "快捷键翻译（Alt+T）";
          vscode.window.setStatusBarMessage(
            `🔄 翻译模式已切换为：${modeLabel}`,
            3000
          );
        }
      )
    );

    // 注册快捷键翻译命令（shortcut 模式下 Alt+T 触发）
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "translateDict.translateSelection",
        async () => {
          if (!translationEnabled) {
            return;
          }

          const mode = getTranslationMode();
          if (mode !== "shortcut") {
            return;
          }

          shortcutTriggered = true;
          try {
            await vscode.commands.executeCommand("editor.action.showHover");
          } finally {
            shortcutTriggered = false;
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        TOGGLE_HOVER_EXPANDED_COMMAND,
        async (
          uri?: string,
          line?: number,
          character?: number,
          expanded?: boolean
        ) => {
          const parsed = parseToggleHoverArgs(uri, line, character, expanded);
          if (parsed) {
            lastHoverUri = parsed.uri;
            try {
              lastHoverPosition = new vscode.Position(
                parsed.line,
                parsed.character
              );
            } catch {
              return;
            }
            sessionHover = {
              uri: parsed.uri,
              line: parsed.line,
              character: parsed.character,
              expanded: parsed.expanded,
            };
          } else if (lastHoverUri && lastHoverPosition) {
            sessionHover = {
              uri: lastHoverUri,
              line: lastHoverPosition.line,
              character: lastHoverPosition.character,
              expanded: !isHoverExpanded(lastHoverUri, lastHoverPosition),
            };
          } else {
            return;
          }

          await refreshHover();
        }
      )
    );
  }

  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    async provideHover(
      document: vscode.TextDocument,
      position: vscode.Position
    ): Promise<vscode.Hover | undefined> {
      // 检查全局开关
      if (!translationEnabled) {
        return;
      }

      // 检查翻译模式：shortcut 模式下只有快捷键触发才响应
      const mode = getTranslationMode();
      if (mode === "shortcut" && !shortcutTriggered) {
        return;
      }

      // 获取配置
      const config = vscode.workspace.getConfiguration("translateDict");
      const includeFileExtensions = config.get<string[]>(
        "includeFileExtensions",
        []
      );
      const excludeFileExtensions = config.get<string[]>(
        "excludeFileExtensions",
        []
      );
      const chineseToEnglishMaxResults = config.get<number>(
        "chineseToEnglishMaxResults",
        10
      );
      const enableOnlineFallback = config.get<boolean>(
        "enableOnlineFallback",
        false
      );

      // 获取当前文件的扩展名（不含点号）
      const fileName = document.fileName;
      const lastDotIndex = fileName.lastIndexOf(".");
      const fileExtension =
        lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1) : "";

      // 判断是否应该提供翻译
      // 如果在排除列表中，直接返回
      if (excludeFileExtensions.includes(fileExtension)) {
        return;
      }

      // 如果有包含列表且当前文件扩展名不在列表中，返回
      if (
        includeFileExtensions.length > 0 &&
        !includeFileExtensions.includes(fileExtension)
      ) {
        return;
      }

      const editor = vscode.window.activeTextEditor;
      const activeSelection =
        editor && editor.document.uri.toString() === document.uri.toString()
          ? editor.selection
          : undefined;
      const rawSelectText =
        activeSelection && !activeSelection.isEmpty
          ? document.getText(activeSelection)
          : "";
      const selectText = selectionTextForTranslate(rawSelectText);
      const usingSelection =
        !!activeSelection &&
        !!selectText &&
        selectionCoversPosition(activeSelection, position);

      const wordRange = document.getWordRangeAtPosition(position);
      if (!usingSelection && !wordRange) {
        return;
      }

      const uri = document.uri.toString();
      const hoverRange = usingSelection
        ? new vscode.Range(activeSelection!.start, activeSelection!.end)
        : wordRange!;
      const hoverPosition = hoverRange.start;
      if (
        shouldResetSessionHover(
          refreshingHover,
          sessionHover,
          uri,
          hoverPosition.line,
          hoverPosition.character
        )
      ) {
        sessionHover = undefined;
      }
      if (!refreshingHover) {
        lastHoverUri = uri;
        lastHoverPosition = hoverPosition;
        lastHoverSelection = usingSelection
          ? { uri, range: activeSelection! }
          : undefined;
      }

      let word = usingSelection
        ? selectText!
        : document.getText(wordRange!);
      let isSelectWord = usingSelection;

      // 选区与当前词相交时才用选区，避免字符串误包含
      if (
        !usingSelection &&
        selectText &&
        activeSelection &&
        wordRange &&
        selectionOverlapsRange(activeSelection, wordRange)
      ) {
        word = selectText;
        isSelectWord = true;
        if (!refreshingHover) {
          lastHoverSelection = { uri, range: activeSelection };
        }
      }

      const originText = word.replace(/"/g, "");

      // 根据是否包含中文显示不同的标题
      const isChinese = containsChinese(originText);

      // 仅翻译 selected 的中文
      if (isChinese && !isSelectWord) {
        return;
      }

      // 优先使用本地词库结果
      const wordsMarkdown = convertToMarkdown(word, chineseToEnglishMaxResults);

      const headerText = isChinese
        ? `中译英 \`${originText}\` :  \n`
        : MARKDOWN_HEADER.replace("$word", originText);

      // 非中文且本地无结果时，尝试在线回退翻译
      if (!isChinese && !hasLocalTranslation(originText) && enableOnlineFallback) {
        const apis = getOnlineFallbackApis(config);
        const online = await fetchOnlineTranslation(originText, apis, "en-zh");
        if (online) {
          const defaultUrl = getDefaultPlatformUrl(originText);
          const onlineMarkdown =
            `- [${originText}](${defaultUrl}) :  \n` +
            `${online.translation}` +
            MARKDOWN_LINE +
            `*${getApiLabel(online.source)}*`;
          return toHover(
            headerText,
            onlineMarkdown,
            uri,
            hoverPosition,
            hoverRange
          );
        }
      }

      // 中文且本地无结果时，尝试在线回退翻译
      if (isChinese && reverseQuery(originText, 1).length === 0 && enableOnlineFallback) {
        const apis = getOnlineFallbackApis(config);
        const online = await fetchOnlineTranslation(originText, apis, "zh-en");
        if (online) {
          const onlineMarkdown =
            `- ${online.translation}` +
            MARKDOWN_LINE +
            `*${getApiLabel(online.source)}*`;
          return toHover(
            headerText,
            onlineMarkdown,
            uri,
            hoverPosition,
            hoverRange
          );
        }
      }

      if (!wordsMarkdown) {
        return;
      }

      return toHover(headerText, wordsMarkdown, uri, hoverPosition, hoverRange);
    },
  });

  context?.subscriptions.push(hoverProvider);
}
