import { bench, describe } from "vitest";
import { parseAndQuery } from "../utils/format";
import { reverseQuery } from "../reverseQuery";

describe("parseAndQuery 性能测试", () => {
  // 简单单词
  bench("简单单词 - hello", () => {
    parseAndQuery("hello");
  });

  bench("简单单词 - user", () => {
    parseAndQuery("user");
  });

  // 驼峰命名
  bench("驼峰命名 - getUserName", () => {
    parseAndQuery("getUserName");
  });

  bench("驼峰命名 - fooBar", () => {
    parseAndQuery("fooBar");
  });

  // 帕斯卡命名
  bench("帕斯卡命名 - UserName", () => {
    parseAndQuery("UserName");
  });

  // 连续大写
  bench("连续大写 - HTTPServer", () => {
    parseAndQuery("HTTPServer");
  });

  bench("连续大写 - XMLParser", () => {
    parseAndQuery("XMLParser");
  });

  // 复杂情况
  bench("复杂情况 - IHTTPService", () => {
    parseAndQuery("IHTTPService");
  });

  bench("复杂情况 - IUser", () => {
    parseAndQuery("IUser");
  });

  bench("复杂情况 - IUserDTOService", () => {
    parseAndQuery("IUserDTOService");
  });

  bench("复杂情况 - customHTTPRequestHandler", () => {
    parseAndQuery("customHTTPRequestHandler");
  });

  bench("复杂情况 - getURLForHTTPAPI", () => {
    parseAndQuery("getURLForHTTPAPI");
  });

  // 组合词
  bench("组合词 - audioinput", () => {
    parseAndQuery("audioinput");
  });

  bench("组合词 - videooutput", () => {
    parseAndQuery("videooutput");
  });

  bench("组合词 - userprofilemanager", () => {
    parseAndQuery("userprofilemanager");
  });

  bench("组合词 - superuserprofilemanager", () => {
    parseAndQuery("superuserprofilemanager");
  });

  bench("组合词 - notexistwordmanager", () => {
    parseAndQuery("notexistwordmanager");
  });

  bench("组合词 - supercalifragilisticexpialidocious", () => {
    parseAndQuery("supercalifragilisticexpialidocious");
  });

  bench("组合词 - audioinputaudioprofilemanager", () => {
    parseAndQuery("audioinputaudioprofilemanager");
  });

  // 下划线分隔
  bench("下划线 - user_name", () => {
    parseAndQuery("user_name");
  });

  bench("下划线 - HTTP_Server", () => {
    parseAndQuery("HTTP_Server");
  });

  // 缩写形式
  bench("缩写 - Ht", () => {
    parseAndQuery("Ht");
  });

  bench("缩写 - HTTP", () => {
    parseAndQuery("HTTP");
  });

  // 专有名词
  bench("专有名词 - Ezechiel", () => {
    parseAndQuery("Ezechiel");
  });

  // 带数字
  bench("带数字 - user123", () => {
    parseAndQuery("user123");
  });

  // 长单词
  bench("长单词 - internationalization", () => {
    parseAndQuery("internationalization");
  });

  // 不存在的单词
  bench("不存在 - xyzabc", () => {
    parseAndQuery("xyzabc");
  });

  bench("不存在 - notexistword", () => {
    parseAndQuery("notexistword");
  });
});

describe("reverseQuery 中译英性能测试", () => {
  // 常见单字
  bench("单字 - 人", () => {
    reverseQuery("人", 10);
  });

  bench("单字 - 头", () => {
    reverseQuery("头", 10);
  });

  // 常见双字词
  bench("双字词 - 项目", () => {
    reverseQuery("项目", 10);
  });

  bench("双字词 - 用户", () => {
    reverseQuery("用户", 10);
  });

  bench("双字词 - 男人", () => {
    reverseQuery("男人", 10);
  });

  bench("双字词 - 服务器", () => {
    reverseQuery("服务器", 10);
  });

  // 技术词汇
  bench("技术词汇 - 计算机", () => {
    reverseQuery("计算机", 10);
  });

  bench("技术词汇 - 数据库", () => {
    reverseQuery("数据库", 10);
  });

  bench("技术词汇 - 服务器", () => {
    reverseQuery("服务器", 10);
  });

  bench("技术词汇 - 数据结构", () => {
    reverseQuery("数据结构", 10);
  });

  bench("技术词汇 - 网络协议", () => {
    reverseQuery("网络协议", 10);
  });

  // 较长词汇
  bench("长词汇 - 国际化", () => {
    reverseQuery("国际化", 10);
  });

  bench("长词汇 - 用户界面", () => {
    reverseQuery("用户界面", 10);
  });

  bench("长词汇 - 项目管理", () => {
    reverseQuery("项目管理", 10);
  });

  // 生僻词汇（可能匹配较少）
  bench("生僻词 - 量子力学", () => {
    reverseQuery("量子力学", 10);
  });

  bench("生僻词 - 人工智能", () => {
    reverseQuery("人工智能", 10);
  });
});
