import * as vscode from "vscode";
import { MARKDOWN_FOOTER, MARKDOWN_LINE } from "./constants";
import {
  createHoverSession,
  type HoverSessionState,
  type HoverSessionTarget,
} from "./hover-session";
import { containsChinese, reverseQuery } from "./reverseQuery";
import {
  buildOriginalTextMarkdown,
  convertQueryResultsToMarkdown,
  convertReverseResultsToMarkdown,
  isPositionInDocument,
  parseHoverToggleArgs,
  TOGGLE_HOVER_EXPANDED_COMMAND,
  TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
  wrapHoverMarkdown,
} from "./utils/hover-markdown";
import { parseAndQuery } from "./utils/format";
import {
  resolveHoverQuery,
  type HoverQuery,
} from "./utils/hover-query";
import {
  OnlineTranslateApi,
  OnlineTranslateResult,
  fetchOnlineTranslation,
  getApiLabel,
} from "./utils/onlineTranslate";
import {
  generatePlatformLinks,
  getDefaultPlatformUrl,
} from "./utils/platform";

// 全局翻译开关状态
let translationEnabled = true;

// 快捷键触发标志（shortcut 模式下用于控制 hover provider）
let shortcutTriggered = false;

let activeOnlineTranslation: AbortController | null = null;

let hoverRefreshSeq = 0;

type TranslationMode = "hover" | "shortcut";

function registerHoverToggleCommand(
  context: vscode.ExtensionContext,
  commandId: string,
  hoverSession: ReturnType<typeof createHoverSession>,
  updateState: (expanded: boolean) => void
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      commandId,
      async (
        uri?: string,
        line?: number,
        character?: number,
        expanded?: boolean
      ) => {
        const parsed = parseHoverToggleArgs(uri, line, character, expanded);
        const target = hoverSession.getTarget();
        if (
          !parsed ||
          !target ||
          target.uri !== parsed.uri ||
          target.anchorLine !== parsed.line ||
          target.anchorCharacter !== parsed.character
        ) {
          return;
        }

        updateState(parsed.expanded);
        await refreshHover(target, hoverSession);
      }
    )
  );
}

/**
 * 读取当前翻译模式配置
 */
function getTranslationMode(): TranslationMode {
  const config = vscode.workspace.getConfiguration("translateDict");
  return config.get<TranslationMode>("translationMode", "hover");
}

function toHover(
  originalTextMarkdown: string,
  dictionaryMarkdown: string,
  uri: string,
  query: HoverQuery,
  state: HoverSessionState
): vscode.Hover {
  const markdown = new vscode.MarkdownString(
    wrapHoverMarkdown(
      originalTextMarkdown,
      dictionaryMarkdown,
      state,
      {
        uri,
        line: query.anchor.line,
        character: query.anchor.character,
      }
    ) + MARKDOWN_FOOTER
  );
  markdown.isTrusted = {
    enabledCommands: [
      TOGGLE_HOVER_EXPANDED_COMMAND,
      TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
    ],
  };
  return new vscode.Hover(markdown, query.range);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * VS Code 没有原地更新 hover 的公开 API。命令链接点击后只隐藏并重新展示，
 * 连续点击由 hoverRefreshSeq 保证只应用最后一次状态。
 */
async function refreshHover(
  target: HoverSessionTarget,
  hoverSession: ReturnType<typeof createHoverSession>
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.toString() !== target.uri) {
    return;
  }

  const document = editor.document;
  const anchor = new vscode.Position(
    target.anchorLine,
    target.anchorCharacter
  );
  let lineLength = 0;
  try {
    lineLength = document.lineAt(anchor.line).range.end.character;
  } catch {
    return;
  }
  if (
    !isPositionInDocument(
      anchor.line,
      anchor.character,
      document.lineCount,
      lineLength
    )
  ) {
    return;
  }

  const range = new vscode.Range(
    target.range.startLine,
    target.range.startCharacter,
    target.range.endLine,
    target.range.endCharacter
  );
  const seq = ++hoverRefreshSeq;
  hoverSession.lockTarget();
  const allowShortcut = getTranslationMode() === "shortcut";
  if (allowShortcut) {
    shortcutTriggered = true;
  }

  try {
    if (target.kind === "selection") {
      editor.selection = new vscode.Selection(range.end, range.start);
    } else {
      editor.selection = new vscode.Selection(anchor, anchor);
    }
    editor.revealRange(range, vscode.TextEditorRevealType.Default);

    try {
      await vscode.commands.executeCommand("editor.action.hideHover");
    } catch {
      // ignore
    }

    if (seq !== hoverRefreshSeq) {
      return;
    }
    await sleep(0);
    if (seq !== hoverRefreshSeq) {
      return;
    }

    await vscode.commands.executeCommand("editor.action.showHover", {
      focus: true,
    });
  } finally {
    if (seq === hoverRefreshSeq) {
      hoverSession.unlockTarget();
      if (allowShortcut) {
        shortcutTriggered = false;
      }
    }
  }
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
 * 规范化文件扩展名，统一为小写且不含点号
 */
function normalizeFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return "";
  }
  return fileName.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * 将配置中的扩展名列表规范化为小写
 */
function normalizeExtensionList(extensions: string[]): string[] {
  return extensions.map((ext) => ext.replace(/^\./, "").toLowerCase());
}

async function fetchLatestOnlineTranslation(
  word: string,
  apis: OnlineTranslateApi[],
  direction: "en-zh" | "zh-en",
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

/**
 * 初始化翻译插件
 */
export function init(context?: vscode.ExtensionContext): void {
  const hoverSession = createHoverSession();

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

    registerHoverToggleCommand(
      context,
      TOGGLE_HOVER_EXPANDED_COMMAND,
      hoverSession,
      (expanded) => hoverSession.setDictionaryExpanded(expanded)
    );

    registerHoverToggleCommand(
      context,
      TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
      hoverSession,
      (expanded) => hoverSession.setOriginalTextExpanded(expanded)
    );
  }

  const hoverProvider = vscode.languages.registerHoverProvider("*", {
    async provideHover(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken
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
      const includeFileExtensions = normalizeExtensionList(
        config.get<string[]>("includeFileExtensions", [])
      );
      const excludeFileExtensions = normalizeExtensionList(
        config.get<string[]>("excludeFileExtensions", [])
      );
      const chineseToEnglishMaxResults = config.get<number>(
        "chineseToEnglishMaxResults",
        10
      );
      const enableOnlineFallback = config.get<boolean>(
        "enableOnlineFallback",
        false
      );

      // 获取当前文件的扩展名（不含点号，统一小写）
      const fileExtension = normalizeFileExtension(document.fileName);

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
      const query = resolveHoverQuery(document, position, activeSelection);
      if (!query) {
        return;
      }

      const uri = document.uri.toString();
      const sessionTarget: HoverSessionTarget = {
        uri,
        kind: query.kind,
        anchorLine: query.anchor.line,
        anchorCharacter: query.anchor.character,
        range: {
          startLine: query.range.start.line,
          startCharacter: query.range.start.character,
          endLine: query.range.end.line,
          endCharacter: query.range.end.character,
        },
      };
      const hoverState = hoverSession.ensureTarget(sessionTarget);

      const word = query.text;
      const isSelectWord = query.kind === "selection";

      const originText = word.replace(/"/g, "");

      // 根据是否包含中文显示不同的标题
      const isChinese = containsChinese(originText);

      // 仅翻译 selected 的中文
      if (isChinese && !isSelectWord) {
        return;
      }

      const headerText = buildOriginalTextMarkdown(
        isChinese ? "中译英" : "翻译",
        originText
      );

      // 中译英：只执行一次 reverseQuery
      if (isChinese) {
        const reverseResults = reverseQuery(
          originText,
          chineseToEnglishMaxResults
        );

        if (reverseResults.length > 0) {
          const wordsMarkdown =
            convertReverseResultsToMarkdown(reverseResults);
          return toHover(
            headerText,
            wordsMarkdown,
            uri,
            query,
            hoverState
          );
        }

        if (enableOnlineFallback) {
          const apis = getOnlineFallbackApis(config);
          const online = await fetchLatestOnlineTranslation(
            originText,
            apis,
            "zh-en",
            token
          );
          if (token.isCancellationRequested) {
            return;
          }
          if (online) {
            const onlineMarkdown =
              `- ${online.translation}` +
              MARKDOWN_LINE +
              `*${getApiLabel(online.source)}*`;
            return toHover(
              headerText,
              onlineMarkdown,
              uri,
              query,
              hoverState
            );
          }
        }

        const platformLinks = generatePlatformLinks(originText);
        const emptyMarkdown = `- 本地词库暂无匹配的英文单词${
          platformLinks ? ` , 查看 ${platformLinks}` : ""
        }`;
        return toHover(
          headerText,
          emptyMarkdown,
          uri,
          query,
          hoverState
        );
      }

      // 英译中：只执行一次 parseAndQuery
      const queryResults = parseAndQuery(word);
      const hasLocalResult = queryResults.some((r) => r.result !== undefined);

      if (hasLocalResult) {
        const wordsMarkdown = convertQueryResultsToMarkdown(queryResults);
        if (!wordsMarkdown) {
          return;
        }
        return toHover(
          headerText,
          wordsMarkdown,
          uri,
          query,
          hoverState
        );
      }

      if (enableOnlineFallback) {
        const apis = getOnlineFallbackApis(config);
        const online = await fetchLatestOnlineTranslation(
          originText,
          apis,
          "en-zh",
          token
        );
        if (token.isCancellationRequested) {
          return;
        }
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
            query,
            hoverState
          );
        }
      }

      const wordsMarkdown = convertQueryResultsToMarkdown(queryResults);
      if (!wordsMarkdown) {
        return;
      }

      return toHover(headerText, wordsMarkdown, uri, query, hoverState);
    },
  });

  context?.subscriptions.push(hoverProvider);
}
