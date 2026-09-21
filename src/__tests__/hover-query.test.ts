import { describe, expect, it } from "vitest";
import type * as vscode from "vscode";
import {
  positionInExclusiveRange,
  resolveHoverQuery,
} from "../utils/hover-query";

function position(line: number, character: number): vscode.Position {
  return { line, character } as vscode.Position;
}

function range(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
): vscode.Range {
  return {
    start: position(startLine, startCharacter),
    end: position(endLine, endCharacter),
    isEmpty: startLine === endLine && startCharacter === endCharacter,
  } as vscode.Range;
}

function selection(
  anchorLine: number,
  anchorCharacter: number,
  activeLine: number,
  activeCharacter: number
): vscode.Selection {
  const anchorBeforeActive =
    anchorLine < activeLine ||
    (anchorLine === activeLine && anchorCharacter <= activeCharacter);
  const start = anchorBeforeActive
    ? position(anchorLine, anchorCharacter)
    : position(activeLine, activeCharacter);
  const end = anchorBeforeActive
    ? position(activeLine, activeCharacter)
    : position(anchorLine, anchorCharacter);

  return {
    start,
    end,
    active: position(activeLine, activeCharacter),
    anchor: position(anchorLine, anchorCharacter),
    isEmpty: start.line === end.line && start.character === end.character,
  } as vscode.Selection;
}

function documentFor(
  text: string,
  wordRange?: vscode.Range
): vscode.TextDocument {
  return {
    getText: () => text,
    getWordRangeAtPosition: () => wordRange,
  } as unknown as vscode.TextDocument;
}

describe("positionInExclusiveRange", () => {
  it("空范围不覆盖任何位置", () => {
    expect(positionInExclusiveRange(0, 5, 0, 5, 0, 5)).toBe(false);
  });

  it("包含 start，不包含 end", () => {
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 0)).toBe(true);
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 4)).toBe(true);
    expect(positionInExclusiveRange(0, 0, 0, 5, 0, 5)).toBe(false);
  });
});

describe("resolveHoverQuery", () => {
  it("光标位于选区内时优先返回选区", () => {
    const selected = selection(1, 2, 1, 6);
    const query = resolveHoverQuery(
      documentFor("hello", range(1, 2, 1, 6)),
      position(1, 3),
      selected
    );

    expect(query).toEqual({
      kind: "selection",
      text: "hello",
      range: selected,
      anchor: selected.start,
    });
  });

  it("反向选区仍使用规范化 start 作为 anchor", () => {
    const selected = selection(1, 6, 1, 2);
    const query = resolveHoverQuery(
      documentFor("hello", range(1, 2, 1, 6)),
      position(1, 3),
      selected
    );

    expect(query?.kind).toBe("selection");
    expect(query?.anchor).toEqual(selected.start);
  });

  it("光标位于选区 end 时不使用选区", () => {
    const selected = selection(1, 2, 1, 6);
    const wordRange = range(1, 5, 1, 10);
    const query = resolveHoverQuery(
      documentFor("world", wordRange),
      position(1, 6),
      selected
    );

    expect(query).toEqual({
      kind: "word",
      text: "world",
      range: wordRange,
      anchor: position(1, 6),
    });
  });

  it("没有有效选区时返回单词查询", () => {
    const wordRange = range(1, 2, 1, 7);
    const query = resolveHoverQuery(
      documentFor("hello", wordRange),
      position(1, 3)
    );

    expect(query).toEqual({
      kind: "word",
      text: "hello",
      range: wordRange,
      anchor: position(1, 3),
    });
  });

  it("空白选区和无单词位置返回 undefined", () => {
    expect(
      resolveHoverQuery(
        documentFor("", range(0, 0, 0, 0)),
        position(0, 0),
        selection(0, 0, 0, 0)
      )
    ).toBeUndefined();

    expect(
      resolveHoverQuery(documentFor("", undefined), position(0, 0))
    ).toBeUndefined();
  });
});
