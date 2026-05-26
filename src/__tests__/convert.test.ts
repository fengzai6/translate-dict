import { describe, expect, it } from "vitest";
import { queryWordsForTest } from "../utils/convert";

describe("queryWordsForTest", () => {
  it("应该返回单个单词的查询结果", () => {
    const results = queryWordsForTest("hello");
    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.w).toBe("hello");
    expect(results[0]?.t).toContain("喂");
  });

  it("应该处理驼峰命名并返回多个单词的查询结果", () => {
    const results = queryWordsForTest("helloWorld");
    // 应该拆分为 hello 和 world
    expect(results.length).toBe(2);
    expect(results[0]?.w).toBe("hello");
    expect(results[1]?.w).toBe("world");
  });

  it("应该处理帕斯卡命名", () => {
    const results = queryWordsForTest("HelloWorld");
    // 应该拆分为 hello 和 world
    expect(results.length).toBe(2);
    expect(results[0]?.w).toBe("hello");
    expect(results[1]?.w).toBe("world");
  });

  it("应该处理下划线分隔的单词", () => {
    const results = queryWordsForTest("hello_world");
    // 应该拆分为 hello 和 world
    expect(results.length).toBe(2);
    expect(results[0]?.w).toBe("hello");
    expect(results[1]?.w).toBe("world");
  });

  it("应该清理引号", () => {
    const results = queryWordsForTest('"hello"');
    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.w).toBe("hello");
  });

  it("应该处理全大写单词", () => {
    const results = queryWordsForTest("HTTP");
    expect(results).toHaveLength(1);
    expect(results[0]).toBeDefined();
    expect(results[0]?.w).toBe("HTTP");
    expect(results[0]?.t).toBeTruthy();
  });

  it("应该处理单字母前缀（如 IUser）", () => {
    const results = queryWordsForTest("IUser");
    // 单字母 I 被过滤，只返回 user
    expect(results.length).toBe(1);
    expect(results[0]?.w).toBe("user");
    expect(results[0]?.t).toBeTruthy();
  });

  it("应该处理组合词（如 audioinput）", () => {
    const results = queryWordsForTest("audioinput");
    // 应该拆分为 audio 和 input
    expect(results.length).toBe(2);
    expect(results[0]?.w).toBe("audio");
    expect(results[1]?.w).toBe("input");
  });

  it("应该尽量拆分未知长串中的可识别单词", () => {
    const results = queryWordsForTest("notexistword");
    expect(results.length).toBeGreaterThan(1);
    expect(results[0]?.w).toBe("not");
    expect(results.some((item) => item?.w === "word")).toBe(true);
  });

  it("应该处理空字符串", () => {
    const results = queryWordsForTest("");
    expect(results).toHaveLength(0);
  });

  it("应该处理多个组合词", () => {
    const results = queryWordsForTest("getUserName");
    // 应该拆分为 get, user, name
    expect(results.length).toBe(3);
    expect(results[0]?.w).toBe("get");
    expect(results[1]?.w).toBe("user");
    expect(results[2]?.w).toBe("name");
  });

  it("应该去重重复的单词", () => {
    const results = queryWordsForTest("testTest");
    // 应该只返回一个 test
    expect(results).toHaveLength(1);
    expect(results[0]?.w).toBe("test");
  });

  it("应该处理连续大写字母", () => {
    const results = queryWordsForTest("HTTPServer");
    // 应该拆分为 http 和 server
    expect(results.length).toBe(2);
    expect(results[0]?.w).toBe("HTTP");
    expect(results[0]?.t).toBeTruthy();
    expect(results[1]?.w).toBe("server");
    expect(results[1]?.t).toBeTruthy();
  });

  it("应该处理单字母单词", () => {
    const results = queryWordsForTest("a");
    // 单字母被过滤，返回空数组
    expect(results).toHaveLength(0);
  });

  it("应该返回正确的结果数组结构", () => {
    const results = queryWordsForTest("hello");
    expect(Array.isArray(results)).toBe(true);
    expect(results[0]).toHaveProperty("w");
    expect(results[0]).toHaveProperty("t");
  });

  it("应该处理包含数字的变量名", () => {
    const results = queryWordsForTest("user123");
    // 数字会被移除，只保留 user
    expect(results.length).toBe(1);
    expect(results[0]?.w).toBe("user");
    expect(results[0]?.t).toBeTruthy();
  });

  it("应该处理复杂的驼峰命名", () => {
    const results = queryWordsForTest("getUserByIdAndName");
    // 应该拆分为 get, user, by, id, and, name
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results[0]?.w).toBe("get");
    expect(results[1]?.w).toBe("user");
  });

  it("应该处理多个技术缩写和普通单词混合的命名", () => {
    const results = queryWordsForTest("getURLForHTTPAPI");
    expect(results.length).toBe(5);
    expect(results[0]?.w).toBe("get");
    expect(results[1]?.w).toBe("URL");
    expect(results[2]?.w).toBe("for");
    expect(results[3]?.w).toBe("HTTP");
  });

  it("应该处理接口前缀加 DTO 的业务命名", () => {
    const results = queryWordsForTest("IUserDTOService");
    expect(results.length).toBe(3);
    expect(results[0]?.w).toBe("user");
    expect(results[1]).toBeUndefined();
    expect(results[2]?.w).toBe("service");
  });

  it("应该优先保留已知的完整全小写单词", () => {
    const results = queryWordsForTest("superuserprofilemanager");
    expect(results.length).toBe(3);
    expect(results[0]?.w).toBe("superuser");
    expect(results[1]?.w).toBe("profile");
    expect(results[2]?.w).toBe("manager");
  });

  it("应该尽量保留未知长串中的已知后缀单词", () => {
    const results = queryWordsForTest("notexistwordmanager");
    expect(results.length).toBe(4);
    expect(results[0]?.w).toBe("not");
    expect(results[1]?.w).toBe("exist");
    expect(results[2]?.w).toBe("word");
    expect(results[3]?.w).toBe("manager");
  });

  it("应该处理带音标的单词", () => {
    const results = queryWordsForTest("world");
    expect(results).toHaveLength(1);
    expect(results[0]?.w).toBe("world");
    expect(results[0]?.p).toBe("wә:ld");
    expect(results[0]?.t).toContain("世界");
  });

  it("应该处理女性相关单词", () => {
    const results = queryWordsForTest("woman");
    expect(results).toHaveLength(1);
    expect(results[0]?.w).toBe("woman");
    expect(results[0]?.t).toContain("女人");
  });
});
