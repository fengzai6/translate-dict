import { afterEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { buildHoverPresentation } from "../hover-presentation";
import type { HoverSessionState } from "../hover-session";
import type { HoverQuery } from "../utils/hover-query";
import { clearOnlineTranslationCache } from "../utils/onlineTranslate";

const commandTarget = {
  uri: "file:///tmp/a.ts",
  line: 1,
  character: 2,
};

const expandedState: HoverSessionState = {
  dictionaryExpanded: true,
  originalTextExpanded: false,
};

function query(
  text: string,
  kind: "word" | "selection"
): HoverQuery {
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

function token(): vscode.CancellationToken {
  return {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => undefined }),
  } as vscode.CancellationToken;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearOnlineTranslationCache();
});

describe("buildHoverPresentation", () => {
  it("英译中本地结果生成完整 hover Markdown", async () => {
    const result = await buildHoverPresentation({
      query: query("hello", "word"),
      config: {
        chineseToEnglishMaxResults: 10,
        enableOnlineFallback: false,
        onlineFallbackApis: ["google"],
      },
      state: expandedState,
      commandTarget,
      token: token(),
    });

    expect(result?.markdown).toContain("[▼ 翻译]");
    expect(result?.markdown).toContain("`hello`");
    expect(result?.markdown).toContain("喂");
  });

  it("中译英选区生成候选词 Markdown", async () => {
    const result = await buildHoverPresentation({
      query: query("用户", "selection"),
      config: {
        chineseToEnglishMaxResults: 10,
        enableOnlineFallback: false,
        onlineFallbackApis: ["google"],
      },
      state: expandedState,
      commandTarget,
      token: token(),
    });

    expect(result?.markdown).toContain("[▼ 中译英]");
    expect(result?.markdown).toContain("`用户`");
    expect(result?.markdown).toContain("user");
  });

  it("未选中的中文不生成 hover", async () => {
    await expect(
      buildHoverPresentation({
        query: query("用户", "word"),
        config: {
          chineseToEnglishMaxResults: 10,
          enableOnlineFallback: false,
          onlineFallbackApis: ["google"],
        },
        state: expandedState,
        commandTarget,
        token: token(),
      })
    ).resolves.toBeUndefined();
  });

  it("英译中无本地结果时可走在线回退", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sentences: [{ trans: "不存在词" }],
        }),
      })
    );

    const result = await buildHoverPresentation({
      query: query("qzxqzxqzx", "word"),
      config: {
        chineseToEnglishMaxResults: 10,
        enableOnlineFallback: true,
        onlineFallbackApis: ["google"],
      },
      state: expandedState,
      commandTarget,
      token: token(),
    });

    expect(result?.markdown).toContain("不存在词");
    expect(result?.markdown).toContain("Google 翻译");
  });
});
