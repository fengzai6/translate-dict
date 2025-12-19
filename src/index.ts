import * as vscode from "vscode";
import { MARKDOWN_FOOTER, MARKDOWN_HEADER } from "./constants";
import { convertToMarkdown } from "./utils/convert";

// 全局翻译开关状态
let translationEnabled = true;

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

      const selectText = vscode.window.activeTextEditor?.document.getText(
        vscode.window.activeTextEditor.selection
      );

      // 如果有选中文本用选中文本
      if (
        selectText &&
        (selectText.includes(word) || word.includes(selectText))
      ) {
        word = selectText;
      }

      const originText = word.replace(/"/g, "");
      const wordsMarkdown = convertToMarkdown(word);

      const header = MARKDOWN_HEADER.replace("$word", originText);
      const hoverText = header + wordsMarkdown + MARKDOWN_FOOTER;

      return new vscode.Hover(hoverText);
    },
  });
}
