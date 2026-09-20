import { createQueryCache, queryDictWithCache } from "../query";
import type { DictResult } from "../types";
import type { Cache } from "./cache";

type QueryCache = Cache<string, DictResult>;

function queryWord(word: string, cache: QueryCache): DictResult {
  return queryDictWithCache(word, cache);
}

// ============================================
// 核心拆分逻辑
// ============================================

/**
 * 智能拆分：优先保留词典中存在的完整词组
 */
function splitByCase(str: string, cache: QueryCache): string[] {
  // 先检查完整字符串是否在词典中（支持带连字符的词）
  if (queryWord(str, cache) !== undefined) {
    return [str];
  }

  // 按连字符、下划线、空格拆分
  const parts = str.split(/[-_\s]+/).filter(Boolean);
  const result: string[] = [];

  for (const part of parts) {
    const matches = part.match(/[A-Z]+(?=[A-Z][a-z]|$)|[A-Z][a-z]*|[a-z]+/g);
    if (matches) {
      for (const match of matches) {
        if (/^I[A-Z]{2,}$/.test(match)) {
          result.push("I", match.slice(1));
        } else if (/^[A-Z]{4,}$/.test(match)) {
          result.push(...splitUppercaseAbbreviationChain(match, cache));
        } else {
          result.push(match);
        }
      }
    }
  }

  return result;
}

function splitCompoundWord(word: string, cache: QueryCache): string[] {
  const lowerWord = word.toLowerCase();

  if (queryWord(lowerWord, cache) !== undefined) {
    return [word];
  }

  return findBestCompoundSplit(word, cache);
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

interface SplitCandidate {
  parts: string[];
  score: number;
}

function isAllowedSingleCharacter(part: string): boolean {
  return /^[ai]$/i.test(part);
}

function isTechnicalAbbreviation(part: string): boolean {
  return /^[A-Z]{2,}$/.test(part);
}

function normalizeSplitPart(part: string): string {
  return part.toLowerCase();
}

function scoreSplitParts(parts: string[], cache: QueryCache): number {
  let score = 0;

  score -= parts.length * 24;

  for (const part of parts) {
    const normalizedPart = normalizeSplitPart(part);
    const dictResult =
      queryWord(part, cache) ?? queryWord(normalizedPart, cache);

    if (dictResult) {
      score += 60 + Math.min(normalizedPart.length * 8, 96);
    } else if (isAllowedSingleCharacter(part)) {
      score -= 20;
    } else {
      score -= 120;
    }

    if (isTechnicalAbbreviation(part)) {
      score += 18;
    }

    if (part.length === 1 && !isAllowedSingleCharacter(part)) {
      score -= 80;
    }

    if (part.length === 2) {
      score -= 36;
    }

    if (part.length === 3) {
      score -= 12;
    }
  }

  return score;
}

function buildSplitCandidate(
  parts: string[],
  cache: QueryCache
): SplitCandidate {
  return {
    parts,
    score: scoreSplitParts(parts, cache),
  };
}

function buildLowercaseSplitCandidate(
  parts: string[],
  cache: QueryCache
): SplitCandidate {
  let score = 0;

  for (const part of parts) {
    if (part.length === 1) {
      score -= isAllowedSingleCharacter(part) ? 20 : 200;
      continue;
    }

    score += part.length * part.length * 10;
  }

  score -= parts.length * 25;
  score += scoreSplitParts(parts, cache);

  return {
    parts,
    score,
  };
}

function splitUppercaseAbbreviationChain(
  word: string,
  cache: QueryCache
): string[] {
  if (queryWord(word, cache) !== undefined) {
    return [word];
  }

  for (let i = word.length - 2; i >= 2; i--) {
    const firstPart = word.slice(0, i);
    const secondPart = word.slice(i);

    if (queryWord(firstPart, cache) === undefined) {
      continue;
    }

    const secondParts = splitCompoundWord(secondPart, cache);
    if (
      secondParts.length === 1 &&
      secondParts[0] === secondPart &&
      queryWord(secondPart, cache) === undefined
    ) {
      continue;
    }

    return [firstPart, ...secondParts];
  }

  return [word];
}

function pickBetterCandidate(
  current: SplitCandidate | null,
  candidate: SplitCandidate
): SplitCandidate {
  if (!current) {
    return candidate;
  }

  if (candidate.score !== current.score) {
    return candidate.score > current.score ? candidate : current;
  }

  if (candidate.parts.length !== current.parts.length) {
    return candidate.parts.length < current.parts.length ? candidate : current;
  }

  const candidateLongest = Math.max(
    ...candidate.parts.map((part) => part.length)
  );
  const currentLongest = Math.max(...current.parts.map((part) => part.length));

  return candidateLongest > currentLongest ? candidate : current;
}

function splitLowercaseCompoundWord(word: string, cache: QueryCache): string[] {
  const memo = new Map<number, SplitCandidate | null>();
  const lowerWord = word.toLowerCase();

  const search = (start: number): SplitCandidate | null => {
    if (start === lowerWord.length) {
      return buildSplitCandidate([], cache);
    }

    if (memo.has(start)) {
      return memo.get(start) ?? null;
    }

    let bestCandidate: SplitCandidate | null = null;

    for (let end = start + 1; end <= lowerWord.length; end++) {
      const part = lowerWord.slice(start, end);
      const isDictionaryWord =
        part.length > 1 && queryWord(part, cache) !== undefined;
      const isSingleCharacter =
        part.length === 1 && isAllowedSingleCharacter(part);

      if (!isDictionaryWord && !isSingleCharacter) {
        continue;
      }

      const restCandidate = search(end);
      if (!restCandidate) {
        continue;
      }

      const candidate = buildLowercaseSplitCandidate(
        [word.slice(start, end), ...restCandidate.parts],
        cache
      );
      bestCandidate = pickBetterCandidate(bestCandidate, candidate);
    }

    memo.set(start, bestCandidate);
    return bestCandidate;
  };

  return search(0)?.parts ?? [word];
}

function normalizeLeadingInterfacePrefix(parts: string[]): string[] {
  if (parts.length < 2) {
    return parts;
  }

  if (parts[0] !== "I") {
    return parts;
  }

  if (!isTechnicalAbbreviation(parts[1])) {
    return parts;
  }

  return [parts[1], ...parts.slice(2)];
}

function findBestCompoundSplit(word: string, cache: QueryCache): string[] {
  if (/^[A-Z]{4,}$/.test(word)) {
    return splitUppercaseAbbreviationChain(word, cache);
  }

  if (/^[a-z]+$/.test(word)) {
    return splitLowercaseCompoundWord(word, cache);
  }

  let bestCandidate = buildSplitCandidate([word], cache);
  const lowerWord = word.toLowerCase();

  for (let i = 1; i <= lowerWord.length - 2; i++) {
    const firstPart = lowerWord.slice(0, i);
    const secondPart = word.slice(i);

    const firstValid =
      i === 1
        ? isAllowedSingleCharacter(firstPart)
        : queryWord(firstPart, cache) !== undefined;

    if (!firstValid) {
      continue;
    }

    const secondParts = normalizeLeadingInterfacePrefix(
      splitCompoundWord(secondPart, cache)
    );
    const candidate = buildSplitCandidate(
      [word.slice(0, i), ...secondParts],
      cache
    );
    bestCandidate = pickBetterCandidate(bestCandidate, candidate);
  }

  return normalizeLeadingInterfacePrefix(bestCandidate.parts);
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
  const cache = createQueryCache();
  const cleaned = character
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/"/g, "")
    .replace(/\d+/g, " ");
  if (!cleaned) {
    return [];
  }

  const words = splitByCase(cleaned, cache);
  const filtered = uniqueIgnoreCase(words.filter((w) => w.length > 1));

  const expanded: string[] = [];
  for (const word of filtered) {
    expanded.push(...splitCompoundWord(word, cache));
  }

  const finalWords = uniqueIgnoreCase(expanded.filter((w) => w.length > 1));

  return finalWords.map((word) => ({
    word,
    result: queryWord(word, cache),
  }));
}
