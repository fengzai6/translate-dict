import { afterEach, describe, expect, it } from "vitest";
import {
  clearReverseQueryCache,
  containsChinese,
  reverseQuery,
} from "../reverseQuery";

describe("reverseQuery", () => {
  afterEach(() => {
    clearReverseQueryCache();
  });

  describe("containsChinese", () => {
    it("应该检测到纯中文字符", () => {
      expect(containsChinese("你好")).toBe(true);
      expect(containsChinese("测试")).toBe(true);
      expect(containsChinese("中文")).toBe(true);
    });

    it("不应该检测到非中文字符", () => {
      expect(containsChinese("hello")).toBe(false);
      expect(containsChinese("123")).toBe(false);
      expect(containsChinese("test")).toBe(false);
    });

    it("中英混合文本应该返回false", () => {
      expect(containsChinese("hello世界")).toBe(false);
      expect(containsChinese("组件react")).toBe(false);
      expect(containsChinese("Vue组件")).toBe(false);
      expect(containsChinese("测试test")).toBe(false);
    });
  });

  describe("reverseQuery", () => {
    it("应该能够根据中文查找英文单词", () => {
      const results = reverseQuery("头", 5);
      expect(results.length).toBeGreaterThan(0);
      // 检查结果中是否包含与"头"相关的单词
      expect(results.some((r) => r.translation.includes("头"))).toBe(true);
    });

    it("应该能够查找包含特定中文的翻译", () => {
      const results = reverseQuery("男人", 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.translation.includes("男人"))).toBe(true);
    });

    it("对于非中文文本应该返回空数组", () => {
      const results = reverseQuery("hello", 5);
      expect(results.length).toBe(0);
    });

    it("应该限制返回结果数量", () => {
      const results = reverseQuery("的", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("应该优先返回完全匹配的结果", () => {
      const results = reverseQuery("男人", 10);
      if (results.length > 0) {
        // 第一个结果应该是完全匹配或以搜索词开头的
        const firstResult = results[0];
        const isExactMatch = firstResult.translation === "男人";
        const startsWithMatch = firstResult.translation.startsWith("男人");
        const hasExactInParts = firstResult.translation
          .split(/[；;、，,\s\n]/)
          .some((part) => part === "男人");

        expect(isExactMatch || startsWithMatch || hasExactInParts).toBe(true);
      }
    });

    it("完全匹配应该排在部分匹配之前", () => {
      const results = reverseQuery("人", 20);
      if (results.length >= 2) {
        // 找到完全匹配和部分匹配的索引
        const exactMatchIndex = results.findIndex(
          (r) =>
            r.translation === "人" ||
            r.translation.split(/[；;、，,\s\n]/).includes("人")
        );
        const partialMatchIndex = results.findIndex(
          (r) =>
            r.translation.includes("人") &&
            r.translation !== "人" &&
            !r.translation.split(/[；;、，,\s\n]/).includes("人")
        );

        // 如果两种匹配都存在，完全匹配应该在前面
        if (exactMatchIndex !== -1 && partialMatchIndex !== -1) {
          expect(exactMatchIndex).toBeLessThan(partialMatchIndex);
        }
      }
    });

    it("应该命中技术词汇的稳定结果", () => {
      const userResults = reverseQuery("用户", 5);
      expect(userResults.length).toBeGreaterThan(0);
      expect(userResults[0]).toMatchObject({
        word: "enduser",
        translation: "用户",
      });

      const serverResults = reverseQuery("服务器", 10);
      expect(serverResults.some((r) => r.word === "server")).toBe(true);
      expect(serverResults.some((r) => r.translation.includes("服务器"))).toBe(
        true
      );

      const networkResults = reverseQuery("网络", 10);
      expect(networkResults.some((r) => r.word === "network")).toBe(true);
      expect(networkResults.some((r) => r.translation.includes("网络"))).toBe(
        true
      );
    });

    it("应该优先返回完整短语匹配结果", () => {
      const results = reverseQuery("人工智能", 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toMatchObject({
        word: "artificial-intelligence",
        translation: "人工智能",
      });
      expect(results.some((r) => r.word === "AI")).toBe(true);
    });

    it("应该保留常见业务语义词的相关结果", () => {
      const serviceResults = reverseQuery("服务", 10);
      expect(serviceResults.some((r) => r.word === "service")).toBe(true);
      expect(serviceResults.some((r) => r.translation.includes("服务"))).toBe(
        true
      );

      const manageResults = reverseQuery("管理", 10);
      expect(manageResults.some((r) => r.word === "administer")).toBe(true);
      expect(manageResults.some((r) => r.translation.includes("管理"))).toBe(
        true
      );

      const itemResults = reverseQuery("项目", 10);
      expect(itemResults.some((r) => r.word === "item")).toBe(true);
      expect(itemResults.some((r) => r.translation.includes("项目"))).toBe(
        true
      );
    });

    it("相同查询应该复用缓存结果", () => {
      const first = reverseQuery("不存在的缓存测试词", 5);
      const second = reverseQuery("不存在的缓存测试词", 5);

      expect(second).toBe(first);
    });

    it("不同结果数量不应共享缓存", () => {
      const fiveResults = reverseQuery("用户", 5);
      const tenResults = reverseQuery("用户", 10);

      expect(tenResults).not.toBe(fiveResults);
      expect(fiveResults.length).toBeLessThanOrEqual(5);
      expect(tenResults.length).toBeLessThanOrEqual(10);
    });
  });
});
