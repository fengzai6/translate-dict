import { describe, expect, it } from "vitest";
import {
  createHoverSession,
  type HoverSessionTarget,
} from "../hover-session";

function target(
  anchorCharacter: number,
  kind: "word" | "selection" = "word"
): HoverSessionTarget {
  return {
    uri: "file:///tmp/a.ts",
    kind,
    anchorLine: 1,
    anchorCharacter,
    range: {
      startLine: 1,
      startCharacter: anchorCharacter,
      endLine: 1,
      endCharacter: anchorCharacter + 5,
    },
  };
}

describe("createHoverSession", () => {
  it("新目标默认展开词典并收起原文", () => {
    const session = createHoverSession();

    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: false,
    });
  });

  it("同一目标刷新时保留状态", () => {
    const session = createHoverSession();
    session.ensureTarget(target(2));
    session.setOriginalTextExpanded(true);

    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: true,
    });
  });

  it("换目标时重置状态", () => {
    const session = createHoverSession();
    session.ensureTarget(target(2));
    session.setOriginalTextExpanded(true);

    expect(session.ensureTarget(target(8))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: false,
    });
  });

  it("折叠词典同时收起原文，再次展开也恢复收起", () => {
    const session = createHoverSession();
    session.ensureTarget(target(2));
    session.setOriginalTextExpanded(true);
    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: true,
    });

    session.setDictionaryExpanded(false);
    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: false,
      originalTextExpanded: false,
    });

    session.setDictionaryExpanded(true);
    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: false,
    });
  });

  it("原文状态只在词典展开时切换", () => {
    const session = createHoverSession();
    session.ensureTarget(target(2));
    session.setDictionaryExpanded(false);
    session.setOriginalTextExpanded(true);

    expect(session.ensureTarget(target(2))).toEqual({
      dictionaryExpanded: false,
      originalTextExpanded: false,
    });
  });

  it("可以读取当前目标", () => {
    const session = createHoverSession();
    const current = target(2);
    session.ensureTarget(current);

    expect(session.getTarget()).toEqual(current);
  });

  it("锁定目标时忽略刷新产生的临时目标", () => {
    const session = createHoverSession();
    session.ensureTarget(target(2));
    session.setOriginalTextExpanded(true);

    session.lockTarget();
    expect(session.ensureTarget(target(1))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: true,
    });
    expect(session.getTarget()).toEqual(target(2));

    session.unlockTarget();
    expect(session.ensureTarget(target(1))).toEqual({
      dictionaryExpanded: true,
      originalTextExpanded: false,
    });
  });
});
