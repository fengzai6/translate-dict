import { MARKDOWN_LINE } from "../constants";
import { containsChinese, reverseQuery } from "../reverseQuery";
import { DictResult } from "../types";
import { parseAndQuery } from "./format";
import { generatePlatformLinks, getDefaultPlatformUrl } from "./platform";

/**
 * 生成 Markdown 格式的翻译结果
 */
function genMarkdown(
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

  const phoneticText = phonetic ? `*/${phonetic}/*` : "";
  return `- [${word}](${defaultUrl}) ${phoneticText}:  
${translation?.replace(/\\n/g, `  \n`)}`;
}

/**
 * 测试用：返回查询结果数组
 */
export const queryWordsForTest = (word: string): DictResult[] => {
  return parseAndQuery(word).map((item) => item.result);
};

/**
 * 生成中译英的 Markdown 结果
 */
function genChineseToEnglishMarkdown(
  results: Array<{ word: string; translation: string; phonetic?: string }>
): string {
  if (results.length === 0) {
    return "- 本地词库暂无匹配的英文单词";
  }

  return results
    .map((item, index) => {
      const defaultUrl = getDefaultPlatformUrl(item.word);
      const phoneticText = item.phonetic ? `*/${item.phonetic}/*` : "";
      const markdown = `- [${item.word}](${defaultUrl}) ${phoneticText}:  
${item.translation.replace(/\\n/g, `  \n`)}`;
      return index === 0 ? markdown : MARKDOWN_LINE + markdown;
    })
    .join("");
}

/**
 * 转换为 Markdown 格式
 */
export const convertToMarkdown = (
  word: string,
  maxResults: number = 10
): string => {
  // 检测是否包含中文，如果是则进行中译英
  if (containsChinese(word)) {
    const reverseResults = reverseQuery(word, maxResults);

    if (reverseResults.length === 0) {
      // 中译英没有结果时，显示所有翻译平台链接
      const platformLinks = generatePlatformLinks(word);
      return `- 本地词库暂无匹配的英文单词${platformLinks ? ` , 查看 ${platformLinks}` : ""}`;
    }

    return genChineseToEnglishMarkdown(reverseResults);
  }

  // 原有的英译中逻辑
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
