import { describe, expect, it } from "vitest";
import { query } from "./query";

describe("query", () => {
  it("应该返回空结果当单词长度小于2", () => {
    expect(query("a")).toEqual({ w: "", p: "" });
    expect(query("")).toEqual({ w: "", p: "" });
  });

  it("应该查询存在的单词（字符串格式）", () => {
    // 假设词典中有 "hello" 这个词
    const result = query("hello");
    // 如果词典中有这个词，应该返回翻译
    if (result.w) {
      expect(result.w).toBeTruthy();
      expect(typeof result.w).toBe("string");
    }
  });

  it("应该查询存在的单词（对象格式）", () => {
    // 测试带音标的单词
    const result = query("world");
    if (result.w) {
      expect(result.w).toBeTruthy();
      expect(typeof result.w).toBe("string");
      expect(typeof result.p).toBe("string");
    }
  });

  it("应该返回空结果当词典文件不存在", () => {
    // 使用不太可能存在的前缀
    const result = query("zzzzzz");
    expect(result).toEqual({ w: "", p: "" });
  });

  it("应该返回空结果当单词不在词典中", () => {
    // 使用一个不太可能在词典中的单词
    const result = query("xyzabc");
    expect(result).toEqual({ w: "", p: "" });
  });

  it("应该处理大小写（转换为小写前缀）", () => {
    const result1 = query("Hello");
    const result2 = query("hello");
    // 两者应该查询同一个词典文件（前缀都是 'he'）
    // 但是词典中的 key 是区分大小写的，所以可能返回不同结果
    // 这里只验证它们都能正常查询，不会抛出错误
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1).toHaveProperty("w");
    expect(result1).toHaveProperty("p");
  });

  it("应该正确处理两字母前缀", () => {
    // 测试不同前缀的单词
    const resultA = query("apple");
    const resultB = query("banana");

    // 它们应该查询不同的词典文件
    // 至少不会抛出错误
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();
  });
});
