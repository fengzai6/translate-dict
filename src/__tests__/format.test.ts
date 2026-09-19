import { describe, expect, it } from "vitest";
import { parseAndQuery } from "../utils/format";

describe("format", () => {
  describe("parseAndQuery", () => {
    it("应该拆分驼峰命名，保留原始大小写", () => {
      const results = parseAndQuery("fooBar");
      expect(results.map((r) => r.word)).toEqual(["foo", "Bar"]);
    });

    it("应该拆分帕斯卡命名，保留原始大小写", () => {
      const results = parseAndQuery("FooBar");
      expect(results.map((r) => r.word)).toEqual(["Foo", "Bar"]);
    });

    it("应该处理全大写单词", () => {
      expect(parseAndQuery("HTTP").map((r) => r.word)).toEqual(["HTTP"]);
      expect(parseAndQuery("API").map((r) => r.word)).toEqual(["API"]);
    });

    it("应该处理连续大写字母", () => {
      expect(parseAndQuery("HTTP Server").map((r) => r.word)).toEqual([
        "HTTP",
        "Server",
      ]);
      expect(parseAndQuery("XMLParser").map((r) => r.word)).toEqual([
        "XML",
        "Parser",
      ]);
    });

    it("应该处理下划线分隔", () => {
      expect(parseAndQuery("foo_bar").map((r) => r.word)).toEqual([
        "foo",
        "bar",
      ]);
    });

    it("应该处理连字符分隔", () => {
      expect(parseAndQuery("foo-bar").map((r) => r.word)).toEqual([
        "foo",
        "bar",
      ]);
    });

    it("应该去重重复的单词（忽略大小写）", () => {
      expect(parseAndQuery("fooFoo").map((r) => r.word)).toEqual(["foo"]);
    });

    it("应该处理空字符串", () => {
      expect(parseAndQuery("")).toEqual([]);
    });

    it("应该处理单个单词", () => {
      expect(parseAndQuery("hello").map((r) => r.word)).toEqual(["hello"]);
      expect(parseAndQuery("HELLO").map((r) => r.word)).toEqual(["HELLO"]);
    });

    it("应该处理混合格式", () => {
      expect(parseAndQuery("get_userName").map((r) => r.word)).toEqual([
        "get",
        "user",
        "Name",
      ]);
      expect(parseAndQuery("HTTP_Server").map((r) => r.word)).toEqual([
        "HTTP",
        "Server",
      ]);
    });

    it("应该拆分组合词", () => {
      const results = parseAndQuery("audioinput");
      expect(results.map((r) => r.word.toLowerCase())).toContain("audio");
      expect(results.map((r) => r.word.toLowerCase())).toContain("input");
    });

    it("应该忽略单字母前缀", () => {
      const results = parseAndQuery("IBoardList");
      const words = results.map((r) => r.word.toLowerCase());
      expect(words).not.toContain("i");
      expect(words).toContain("board");
      expect(words).toContain("list");
    });

    it("应该处理 HTTPServer", () => {
      expect(parseAndQuery("HTTPServer").map((r) => r.word)).toEqual([
        "HTTP",
        "Server",
      ]);
    });

    it("应该处理复杂的混合情况", () => {
      const results = parseAndQuery("IHTTPService");
      expect(results.map((r) => r.word)).toEqual(["HTTP", "Service"]);
    });

    it("应该优先保留可识别的技术缩写块", () => {
      const results = parseAndQuery("getUserDTOList");
      expect(results.map((r) => r.word)).toEqual(["get", "User", "DTO", "List"]);
    });

    it("应该优先选择更少碎片的组合词拆分", () => {
      const results = parseAndQuery("userProfileManager");
      expect(results.map((r) => r.word)).toEqual(["user", "Profile", "Manager"]);
    });

    it("应该避免把全小写组合词拆成无意义碎片", () => {
      const results = parseAndQuery("userprofilemanager");
      expect(results.map((r) => r.word).map((word) => word.toLowerCase())).toEqual([
        "user",
        "profile",
        "manager",
      ]);
    });

    it("应该优先保留全小写组合词中的词典命中块", () => {
      const results = parseAndQuery("managername");
      expect(results.map((r) => r.word)).toEqual(["manager", "name"]);
    });

    it("应该保留完整的大写缩写加普通单词结构", () => {
      const results = parseAndQuery("XMLHttpRequest");
      expect(results.map((r) => r.word)).toEqual(["XML", "Http", "Request"]);
    });

    it("应该处理多段技术缩写混合命名", () => {
      const results = parseAndQuery("getURLForHTTPAPI");
      expect(results.map((r) => r.word)).toEqual([
        "get",
        "URL",
        "For",
        "HTTP",
        "API",
      ]);
    });

    it("应该处理前缀加缩写再加普通单词的复杂命名", () => {
      const results = parseAndQuery("customHTTPRequestHandler");
      expect(results.map((r) => r.word)).toEqual([
        "custom",
        "HTTP",
        "Request",
        "Handler",
      ]);
    });

    it("应该处理接口前缀加 DTO 缩写命名", () => {
      const results = parseAndQuery("IUserDTOService");
      expect(results.map((r) => r.word)).toEqual(["User", "DTO", "Service"]);
    });

    it("应该优先保留词典中已存在的完整全小写单词", () => {
      const results = parseAndQuery("superuserprofilemanager");
      expect(results.map((r) => r.word).map((word) => word.toLowerCase())).toEqual([
        "superuser",
        "profile",
        "manager",
      ]);
    });

    it("应该处理未知长串加已知后缀的组合", () => {
      const results = parseAndQuery("notexistwordmanager");
      expect(results.map((r) => r.word).map((word) => word.toLowerCase())).toEqual([
        "not",
        "exist",
        "word",
        "manager",
      ]);
    });

    it("应该返回查询结果", () => {
      const results = parseAndQuery("user");
      expect(results.length).toBe(1);
      expect(results[0].result?.w).toBe("user");
      expect(results[0].result?.t).toBeTruthy();
    });

    it("应该清理引号", () => {
      const results = parseAndQuery('"hello"');
      expect(results.map((r) => r.word)).toEqual(["hello"]);
    });

    it("应该移除数字", () => {
      const results = parseAndQuery("user123");
      expect(results.map((r) => r.word)).toEqual(["user"]);
    });

    it("应该把数字作为分词边界", () => {
      expect(parseAndQuery("version2API").map((r) => r.word)).toEqual([
        "version",
        "API",
      ]);
      expect(parseAndQuery("utf8String").map((r) => r.word)).toEqual([
        "utf",
        "String",
      ]);
    });

    it("应该将带重音的拉丁字母归一化为 ASCII", () => {
      expect(parseAndQuery("café")[0]?.result?.w).toBe("cafe");
      expect(parseAndQuery("naïve")[0]?.result?.w).toBe("naive");
      expect(parseAndQuery("résumé")[0]?.result?.w).toBe("resume");
      expect(parseAndQuery("fiancé")[0]?.result?.w).toBe("fiance");
    });

    it("应该优先查询带连字符的完整单词", () => {
      // ad-hocracy 在词典中是完整词条
      const results = parseAndQuery("ad-hocracy");
      expect(results.length).toBe(1);
      expect(results[0].word).toBe("ad-hocracy");
      expect(results[0].result?.w).toBe("ad-hocracy");
    });

    it("应该处理词典中不存在的连字符单词", () => {
      // foo-bar 不在词典中，应该拆分
      const results = parseAndQuery("foo-bar");
      expect(results.map((r) => r.word)).toEqual(["foo", "bar"]);
    });

    it("应该优先查询带空格的完整词组", () => {
      // Xuan paper 在词典中是完整词条
      const results = parseAndQuery("Xuan paper");
      expect(results.length).toBe(1);
      expect(results[0].word).toBe("Xuan paper");
      expect(results[0].result?.w).toBe("Xuan paper");
    });
  });
});
