import { describe, expect, it } from "vitest";
import {
  MAX_SELECTION_TRANSLATE_LENGTH,
  TOGGLE_HOVER_EXPANDED_COMMAND,
  isPositionInDocument,
  parseToggleHoverArgs,
  positionInExclusiveRange,
  selectionTextForTranslate,
  shouldResetSessionHover,
  toggleHoverCommandUri,
  wrapHoverMarkdown,
} from "../utils/hoverMarkdown";

describe("wrapHoverMarkdown", () => {
  const header = "翻译 `demise` :  \n";
  const dictionary = "- demise :  \nn. 崩, 薨, 死亡";
  const longHeader = `翻译 \`${"Protocol ".repeat(20)}\` :  \n`;
  const target = {
    uri: "file:///tmp/a.ts",
    line: 3,
    character: 8,
  };

  it("展开时应显示折叠按钮和词典释义", () => {
    const result = wrapHoverMarkdown(header, dictionary, true, target);

    expect(result).toContain(
      `[▼ 折叠词典](${toggleHoverCommandUri(false, target)})`
    );
    expect(result).toContain("翻译 `demise` :");
    expect(result).toContain(dictionary);
    expect(result).not.toContain("<details>");
  });

  it("折叠时只保留展开按钮", () => {
    const result = wrapHoverMarkdown(header, dictionary, false, target);

    expect(result).toBe(
      `[▶ 展开词典](${toggleHoverCommandUri(true, target)})`
    );
    expect(result).not.toContain(dictionary);
  });

  it("展开时长标题不写入信息框", () => {
    const result = wrapHoverMarkdown(longHeader, dictionary, true, target);

    expect(result).toContain("▼ 折叠词典");
    expect(result).toContain(TOGGLE_HOVER_EXPANDED_COMMAND);
    expect(result).toContain(dictionary);
    expect(result).not.toContain("Protocol");
  });
});

describe("parseToggleHoverArgs", () => {
  it("接受合法参数", () => {
    expect(parseToggleHoverArgs("file:///a.ts", 3, 8, true)).toEqual({
      uri: "file:///a.ts",
      line: 3,
      character: 8,
      expanded: true,
    });
  });

  it("拒绝负数、小数、空 uri、非布尔 expanded", () => {
    expect(parseToggleHoverArgs("", 0, 0, true)).toBeUndefined();
    expect(parseToggleHoverArgs("file:///a.ts", -1, 0, true)).toBeUndefined();
    expect(parseToggleHoverArgs("file:///a.ts", 0, -1, true)).toBeUndefined();
    expect(parseToggleHoverArgs("file:///a.ts", 1.5, 0, true)).toBeUndefined();
    expect(parseToggleHoverArgs("file:///a.ts", 0, 0, "yes")).toBeUndefined();
    expect(parseToggleHoverArgs("file:///a.ts", NaN, 0, true)).toBeUndefined();
  });
});

describe("positionInExclusiveRange", () => {
  it("空选区不覆盖任何位置", () => {
    expect(positionInExclusiveRange(0, 5, 0, 5, 0, 5)).toBe(false);
  });

  it("覆盖选区内字符，不含 end", () => {
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 0)).toBe(true);
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 4)).toBe(true);
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 5)).toBe(false);
  });
});

describe("shouldResetSessionHover", () => {
  const session = { uri: "file:///a.ts", line: 2, character: 4 };

  it("刷新 hover 期间不清除会话态", () => {
    expect(
      shouldResetSessionHover(true, session, "file:///a.ts", 2, 3)
    ).toBe(false);
  });

  it("换词后清除会话态", () => {
    expect(
      shouldResetSessionHover(false, session, "file:///a.ts", 2, 8)
    ).toBe(true);
  });
});

describe("selectionTextForTranslate", () => {
  it("空白或超长选区回退", () => {
    expect(selectionTextForTranslate("   \n")).toBeUndefined();
    expect(
      selectionTextForTranslate("a".repeat(MAX_SELECTION_TRANSLATE_LENGTH + 1))
    ).toBeUndefined();
    expect(selectionTextForTranslate("hello world")).toBe("hello world");
  });
});

describe("isPositionInDocument", () => {
  it("拒绝越界行列", () => {
    expect(isPositionInDocument(2, 0, 2, 10)).toBe(false);
    expect(isPositionInDocument(0, 11, 1, 10)).toBe(false);
    expect(isPositionInDocument(0, 10, 1, 10)).toBe(true);
  });
});

describe("toggleHoverCommandUri", () => {
  it("参数可 JSON 往返，特殊字符被编码", () => {
    const target = {
      uri: "file:///tmp/a b.ts?x=1",
      line: 9,
      character: 1,
    };
    const href = toggleHoverCommandUri(true, target);
    const encoded = href.slice(href.indexOf("?") + 1);
    expect(encoded).not.toContain(" ");
    expect(JSON.parse(decodeURIComponent(encoded))).toEqual([
      target.uri,
      9,
      1,
      true,
    ]);
  });
});


describe("wrapHoverMarkdown", () => {
  const header = "翻译 `demise` :  \n";
  const dictionary = "- demise :  \nn. 崩, 薨, 死亡";
  const longHeader = `翻译 \`${"Protocol ".repeat(20)}\` :  \n`;
  const target = {
    uri: "file:///tmp/a.ts",
    line: 3,
    character: 8,
  };

  it("展开时应显示折叠按钮和词典释义", () => {
    const result = wrapHoverMarkdown(header, dictionary, true, target);

    expect(result).toContain(
      `[▼ 折叠词典](${toggleHoverCommandUri(false, target)})`
    );
    expect(result).toContain("翻译 `demise` :");
    expect(result).toContain(dictionary);
    expect(result).not.toContain("<details>");
  });

  it("折叠时只保留展开按钮", () => {
    const result = wrapHoverMarkdown(header, dictionary, false, target);

    expect(result).toBe(
      `[▶ 展开词典](${toggleHoverCommandUri(true, target)})`
    );
    expect(result).not.toContain(dictionary);
  });

  it("展开时长标题不写入信息框", () => {
    const result = wrapHoverMarkdown(longHeader, dictionary, true, target);

    expect(result).toContain("▼ 折叠词典");
    expect(result).toContain(TOGGLE_HOVER_EXPANDED_COMMAND);
    expect(result).toContain(dictionary);
    expect(result).not.toContain("Protocol");
  });
});
