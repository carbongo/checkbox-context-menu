import type { Editor, Menu } from 'obsidian';
import { CheckboxState, CheckboxPluginSettings } from './checkbox-states';
import type { CheckboxMatch } from './detector';

/**
 * Replace the checkbox bracket on `lineNum` with `[newChar]`, keeping the
 * caret in a sensible place relative to the edited span.
 */
export function replaceCheckbox(
  editor: Editor,
  lineNum: number,
  match: Pick<CheckboxMatch, 'startPos' | 'endPos'>,
  newChar: string,
): void {
  const currentLine = editor.getLine(lineNum);
  if (currentLine === null) return;

  const cursorBefore = editor.getCursor();
  const replacement = `[${newChar}]`;
  const oldLen = match.endPos - match.startPos;
  const newLine = currentLine.slice(0, match.startPos) + replacement + currentLine.slice(match.endPos);

  editor.setLine(lineNum, newLine);

  let newCharPos = cursorBefore.ch;
  if (cursorBefore.ch > match.startPos && cursorBefore.ch <= match.endPos) {
    newCharPos = match.startPos + replacement.length;
  } else if (cursorBefore.ch > match.endPos) {
    newCharPos += replacement.length - oldLen;
  }

  editor.setCursor({
    line: cursorBefore.line,
    ch: Math.max(0, Math.min(newCharPos, newLine.length)),
  });
}

/**
 * Populate a menu (or submenu) with one item per checkbox state, invoking
 * `onSelect` with the chosen state's char. Shared by the editor context menu
 * and the reading-mode context menu so both render identically.
 */
export function populateStateMenu(
  target: Menu,
  states: CheckboxState[],
  currentState: string,
  settings: CheckboxPluginSettings,
  onSelect: (char: string) => void,
): void {
  for (const state of states) {
    const isCurrent = `[${state.char}]` === currentState;

    // Emoji glyphs are shown inline in the title — `item.setIcon` only accepts
    // Obsidian icon IDs (e.g. "check-square"), not arbitrary glyphs, so passing
    // an emoji there would render nothing.
    const glyph = settings.showIcons && state.icon ? `${state.icon} ` : '';

    target.addItem((item) => {
      item.setTitle(glyph + state.label);

      // A native checkmark marks the current state; disabling keeps it from
      // being re-selected and gives a fallback cue if the theme hides checks.
      if (isCurrent && settings.highlightCurrent) {
        item.setChecked(true);
      }

      if (isCurrent) {
        item.setDisabled(true);
      }

      item.onClick(() => onSelect(state.char));
    });
  }
}

export function populateCheckboxSubmenu(
  submenu: Menu,
  editor: Editor,
  lineNum: number,
  checkboxMatch: CheckboxMatch,
  states: CheckboxState[],
  settings: CheckboxPluginSettings,
): void {
  populateStateMenu(submenu, states, checkboxMatch.currentState, settings, (char) => {
    replaceCheckbox(editor, lineNum, checkboxMatch, char);
  });
}
