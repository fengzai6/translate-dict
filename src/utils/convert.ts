import { MARKDOWN_LINE } from "../constants";
import { DictResult } from "../types";
import { parseAndQuery } from "./format";

/**
 * 生成 Markdown 格式的翻译结果
 */
function genMarkdown(
  word: string,
  translation?: string,
  phonetic?: string
): string {
  const encodedWord = encodeURIComponent(word);
  if (!translation && !phonetic) {
    return `- [${word}](https://translate.google.com?text=${encodedWord}) :  
本地词库暂无结果 , 查看 [Google翻译](https://translate.google.com?text=${encodedWord}) [百度翻译](https://fanyi.baidu.com/#en/zh/${encodedWord})`;
  }

  const phoneticText = phonetic ? `*/${phonetic}/*` : "";
  return `- [${word}](https://translate.google.com?text=${encodedWord}) ${phoneticText}:  
${translation?.replace(/\\n/g, `  \n`)}`;
}

/**
 * 测试用：返回查询结果数组
 */
export const queryWordsForTest = (word: string): DictResult[] => {
  return parseAndQuery(word).map((item) => item.result);
};

/**
 * 转换为 Markdown 格式
 */
export const convertToMarkdown = (word: string): string => {
  const results = parseAndQuery(word);

  if (results.length === 0) {
    return "";
  }

  return results
    .map((item, index) => {
      const displayWord = item.result?.w ?? item.word;
      const markdown = genMarkdown(displayWord, item.result?.t, item.result?.p);
      return index === 0 ? markdown : MARKDOWN_LINE + markdown;
    })
    .join("");
};
