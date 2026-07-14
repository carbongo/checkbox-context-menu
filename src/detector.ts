/**
 * Checkbox detection logic — finds checkbox markers on a line given cursor position.
 */

import { Editor } from 'obsidian';
import { findCheckboxes } from './utils';

/**
 * A markdown line that renders as a task: a list marker (`-`, `*`, `+`, or an
 * ordered `1.` / `1)`) followed by a `[x]` checkbox. Used to make sure the
 * context menu only offers itself on real tasks, not on incidental `[x]`-like
 * text such as footnote refs (`[1]`) or shortcuts.
 */
export const TASK_LINE = /^\s*(?:[-*+]|\d+[.)])\s+\[.\]/;

/** Whether a line is a task line (see {@link TASK_LINE}). */
export function isTaskLine(lineText: string): boolean {
  return TASK_LINE.test(lineText);
}

/** A detected checkbox with its position and current state. */
export interface CheckboxMatch {
  /** Index in the line where `[` starts. */
  startPos: number;
  /** Index in the line after `]`. */
  endPos: number;
  /** Full bracket string, e.g. "[ ]", "[x]", "[/]". */
  currentState: string;
}

/**
 * Find the checkbox on a line closest to a given cursor offset.
 * If no offset is provided, returns the first checkbox on the line.
 * Returns null if no valid `[x]` checkbox exists.
 */
export function findCheckboxOnLine(lineText: string, cursorOffset?: number): CheckboxMatch | null {
  const matches = findCheckboxes(lineText);

  if (matches.length === 0) return null;

  if (cursorOffset === undefined) return matches[0];

  let closest: CheckboxMatch | null = null;
  let closestDist = Infinity;

  for (const m of matches) {
    const dist = Math.min(Math.abs(m.startPos - cursorOffset), Math.abs(m.endPos - cursorOffset));
    if (dist < closestDist) {
      closestDist = dist;
      closest = m;
    }
  }

  return closest;
}

/**
 * Get the current cursor line and column from Obsidian's Editor API.
 * Used at right-click time to determine which checkbox the user targeted.
 */
export function getCheckboxLineAndColumn(editor: Editor): { line: number; column: number } | null {
  const cursor = editor.getCursor();

  if (!cursor) return null;

  return { line: cursor.line, column: cursor.ch };
}
