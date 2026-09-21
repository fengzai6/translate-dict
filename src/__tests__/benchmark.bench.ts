import { bench, describe } from "vitest";
import type * as vscode from "vscode";
import {
  buildHoverPresentation,
  type HoverPresentationConfig,
} from "../hover-presentation";
import { clearReverseQueryCache } from "../reverseQuery";
import type { HoverSessionState } from "../hover-session";
import type { HoverQuery } from "../utils/hover-query";

const commandTarget = {
  uri: "file:///tmp/benchmark.ts",
  line: 1,
  character: 2,
};

const hoverState: HoverSessionState = {
  dictionaryExpanded: true,
  originalTextExpanded: false,
};

const token = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => undefined }),
} as vscode.CancellationToken;

const hoverConfig: HoverPresentationConfig = {
  chineseToEnglishMaxResults: 10,
  enableOnlineFallback: false,
  onlineFallbackApis: ["google"],
};

const LONG_ENGLISH_PARAGRAPH = [
  "The quick brown fox jumps over the lazy dog, while the development team reviews the latest pull request.",
  "They discuss the implementation details, run the benchmark suite, and verify that the extension host remains responsive.",
  "The final decision is to keep the dictionary query on the main path, cache reverse lookups, and defer network work until it is required.",
  "This paragraph is intentionally long enough to exercise tokenization, dictionary lookup, Markdown generation, and display folding.",
].join("\n");

const LONG_CHINESE_PARAGRAPH = [
  "现代软件开发需要同时关注功能正确性、运行性能和长期维护成本，不能只在发布前进行简单验证。",
  "当用户选中一段较长的中文内容时，插件需要让完整文本参与翻译，同时控制悬浮提示的展示规模，避免信息过载。",
  "因此展示层可以折叠原文和词典内容，但查询层不能因为文本较长而静默回退到光标下的单个单词。",
  "这段文本用于验证长选区经过缓存后的查询链路，以及悬浮提示组装和折叠逻辑的稳定表现。",
].join("\n");

const MIXED_PARAGRAPH = [
  "在 Visual Studio Code 中调试 extension host 时，可以先打开 Developer Tools，再检查 HoverProvider 返回的 MarkdownString。",
  "如果本地 dictionary 没有命中，可以启用 online fallback，但需要注意 network latency、API quota 和用户隐私设置。",
  "This paragraph mixes Chinese explanations with English technical terms so the benchmark covers realistic documentation and code comments.",
  "中英混合文本也必须完整参与翻译，不能因为包含中文就跳过 English identifiers 或截断后续内容。",
].join("\n");

const MIXED_CODE_PARAGRAPH = [
  "const userService = createUserService(); // 用户服务负责缓存、鉴权和重试",
  "await userService.fetchProfile(userId, { includePermissions: true }); // 获取用户资料和权限",
  "if (!response.ok) throw new Error(`请求失败: ${response.status}`);",
  "return translate(response.data); // 将后端返回的数据翻译后展示",
].join("\n");

function hoverQuery(text: string, kind: "word" | "selection"): HoverQuery {
  return {
    kind,
    text,
    range: {
      start: { line: 1, character: 2 },
      end: { line: 1, character: 2 + text.length },
    } as vscode.Range,
    anchor: { line: 1, character: 2 } as vscode.Position,
  };
}

async function buildPresentation(
  text: string,
  kind: "word" | "selection"
): Promise<void> {
  await buildHoverPresentation({
    query: hoverQuery(text, kind),
    config: hoverConfig,
    state: hoverState,
    commandTarget,
    token,
  });
}

describe("hover 英译中主路径性能测试", () => {
  bench("英译中 - 无本地结果", async () => {
    await buildPresentation("qzxqzxqzx", "word");
  });

  // 简单单词
  bench("简单单词 - hello", async () => {
    await buildPresentation("hello", "word");
  });

  bench("简单单词 - user", async () => {
    await buildPresentation("user", "word");
  });

  // 驼峰命名
  bench("驼峰命名 - getUserName", async () => {
    await buildPresentation("getUserName", "word");
  });

  bench("驼峰命名 - fooBar", async () => {
    await buildPresentation("fooBar", "word");
  });

  // 帕斯卡命名
  bench("帕斯卡命名 - UserName", async () => {
    await buildPresentation("UserName", "word");
  });

  // 连续大写
  bench("连续大写 - HTTPServer", async () => {
    await buildPresentation("HTTPServer", "word");
  });

  bench("连续大写 - XMLParser", async () => {
    await buildPresentation("XMLParser", "word");
  });

  // 复杂情况
  bench("复杂情况 - IHTTPService", async () => {
    await buildPresentation("IHTTPService", "word");
  });

  bench("复杂情况 - IUser", async () => {
    await buildPresentation("IUser", "word");
  });

  bench("复杂情况 - IUserDTOService", async () => {
    await buildPresentation("IUserDTOService", "word");
  });

  bench("复杂情况 - customHTTPRequestHandler", async () => {
    await buildPresentation("customHTTPRequestHandler", "word");
  });

  bench("复杂情况 - getURLForHTTPAPI", async () => {
    await buildPresentation("getURLForHTTPAPI", "word");
  });

  // 组合词
  bench("组合词 - audioinput", async () => {
    await buildPresentation("audioinput", "word");
  });

  bench("组合词 - videooutput", async () => {
    await buildPresentation("videooutput", "word");
  });

  bench("组合词 - userprofilemanager", async () => {
    await buildPresentation("userprofilemanager", "word");
  });

  bench("组合词 - superuserprofilemanager", async () => {
    await buildPresentation("superuserprofilemanager", "word");
  });

  bench("组合词 - notexistwordmanager", async () => {
    await buildPresentation("notexistwordmanager", "word");
  });

  bench("组合词 - supercalifragilisticexpialidocious", async () => {
    await buildPresentation("supercalifragilisticexpialidocious", "word");
  });

  bench("组合词 - audioinputaudioprofilemanager", async () => {
    await buildPresentation("audioinputaudioprofilemanager", "word");
  });

  // 下划线分隔
  bench("下划线 - user_name", async () => {
    await buildPresentation("user_name", "word");
  });

  bench("下划线 - HTTP_Server", async () => {
    await buildPresentation("HTTP_Server", "word");
  });

  // 缩写形式
  bench("缩写 - Ht", async () => {
    await buildPresentation("Ht", "word");
  });

  bench("缩写 - HTTP", async () => {
    await buildPresentation("HTTP", "word");
  });

  // 专有名词
  bench("专有名词 - Ezechiel", async () => {
    await buildPresentation("Ezechiel", "word");
  });

  // 带数字
  bench("带数字 - user123", async () => {
    await buildPresentation("user123", "word");
  });

  // 长单词
  bench("长单词 - internationalization", async () => {
    await buildPresentation("internationalization", "word");
  });

  // 不存在的单词
  bench("不存在 - xyzabc", async () => {
    await buildPresentation("xyzabc", "word");
  });

  bench("不存在 - notexistword", async () => {
    await buildPresentation("notexistword", "word");
  });
});

describe("hover 中译英主路径性能测试", () => {
  // 常见单字
  bench("单字 - 人", async () => {
    await buildPresentation("人", "selection");
  });

  bench("单字 - 头", async () => {
    await buildPresentation("头", "selection");
  });

  // 常见双字词
  bench("双字词 - 项目", async () => {
    await buildPresentation("项目", "selection");
  });

  bench("双字词 - 用户", async () => {
    await buildPresentation("用户", "selection");
  });

  bench("双字词 - 男人", async () => {
    await buildPresentation("男人", "selection");
  });

  bench("双字词 - 服务器", async () => {
    await buildPresentation("服务器", "selection");
  });

  // 技术词汇
  bench("技术词汇 - 计算机", async () => {
    await buildPresentation("计算机", "selection");
  });

  bench("技术词汇 - 数据库", async () => {
    await buildPresentation("数据库", "selection");
  });

  bench("技术词汇 - 数据结构", async () => {
    await buildPresentation("数据结构", "selection");
  });

  bench("技术词汇 - 网络协议", async () => {
    await buildPresentation("网络协议", "selection");
  });

  // 较长词汇
  bench("长词汇 - 国际化", async () => {
    await buildPresentation("国际化", "selection");
  });

  bench("长词汇 - 用户界面", async () => {
    await buildPresentation("用户界面", "selection");
  });

  bench("长词汇 - 项目管理", async () => {
    await buildPresentation("项目管理", "selection");
  });

  // 生僻词汇（可能匹配较少）
  bench("生僻词 - 量子力学", async () => {
    await buildPresentation("量子力学", "selection");
  });

  bench("生僻词 - 人工智能", async () => {
    await buildPresentation("人工智能", "selection");
  });
});

describe("中译英首次查询性能测试", () => {
  bench(
    "中译英选区 - 用户（首次查询）",
    async () => {
      clearReverseQueryCache();
      await buildPresentation("用户", "selection");
    },
    { iterations: 5 }
  );

  bench(
    "中译英选区 - 服务器（首次查询）",
    async () => {
      clearReverseQueryCache();
      await buildPresentation("服务器", "selection");
    },
    { iterations: 5 }
  );
});

describe("hover 长文本性能测试", () => {
  bench("超长英文段落 - 多行选择", async () => {
    await buildPresentation(LONG_ENGLISH_PARAGRAPH, "selection");
  });

  bench("中英混合段落 - 多行选择", async () => {
    await buildPresentation(MIXED_PARAGRAPH, "selection");
  });

  bench("中英混合代码 - 多行选择", async () => {
    await buildPresentation(MIXED_CODE_PARAGRAPH, "selection");
  });
});

describe("hover 长文本首次查询性能测试", () => {
  bench(
    "超长中文段落 - 多行选择（首次查询）",
    async () => {
      clearReverseQueryCache();
      await buildPresentation(LONG_CHINESE_PARAGRAPH, "selection");
    },
    { iterations: 5 }
  );
});
