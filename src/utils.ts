/**
 * Regex utilities for checkbox detection.
 */

/** Matches `[char]` patterns — one optional char between square brackets. */
export const CHECKBOX_REGEX = /\[.\]/g;

/**
 * Find all checkbox matches on a single line of text, returning their positions and state.
 */
export function findCheckboxes(lineText: string): Array<{ startPos: number; endPos: number; currentState: string }> {
  const matches: Array<{ startPos: number; endPos: number; currentState: string }> = [];

  CHECKBOX_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CHECKBOX_REGEX.exec(lineText)) !== null) {
    matches.push({
      startPos: match.index,
      endPos: match.index + match[0].length,
      currentState: match[0],
    });
  }

  return matches;
}
