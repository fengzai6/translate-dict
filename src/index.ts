import * as vscode from "vscode";
import { MARKDOWN_FOOTER, MARKDOWN_HEADER } from "./constants";
import { containsChinese } from "./reverseQuery";
import { convertToMarkdown } from "./utils/convert";

// 全局翻译开关状态
let translationEnabled = true;

// 快捷键触发标志（shortcut 模式下用于控制 hover provider）
let shortcutTriggered = false;

type TranslationMode = "hover" | "shortcut";

/**
 * 读取当前翻译模式配置
 */
function getTranslationMode(): TranslationMode {
  const config = vscode.workspace.getConfiguration("translateDict");
  return config.get<TranslationMode>("translationMode", "hover");
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
          await vscode.commands.executeCommand("editor.action.showHover");
          shortcutTriggered = false;
        }
      )
    );
  }

  vscode.languages.registerHoverProvider("*", {
    provideHover(
      document: vscode.TextDocument,
      position: vscode.Position
    ): vscode.Hover | undefined {
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

      const wordRange = document.getWordRangeAtPosition(position);

      if (!wordRange) {
        return;
      }

      let word = document.getText(wordRange);
      let isSelectWord = false;

      const selectText = vscode.window.activeTextEditor?.document.getText(
        vscode.window.activeTextEditor.selection
      );

      // 如果有选中文本用选中文本
      if (
        selectText &&
        (selectText.includes(word) || word.includes(selectText))
      ) {
        word = selectText;
        isSelectWord = true;
      }

      const originText = word.replace(/"/g, "");

      // 根据是否包含中文显示不同的标题
      const isChinese = containsChinese(originText);

      // 仅翻译 selected 的中文
      if (isChinese && !isSelectWord) {
        return;
      }

      const wordsMarkdown = convertToMarkdown(word, chineseToEnglishMaxResults);

      const headerText = isChinese
        ? `中译英 \`${originText}\` :  \n`
        : MARKDOWN_HEADER.replace("$word", originText);
      const hoverText = headerText + wordsMarkdown + MARKDOWN_FOOTER;

      return new vscode.Hover(hoverText);
    },
  });
}
