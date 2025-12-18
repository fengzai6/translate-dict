import * as vscode from "vscode";
import { cleanWord, getWordArray } from "./format";
import { query } from "./query";

const MARKDOWN_HEADER = `翻译 \`$word\` :  
`;
const MARKDOWN_FOOTER = `  
`;
const MARKDOWN_LINE = `  
*****
`;

// 全局翻译开关状态
let translationEnabled = true;

/**
 * 生成 Markdown 格式的翻译结果
 * @param word 单词
 * @param translation 翻译内容
 * @param phonetic 音标
 * @returns Markdown 格式的字符串
 */
function genMarkdown(
  word: string,
  translation: string,
  phonetic: string
): string {
  if (!translation && !phonetic) {
    return `- [${word}](https://translate.google.com?text=${word}) :  
本地词库暂无结果 , 查看 [Google翻译](https://translate.google.com?text=${word}) [百度翻译](https://fanyi.baidu.com/#en/zh/${word})`;
  }

  const phoneticText = phonetic ? `*/${phonetic}/*` : "";
  return `- [${word}](https://translate.google.com?text=${word}) ${phoneticText}:  
${translation.replace(
  /\\n/g,
  `  
`
)}`;
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

      // 如果有选中文本且当前单词包含选中文本，使用选中文本
      if (selectText && word.includes(selectText)) {
        word = selectText;
      }

      const originText = cleanWord(word);
      const words = getWordArray(cleanWord(word));
      let hoverText = "";

      for (let i = 0; i < words.length; i++) {
        const currentWord = words[i];
        const result = query(currentWord);

        if (i === 0) {
          hoverText += genMarkdown(currentWord, result.w, result.p);
        } else {
          hoverText +=
            MARKDOWN_LINE + genMarkdown(currentWord, result.w, result.p);
        }
      }

      const header = MARKDOWN_HEADER.replace("$word", originText);
      hoverText = header + hoverText + MARKDOWN_FOOTER;

      return new vscode.Hover(hoverText);
    },
  });
}
