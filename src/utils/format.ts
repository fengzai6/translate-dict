import { findInDict, loadDict } from "../query";
import type { DictResult } from "../types";

// ============================================
// 词典查询
// ============================================

function isWordInDict(word: string): boolean {
  if (word.length < 2) return false;
  const dict = loadDict(word);
  if (!dict) return false;
  return findInDict(word, dict) !== null;
}

function queryWord(word: string): DictResult {
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

// ============================================
// 核心拆分逻辑
// ============================================

/**
 * 智能拆分：优先保留词典中存在的完整词组
 */
function splitByCase(str: string): string[] {
  // 先检查完整字符串是否在词典中（支持带连字符的词）
  if (isWordInDict(str)) {
    return [str];
  }

  // 按连字符、下划线、空格拆分
  const parts = str.split(/[-_\s]+/).filter(Boolean);
  const result: string[] = [];

  for (const part of parts) {
    const matches = part.match(/[A-Z]+(?=[A-Z][a-z]|$)|[A-Z][a-z]*|[a-z]+/g);
    if (matches) {
      result.push(...matches);
    }
  }

  return result;
}

function splitCompoundWord(word: string): string[] {
  const lowerWord = word.toLowerCase();

  if (isWordInDict(lowerWord)) {
    return [word];
  }

  for (let i = 1; i <= lowerWord.length - 2; i++) {
    const firstPart = lowerWord.slice(0, i);
    const secondPart = lowerWord.slice(i);

    const firstValid =
      i === 1 ? /^[ai]$/.test(firstPart) : isWordInDict(firstPart);

    if (firstValid && isWordInDict(secondPart)) {
      const originalFirst = word.slice(0, i);
      const originalSecond = word.slice(i);
      return [originalFirst, ...splitCompoundWord(originalSecond)];
    }
  }

  return [word];
}

function uniqueIgnoreCase(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const lower = item.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

// ============================================
// 导出
// ============================================

export interface WordQueryResult {
  word: string;
  result: DictResult;
}

/**
 * 拆分并查询单词
 */
export function parseAndQuery(character: string): WordQueryResult[] {
  const cleaned = character.replace(/"/g, "").replace(/\d+/g, "");
  if (!cleaned) {
    return [];
  }

  const words = splitByCase(cleaned);
  const filtered = uniqueIgnoreCase(words.filter((w) => w.length > 1));

  const expanded: string[] = [];
  for (const word of filtered) {
    expanded.push(...splitCompoundWord(word));
  }

  const finalWords = uniqueIgnoreCase(expanded.filter((w) => w.length > 1));

  return finalWords.map((word) => ({
    word,
    result: queryWord(word),
  }));
}
