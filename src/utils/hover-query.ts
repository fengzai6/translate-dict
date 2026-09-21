import type * as vscode from "vscode";

export type HoverQuery = {
  kind: "word" | "selection";
  text: string;
  range: vscode.Range;
  anchor: vscode.Position;
};

export function positionInExclusiveRange(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
  line: number,
  character: number
): boolean {
  if (startLine === endLine && startCharacter === endCharacter) {
    return false;
  }

  const geStart =
    line > startLine || (line === startLine && character >= startCharacter);
  const ltEnd =
    line < endLine || (line === endLine && character < endCharacter);
  return geStart && ltEnd;
}

export function resolveHoverQuery(
  document: vscode.TextDocument,
  position: vscode.Position,
  selection?: vscode.Selection
): HoverQuery | undefined {
  const selectionText =
    selection && !selection.isEmpty ? document.getText(selection) : "";
  const selectionCoversPosition =
    !!selection &&
    !!selectionText.trim() &&
    positionInExclusiveRange(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
      position.line,
      position.character
    );

  if (selection && selectionCoversPosition) {
    return {
      kind: "selection",
      text: selectionText,
      range: selection,
      anchor: selection.start,
    };
  }

  const wordRange = document.getWordRangeAtPosition(position);
  if (!wordRange) {
    return undefined;
  }

  const word = document.getText(wordRange);
  if (!word.trim()) {
    return undefined;
  }

  return {
    kind: "word",
    text: word,
    range: wordRange,
    anchor: position,
  };
}
