export type HoverRangeSnapshot = {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
};

export type HoverSessionTarget = {
  uri: string;
  kind: "word" | "selection";
  anchorLine: number;
  anchorCharacter: number;
  range: HoverRangeSnapshot;
};

export type HoverSessionState = {
  dictionaryExpanded: boolean;
  originalTextExpanded: boolean;
};

function sameRange(
  left: HoverRangeSnapshot,
  right: HoverRangeSnapshot
): boolean {
  return (
    left.startLine === right.startLine &&
    left.startCharacter === right.startCharacter &&
    left.endLine === right.endLine &&
    left.endCharacter === right.endCharacter
  );
}

function sameTarget(
  left: HoverSessionTarget | undefined,
  right: HoverSessionTarget
): boolean {
  return (
    !!left &&
    left.uri === right.uri &&
    left.kind === right.kind &&
    left.anchorLine === right.anchorLine &&
    left.anchorCharacter === right.anchorCharacter &&
    sameRange(left.range, right.range)
  );
}

export function createHoverSession() {
  let currentTarget: HoverSessionTarget | undefined;
  let currentState: HoverSessionState | undefined;
  let targetLocked = false;

  return {
    ensureTarget(target: HoverSessionTarget): HoverSessionState {
      if (targetLocked && currentState) {
        return { ...currentState };
      }
      if (sameTarget(currentTarget, target) && currentState) {
        return { ...currentState };
      }

      currentTarget = { ...target, range: { ...target.range } };
      currentState = {
        dictionaryExpanded: true,
        originalTextExpanded: false,
      };
      return { ...currentState };
    },

    getTarget(): HoverSessionTarget | undefined {
      return currentTarget
        ? { ...currentTarget, range: { ...currentTarget.range } }
        : undefined;
    },

    setDictionaryExpanded(expanded: boolean): void {
      if (!currentState) {
        return;
      }
      currentState = {
        dictionaryExpanded: expanded,
        originalTextExpanded: false,
      };
    },

    setOriginalTextExpanded(expanded: boolean): void {
      if (!currentState || !currentState.dictionaryExpanded) {
        return;
      }
      currentState = {
        ...currentState,
        originalTextExpanded: expanded,
      };
    },

    lockTarget(): void {
      if (currentTarget) {
        targetLocked = true;
      }
    },

    unlockTarget(): void {
      targetLocked = false;
    },
  };
}
