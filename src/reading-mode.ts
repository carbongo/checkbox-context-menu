/**
 * Reading-mode (preview) context menu.
 *
 * There is no Editor in reading mode — checkboxes are rendered as HTML
 * `<input>` elements. We attach a right-click handler via a markdown post
 * processor, map the clicked checkbox back to its source line, and edit the
 * underlying file directly with `vault.process`.
 *
 * On touch / mobile devices there is no right-click, so we also attach a
 * long-press detector (touchstart → 500 ms timer → menu).  A short tap is
 * left undisturbed so Obsidian's native toggle still works.
 */

import { App, Menu, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { CheckboxPluginSettings, getActiveStates } from './checkbox-states';
import { findCheckboxOnLine, TASK_LINE } from './detector';
import { populateStateMenu } from './menu';

/** Rendered task checkbox input in reading mode. */
const CHECKBOX_SELECTOR = 'input.task-list-item-checkbox';

/** How long (ms) a touch must be held to trigger the long-press menu. */
const LONG_PRESS_MS = 500;

/** Maximum finger travel (px) before a touch is treated as a scroll, not a press. */
const MOVE_THRESHOLD_PX = 10;

/**
 * Attach right-click handlers to every rendered task checkbox in a block.
 * Call this from `registerMarkdownPostProcessor`. Listeners live and die with
 * the rendered elements, which Obsidian removes on re-render.
 */
export function attachReadingModeMenu(
  app: App,
  getSettings: () => CheckboxPluginSettings,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
): void {
  const checkboxes = element.querySelectorAll<HTMLInputElement>(CHECKBOX_SELECTOR);

  checkboxes.forEach((checkbox) => {
    // Desktop: native right-click context menu.
    checkbox.addEventListener('contextmenu', (evt) => {
      showReadingModeMenuAtMouse(app, getSettings(), evt, checkbox, element, context);
    });

    // Mobile / touch: long-press opens the same menu via showAtPosition.
    attachLongPressHandler(app, getSettings, checkbox, element, context);
  });
}

/**
 * Attach touchstart/touchend/touchmove/touchcancel listeners that fire the
 * reading-mode menu after LONG_PRESS_MS of stationary touch.
 */
function attachLongPressHandler(
  app: App,
  getSettings: () => CheckboxPluginSettings,
  checkbox: HTMLInputElement,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
): void {
  let timerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startEvent: TouchEvent | null = null;

  function cancel(): void {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    startEvent = null;
  }

  checkbox.addEventListener('touchstart', (evt) => {
    const touch = evt.touches[0];
    if (!touch) return;

    startX = touch.clientX;
    startY = touch.clientY;
    startEvent = evt;

    timerId = window.setTimeout(() => {
      timerId = null;
      if (startEvent) {
        // Suppress text-selection callout / native context menu on the long press.
        startEvent.preventDefault();
      }
      startEvent = null;
      showReadingModeMenuAtPosition(
        app,
        getSettings(),
        startX,
        startY,
        checkbox,
        element,
        context,
      );
    }, LONG_PRESS_MS);
  }, { passive: false });

  checkbox.addEventListener('touchend', () => {
    cancel();
  });

  checkbox.addEventListener('touchcancel', () => {
    cancel();
  });

  checkbox.addEventListener('touchmove', (evt) => {
    const touch = evt.touches[0];
    if (!touch) { cancel(); return; }
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD_PX) {
      cancel();
    }
  });
}

// ---------------------------------------------------------------------------
// Shared resolution logic
// ---------------------------------------------------------------------------

/**
 * Resolve the source line for `checkbox` within `element`/`context`.
 * Returns the info needed to build the menu, or null if resolution fails.
 */
function resolveCheckbox(
  app: App,
  checkbox: HTMLInputElement,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
): {
  file: TFile;
  targetLine: number;
  match: NonNullable<ReturnType<typeof findCheckboxOnLine>>;
} | null {
  const section = context.getSectionInfo(element);
  if (!section) return null;

  const file = app.vault.getAbstractFileByPath(context.sourcePath);
  if (!(file instanceof TFile)) return null;

  // Position of this checkbox among all rendered task checkboxes in the block.
  const allCheckboxes = Array.from(element.querySelectorAll<HTMLInputElement>(CHECKBOX_SELECTOR));
  const domIndex = allCheckboxes.indexOf(checkbox);
  if (domIndex < 0) return null;

  // Map DOM order → source line: both the rendered checkboxes and the task
  // lines within the section are in document order, so the Nth checkbox
  // corresponds to the Nth task line.
  const lines = section.text.split('\n');
  const taskLineNumbers: number[] = [];
  for (let i = section.lineStart; i <= section.lineEnd && i < lines.length; i++) {
    if (TASK_LINE.test(lines[i])) {
      taskLineNumbers.push(i);
    }
  }

  const targetLine = taskLineNumbers[domIndex];
  if (targetLine === undefined) return null;

  const match = findCheckboxOnLine(lines[targetLine]);
  if (!match) return null;

  return { file, targetLine, match };
}

/**
 * Build and populate the state-picker Menu, wiring up the vault write.
 * Returns the Menu so the caller can position it.
 */
function buildMenu(
  app: App,
  settings: CheckboxPluginSettings,
  file: TFile,
  targetLine: number,
  match: NonNullable<ReturnType<typeof findCheckboxOnLine>>,
): Menu {
  const states = getActiveStates(settings);
  const menu = new Menu();
  populateStateMenu(menu, states, match.currentState, settings, (char) => {
    void applyChange(app, file, targetLine, match.startPos, match.endPos, char);
  });
  return menu;
}

// ---------------------------------------------------------------------------
// Event-type-specific entry points
// ---------------------------------------------------------------------------

/**
 * Right-click / contextmenu path (desktop).
 * Uses `menu.showAtMouseEvent` so native positioning logic is preserved.
 */
function showReadingModeMenuAtMouse(
  app: App,
  settings: CheckboxPluginSettings,
  evt: MouseEvent,
  checkbox: HTMLInputElement,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
): void {
  const resolved = resolveCheckbox(app, checkbox, element, context);
  if (!resolved) return;

  // Only take over the event once we know we have a real target.
  evt.preventDefault();
  evt.stopPropagation();

  const menu = buildMenu(app, settings, resolved.file, resolved.targetLine, resolved.match);
  menu.showAtMouseEvent(evt);
}

/**
 * Long-press / touch path (mobile).
 * Uses `menu.showAtPosition` with the touch coordinates.
 */
function showReadingModeMenuAtPosition(
  app: App,
  settings: CheckboxPluginSettings,
  x: number,
  y: number,
  checkbox: HTMLInputElement,
  element: HTMLElement,
  context: MarkdownPostProcessorContext,
): void {
  const resolved = resolveCheckbox(app, checkbox, element, context);
  if (!resolved) return;

  const menu = buildMenu(app, settings, resolved.file, resolved.targetLine, resolved.match);
  menu.showAtPosition({ x, y });
}

// ---------------------------------------------------------------------------
// File write
// ---------------------------------------------------------------------------

async function applyChange(
  app: App,
  file: TFile,
  lineNum: number,
  startPos: number,
  endPos: number,
  newChar: string,
): Promise<void> {
  await app.vault.process(file, (content) => {
    const lines = content.split('\n');
    const line = lines[lineNum];
    if (line === undefined) return content;

    const replacement = `[${newChar}]`;

    // Prefer the exact span recorded when the menu opened; if the file shifted
    // in the meantime, fall back to the first checkbox on the line.
    if (/^\[.\]$/.test(line.slice(startPos, endPos))) {
      lines[lineNum] = line.slice(0, startPos) + replacement + line.slice(endPos);
    } else {
      const current = findCheckboxOnLine(line);
      if (!current) return content;
      lines[lineNum] = line.slice(0, current.startPos) + replacement + line.slice(current.endPos);
    }

    return lines.join('\n');
  });
}
