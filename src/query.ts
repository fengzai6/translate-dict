import { resolve } from "path";
import type { DictData, DictResult } from "./types";
import { Cache, createCache } from "./utils/cache";

/**
 * 生成单词的各种大小写变体
 * 按优先级排序：原文 → 小写 → 首字母大写 → 首字母大写加点 → 缩写形式 → 全大写
 */
export function getWordVariants(word: string): string[] {
  const variants: string[] = [word];
  const lowerWord = word.toLowerCase();
  const upperWord = word.toUpperCase();
  const capitalizedWord =
    lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
  // 首字母大写加点（缩写形式），如 Ht -> Ht.
  const capitalizedWithDot = capitalizedWord + ".";

  if (lowerWord !== word) variants.push(lowerWord);
  if (capitalizedWord !== word && capitalizedWord !== lowerWord) {
    variants.push(capitalizedWord);
  }
  variants.push(capitalizedWithDot);
  if (upperWord !== word) variants.push(upperWord);

  return variants;
}

/**
 * 加载词典文件
 */
export function loadDict(word: string): DictData | null {
  if (word.length < 2) return null;

  try {
    const prefix = word.substring(0, 2).toLowerCase();
    const dictPath = resolve(__dirname, `dict/${prefix}.json`);
    return require(dictPath);
  } catch {
    return null;
  }
}

/**
 * 在词典中查找单词，返回匹配的变体
 */
export function findInDict(word: string, dict: DictData): string | null {
  const variants = getWordVariants(word);
  for (const variant of variants) {
    if (Object.prototype.hasOwnProperty.call(dict, variant)) {
      return variant;
    }
  }
  return null;
}

/**
 * 查询单词的词典结果
 */
export function queryDict(word: string): DictResult {
  if (word.length < 2) return undefined;

  const dict = loadDict(word);
  if (!dict) return undefined;

  const matchedVariant = findInDict(word, dict);
  if (!matchedVariant) return undefined;

  const entry = dict[matchedVariant];
  if (typeof entry === "object") {
    return entry;
  }

  return { w: matchedVariant, t: entry };
}

/**
 * 创建一次查询共享的词典缓存
 */
export function createQueryCache(): Cache<string, DictResult> {
  return createCache<string, DictResult>();
}

/**
 * 通过缓存查询单词的词典结果
 */
export function queryDictWithCache(
  word: string,
  cache: Cache<string, DictResult>
): DictResult {
  const cached = cache.get(word);
  if (cache.has(word)) {
    return cached;
  }

  const result = queryDict(word);
  cache.set(word, result);
  return result;
}

/**
 * 检查单词是否在词典中存在
 */
export function isWordInDict(word: string): boolean {
  return queryDict(word) !== undefined;
}
