import { beforeEach } from "vitest";
import { describe, expect, it } from "vitest";
import {
  MAX_ORIGINAL_TEXT_LINES,
  TOGGLE_HOVER_EXPANDED_COMMAND,
  TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
  buildOriginalTextMarkdown,
  convertQueryResultsToMarkdown,
  convertReverseResultsToMarkdown,
  hoverToggleCommandUri,
  parseHoverToggleArgs,
  wrapHoverMarkdown,
} from "../utils/hover-markdown";
import { setMockConfig } from "../utils/platform";

const target = {
  uri: "file:///tmp/a.ts",
  line: 3,
  character: 8,
};

const dictionary = "- demise :  \nn. 崩, 薨, 死亡";

beforeEach(() => {
  setMockConfig(null);
});

describe("parseHoverToggleArgs", () => {
  it("接受合法参数", () => {
    expect(parseHoverToggleArgs("file:///a.ts", 3, 8, true)).toEqual({
      uri: "file:///a.ts",
      line: 3,
      character: 8,
      expanded: true,
    });
  });

  it("拒绝非法参数", () => {
    expect(parseHoverToggleArgs("", 0, 0, true)).toBeUndefined();
    expect(parseHoverToggleArgs("file:///a.ts", -1, 0, true)).toBeUndefined();
    expect(parseHoverToggleArgs("file:///a.ts", 1.5, 0, true)).toBeUndefined();
    expect(parseHoverToggleArgs("file:///a.ts", 0, 0, "yes")).toBeUndefined();
  });
});

describe("hoverToggleCommandUri", () => {
  it("参数可 JSON 往返且特殊字符被编码", () => {
    const commandTarget = {
      uri: "file:///tmp/a b.ts?x=1",
      line: 9,
      character: 1,
    };
    const href = hoverToggleCommandUri(
      TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
      true,
      commandTarget
    );
    const encoded = href.slice(href.indexOf("?") + 1);

    expect(encoded).not.toContain(" ");
    expect(JSON.parse(decodeURIComponent(encoded))).toEqual([
      commandTarget.uri,
      9,
      1,
      true,
    ]);
  });
});

describe("dictionary markdown", () => {
  it("英译中结果使用默认平台链接并保留换行", () => {
    const result = convertQueryResultsToMarkdown([
      {
        word: "demise",
        result: {
          w: "demise",
          p: "di'maiz",
          t: "n. 崩, 薨, 死亡\\n[法] 让与",
        },
      },
    ]);

    expect(result).toBe(
      "- [demise](https://translate.google.com?text=demise) */di'maiz/*:  \n" +
        "n. 崩, 薨, 死亡  \n[法] 让与"
    );
  });

  it("无词典结果时展示默认平台和全部平台链接", () => {
    const result = convertQueryResultsToMarkdown([
      {
        word: "xzcvzxvdv",
        result: undefined,
      },
    ]);

    expect(result).toContain(
      "[xzcvzxvdv](https://translate.google.com?text=xzcvzxvdv)"
    );
    expect(result).toContain("本地词库暂无结果");
    expect(result).toContain(
      "[Google翻译](https://translate.google.com?text=xzcvzxvdv)"
    );
    expect(result).toContain(
      "[百度翻译](https://fanyi.baidu.com/#en/zh/xzcvzxvdv)"
    );
  });

  it("使用自定义默认平台", () => {
    setMockConfig({
      defaultTranslatePlatform: "custom",
      customTranslateUrl: "https://custom.com/translate?q={word}",
    });

    const result = convertQueryResultsToMarkdown([
      {
        word: "demise",
        result: { w: "demise", t: "n. 死亡" },
      },
    ]);

    expect(result).toContain(
      "[demise](https://custom.com/translate?q=demise)"
    );
  });

  it("中译英结果使用分隔线并编码单词", () => {
    const result = convertReverseResultsToMarkdown([
      { word: "hello world", translation: "你好" },
      { word: "world", translation: "世界", phonetic: "wә:ld" },
    ]);

    expect(result).toContain(
      "[hello world](https://translate.google.com?text=hello%20world)"
    );
    expect(result).toContain(
      "*****\n- [world](https://translate.google.com?text=world) */wә:ld/*"
    );
  });
});

describe("wrapHoverMarkdown", () => {
  it("首行把折叠箭头和翻译标签渲染为链接", () => {
    const original = buildOriginalTextMarkdown(
      "翻译",
      "connectTimeoutMs: 10_000, // 建连超时 → 可恢复重连"
    );
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result.split("\n")[0].trimEnd()).toBe(
      `[▼ 翻译](${hoverToggleCommandUri(
        TOGGLE_HOVER_EXPANDED_COMMAND,
        false,
        target
      )}) \`connectTimeoutMs: 10_000, // 建连超时 → 可恢复重连\` :`
    );
  });

  it("词典折叠时只保留首行入口", () => {
    const result = wrapHoverMarkdown(
      "翻译 `demise` :",
      dictionary,
      {
        dictionaryExpanded: false,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toBe(
      `[▶ 翻译](${hoverToggleCommandUri(
        TOGGLE_HOVER_EXPANDED_COMMAND,
        true,
        target
      )}) \`demise\` :`
    );
  });

  it("词典展开且原文不超过 3 行时没有原文入口", () => {
    const original = "翻译 `demise` :";
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toContain(`[▼ 翻译]`);
    expect(result).toContain("`demise` :");
    expect(result).toContain(dictionary);
    expect(result).not.toContain("展开剩余原文");
  });

  it("原文恰好 3 行时完整显示在首行和正文中", () => {
    const original = ["line 1", "line 2", "line 3"].join("\n");
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toContain(") line 1");
    expect(result).toContain("line 2  \nline 3");
    expect(result).not.toContain("展开剩余原文");
  });

  it("原文恰好 3 行且带尾随换行时不算超过 3 行", () => {
    const original = `${["line 1", "line 2", "line 3"].join("\n")}\n`;
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toContain(") line 1");
    expect(result).toContain("line 2  \nline 3");
    expect(result).not.toContain("展开剩余原文");
  });

  it("原文超过 3 行时显示前 3 行和展开入口", () => {
    const original = ["line 1", "line 2", "line 3", "line 4"].join("\n");
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toContain(") line 1");
    expect(result).toContain("line 2  \nline 3");
    expect(result).not.toContain("line 4");
    expect(result).toContain("展开剩余原文");
  });

  it("原文展开后显示完整内容并显示收起入口", () => {
    const original = ["line 1", "line 2", "line 3", "line 4"].join("\n");
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: true,
      },
      target
    );

    expect(result).toContain("line 4");
    expect(result).toContain(
      `[收起](${hoverToggleCommandUri(
        TOGGLE_HOVER_ORIGINAL_TEXT_COMMAND,
        false,
        target
      )})`
    );
  });

  it("支持带标题格式的多行原文本", () => {
    const original = "翻译 `first` :  \n第二行  \n第三行  \n第四行";
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result).toContain("[▼ 翻译]");
    expect(result).toContain("`first` :");
    expect(result).toContain("第二行  \n第三行");
    expect(result).not.toContain("第四行");
    expect(result).toContain("展开剩余原文");
  });

  it("多行原文本首行残留未闭合反引号时保持首行链接有效", () => {
    const original = buildOriginalTextMarkdown("翻译", [
      "onMessage({ event, data }) {",
      "if (event === 'delta') render(data);",
      "else if (event === 'done') sub.close();",
    ].join("\n"));
    const result = wrapHoverMarkdown(
      original,
      dictionary,
      {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      },
      target
    );

    expect(result.split("\n")[0].trimEnd()).toBe(
      `[▼ 翻译](${hoverToggleCommandUri(
        TOGGLE_HOVER_EXPANDED_COMMAND,
        false,
        target
      )}) \`onMessage({ event, data }) {\` :`
    );
  });
});

describe("constants", () => {
  it("原文最大逻辑行数为 3", () => {
    expect(MAX_ORIGINAL_TEXT_LINES).toBe(3);
  });
});
