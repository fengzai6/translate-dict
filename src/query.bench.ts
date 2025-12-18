import { bench, describe } from "vitest";
import { query } from "./query";

describe("query 性能测试", () => {
  const commonWords = [
    "hello",
    "world",
    "function",
    "variable",
    "constant",
    "class",
    "interface",
    "component",
    "service",
    "controller",
    "model",
    "view",
    "router",
    "middleware",
    "database",
    "query",
    "insert",
    "update",
    "delete",
    "select",
    "where",
    "join",
    "async",
    "await",
    "promise",
    "callback",
    "event",
    "listener",
    "handler",
    "request",
    "response",
    "server",
    "client",
    "api",
    "endpoint",
    "route",
  ];

  const uncommonWords = [
    "xyzabc",
    "qwerty",
    "asdfgh",
    "zxcvbn",
    "mnbvcx",
    "lkjhgf",
    "poiuyt",
  ];

  bench("查询常见单词", () => {
    const word = commonWords[Math.floor(Math.random() * commonWords.length)];
    query(word);
  });

  bench("查询不存在的单词", () => {
    const word =
      uncommonWords[Math.floor(Math.random() * uncommonWords.length)];
    query(word);
  });

  bench("查询短单词（2个字符）", () => {
    query("ab");
  });

  bench("查询中等长度单词（5-8个字符）", () => {
    query("hello");
  });

  bench("查询长单词（10+个字符）", () => {
    query("authentication");
  });

  bench("连续查询10个单词", () => {
    for (let i = 0; i < 10; i++) {
      query(commonWords[i % commonWords.length]);
    }
  });

  bench("查询驼峰命名拆分后的单词", () => {
    query("get");
    query("user");
    query("name");
  });
});
