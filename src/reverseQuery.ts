import { resolve } from "path";
import type { DictData, DictEntry } from "./types";
import { createCache } from "./utils/cache";

const REVERSE_QUERY_CACHE_MAX_ENTRIES = 50;

type ReverseQueryResult = {
  word: string;
  translation: string;
  phonetic?: string;
};

const reverseQueryCache = createCache<string, ReverseQueryResult[]>({
  maxEntries: REVERSE_QUERY_CACHE_MAX_ENTRIES,
});

/**
 * 清空反向查询缓存
 */
export function clearReverseQueryCache(): void {
  reverseQueryCache.clear();
}

/**
 * 检测文本是否为纯中文（包含中文且不包含英文单词）
 */
export function containsChinese(text: string): boolean {
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  return hasChinese && !hasEnglish;
}

/**
 * 计算匹配度分数
 * @param translation 翻译文本
 * @param searchText 搜索文本
 * @returns 分数越高，匹配度越好
 */
function calculateMatchScore(translation: string, searchText: string): number {
  // 完全匹配（整个翻译就是搜索词）得分最高
  if (translation === searchText) {
    return 1000;
  }

  // 搜索词是翻译中的独立词（用分隔符分隔）
  // 常见分隔符：；;、，,空格换行，以及 "n." "v." "adj." 等词性标记后
  const separators = /[；;、，,\s\n.]+/;
  const parts = translation.split(separators).filter(Boolean);
  const exactMatchIndex = parts.findIndex((part) => part === searchText);
  if (exactMatchIndex !== -1) {
    // 独立词完全匹配，越靠前分数越高
    return 900 - exactMatchIndex * 5;
  }

  // 翻译以搜索词开头（如：搜索"项目"，翻译是"项目管理"）
  if (translation.startsWith(searchText)) {
    // 根据搜索词占翻译的比例给分，比例越高分数越高
    const ratio = searchText.length / translation.length;
    return 700 + ratio * 100;
  }

  // 部分匹配：搜索词在翻译中间
  const index = translation.indexOf(searchText);
  if (index !== -1) {
    // 根据位置和长度比例计算分数
    const lengthRatio = searchText.length / translation.length;
    // 位置越靠前、占比越大，分数越高
    const positionPenalty = Math.min(index * 2, 100);
    return 500 + lengthRatio * 100 - positionPenalty;
  }

  return 0;
}

interface MatchResult {
  word: string;
  translation: string;
  phonetic?: string;
  score: number;
}

/**
 * 反向查询：根据中文翻译查找英文单词
 * @param chineseText 中文文本
 * @param maxResults 最大返回结果数，默认10
 */
export function reverseQuery(
  chineseText: string,
  maxResults: number = 10
): ReverseQueryResult[] {
  const cleanedText = chineseText.trim();

  if (!cleanedText || !containsChinese(cleanedText)) {
    return [];
  }

  const cacheKey = `${maxResults}\u0000${cleanedText}`;
  const cached = reverseQueryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const matchResults: MatchResult[] = [];

  // 遍历所有词典文件（aa-zz）
  const prefixes = generatePrefixes();

  for (const prefix of prefixes) {
    try {
      const dictPath = resolve(__dirname, `dict/${prefix}.json`);
      const dict: DictData = require(dictPath);

      // 遍历词典中的每个条目
      for (const [key, value] of Object.entries(dict)) {
        let entry: DictEntry | null = null;

        if (typeof value === "string") {
          entry = { w: key, p: "", t: value };
        } else if (typeof value === "object" && value.w && value.t) {
          entry = value;
        }

        if (entry && entry.t) {
          // 检查翻译中是否包含搜索的中文文本
          if (entry.t.includes(cleanedText)) {
            const score = calculateMatchScore(entry.t, cleanedText);
            matchResults.push({
              word: entry.w,
              translation: entry.t,
              phonetic: entry.p,
              score,
            });
          }
        }
      }
    } catch {
      // 词典文件不存在或读取失败，继续下一个
      continue;
    }
  }

  // 按分数降序排序，分数相同时按单词字母顺序
  matchResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.word.localeCompare(b.word);
  });

  // 返回前 maxResults 个结果，去掉 score 字段
  const results = matchResults
    .slice(0, maxResults)
    .map(({ word, translation, phonetic }) => ({
      word,
      translation,
      phonetic,
    }));

  reverseQueryCache.set(cacheKey, results);
  return results;
}

/**
 * 生成所有可能的两字母前缀（aa-zz）
 */
function generatePrefixes(): string[] {
  const prefixes: string[] = [];
  const letters = "abcdefghijklmnopqrstuvwxyz";

  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      prefixes.push(letters[i] + letters[j]);
    }
  }

  return prefixes;
}
