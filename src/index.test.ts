import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

// Mock vscode module
vi.mock("vscode", () => ({
  languages: {
    registerHoverProvider: vi.fn(),
  },
  window: {
    activeTextEditor: undefined,
  },
  Hover: class {
    constructor(public contents: string) {}
  },
  Position: class {
    constructor(public line: number, public character: number) {}
  },
  Range: class {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number }
    ) {}
  },
}));

// Mock query module
vi.mock("./query", () => ({
  query: vi.fn((word: string) => {
    const mockDict: Record<string, { w: string; p: string }> = {
      hello: { w: "你好；哈喽", p: "həˈləʊ" },
      world: { w: "世界", p: "wɜːld" },
      foo: { w: "富；傻瓜", p: "fuː" },
      bar: { w: "酒吧；条", p: "bɑː" },
    };
    return mockDict[word] || { w: "", p: "" };
  }),
}));

// Mock format module
vi.mock("./format", () => ({
  cleanWord: vi.fn((word: string) => word.replace(/"/g, "")),
  getWordArray: vi.fn((word: string) => {
    if (word === "fooBar") return ["foo", "bar"];
    if (word === "hello") return ["hello"];
    return [word];
  }),
}));

type MockedFunction = ReturnType<typeof vi.fn>;

describe("index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("init", () => {
    it("应该注册 hover provider", async () => {
      const { init } = await import("./index");
      init();

      expect(vscode.languages.registerHoverProvider).toHaveBeenCalledWith(
        "*",
        expect.objectContaining({
          provideHover: expect.any(Function),
        })
      );
    });
  });

  describe("genMarkdown", () => {
    it("应该生成带翻译和音标的 Markdown", async () => {
      const { init } = await import("./index");
      init();

      const mockFn = vscode.languages
        .registerHoverProvider as unknown as MockedFunction;
      const registerCall = mockFn.mock.calls[0];
      const provider = registerCall[1] as {
        provideHover: (doc: unknown, pos: unknown) => { contents: string };
      };

      const mockDocument = {
        getText: vi.fn(() => "hello"),
        getWordRangeAtPosition: vi.fn(() => ({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        })),
      };

      const mockPosition = new vscode.Position(0, 0);

      const result = provider.provideHover(mockDocument, mockPosition);

      expect(result).toBeDefined();
      expect(result.contents).toContain("hello");
      expect(result.contents).toContain("你好");
      expect(result.contents).toContain("həˈləʊ");
    });

    it("应该生成无结果时的 Markdown", async () => {
      const { init } = await import("./index");
      init();

      const mockFn = vscode.languages
        .registerHoverProvider as unknown as MockedFunction;
      const registerCall = mockFn.mock.calls[0];
      const provider = registerCall[1] as {
        provideHover: (doc: unknown, pos: unknown) => { contents: string };
      };

      const mockDocument = {
        getText: vi.fn(() => "unknown"),
        getWordRangeAtPosition: vi.fn(() => ({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 7 },
        })),
      };

      const mockPosition = new vscode.Position(0, 0);

      const result = provider.provideHover(mockDocument, mockPosition);

      expect(result).toBeDefined();
      expect(result.contents).toContain("本地词库暂无结果");
      expect(result.contents).toContain("Google翻译");
      expect(result.contents).toContain("百度翻译");
    });
  });

  describe("provideHover", () => {
    it("应该返回 undefined 当没有单词范围", async () => {
      const { init } = await import("./index");
      init();

      const mockFn = vscode.languages
        .registerHoverProvider as unknown as MockedFunction;
      const registerCall = mockFn.mock.calls[0];
      const provider = registerCall[1] as {
        provideHover: (doc: unknown, pos: unknown) => unknown;
      };

      const mockDocument = {
        getText: vi.fn(),
        getWordRangeAtPosition: vi.fn(() => undefined),
      };

      const mockPosition = new vscode.Position(0, 0);

      const result = provider.provideHover(mockDocument, mockPosition);

      expect(result).toBeUndefined();
    });

    it("应该处理选中的文本", async () => {
      const { init } = await import("./index");
      init();

      const mockFn = vscode.languages
        .registerHoverProvider as unknown as MockedFunction;
      const registerCall = mockFn.mock.calls[0];
      const provider = registerCall[1] as {
        provideHover: (doc: unknown, pos: unknown) => unknown;
      };

      const mockWindow = vscode.window as { activeTextEditor?: unknown };
      mockWindow.activeTextEditor = {
        document: {
          getText: vi.fn(() => "hello"),
        },
        selection: {},
      };

      const mockDocument = {
        getText: vi.fn(() => "hello world"),
        getWordRangeAtPosition: vi.fn(() => ({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 11 },
        })),
      };

      const mockPosition = new vscode.Position(0, 0);

      const result = provider.provideHover(mockDocument, mockPosition);

      expect(result).toBeDefined();
    });

    it("应该处理多个单词（驼峰命名）", async () => {
      const { init } = await import("./index");
      init();

      const mockFn = vscode.languages
        .registerHoverProvider as unknown as MockedFunction;
      const registerCall = mockFn.mock.calls[0];
      const provider = registerCall[1] as {
        provideHover: (doc: unknown, pos: unknown) => { contents: string };
      };

      const mockDocument = {
        getText: vi.fn(() => "fooBar"),
        getWordRangeAtPosition: vi.fn(() => ({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 6 },
        })),
      };

      const mockPosition = new vscode.Position(0, 0);

      const result = provider.provideHover(mockDocument, mockPosition);

      expect(result).toBeDefined();
      expect(result.contents).toContain("foo");
      expect(result.contents).toContain("bar");
      expect(result.contents).toContain("*****");
    });
  });
});
