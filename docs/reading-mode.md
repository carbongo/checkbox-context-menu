# Reading-mode (preview) context menu

The context menu works in two modes, via two different mechanisms:

| Mode | Trigger | Edit path |
|------|---------|-----------|
| Editing / Live Preview | `workspace.on('editor-menu')` | `Editor.replaceRange` / `setLine` |
| Reading (preview) — desktop | Right-click `contextmenu` event; `Menu.showAtMouseEvent` | `Vault.process` on the file |
| Reading (preview) — mobile/touch | Long-press (~500 ms) via `touchstart` timer; `Menu.showAtPosition` | `Vault.process` on the file |

## Why multiple paths

In reading mode there is no `Editor` — Obsidian renders task items as
`<input class="task-list-item-checkbox">`. So `editor-menu` never fires. Instead
`src/reading-mode.ts` attaches listeners to each rendered checkbox:

- **Desktop**: right-click fires `contextmenu`, which calls `Menu.showAtMouseEvent` with the native mouse position.
- **Mobile/touch**: a long-press (held for ~500 ms) opens the same menu via `Menu.showAtPosition` with the touch coordinates. The long-press timer is cancelled by `touchend`, `touchcancel`, or a `touchmove` beyond ~10 px (to avoid triggering during scrolls). A normal short tap is not intercepted — Obsidian's native checkbox toggle still works.

Both paths funnel through the same target-resolution and `vault.process` write logic.

## Mapping a clicked checkbox back to a source line

There is no line number on the rendered element. We recover it by order:

1. `context.getSectionInfo(element)` gives the block's `{ text, lineStart, lineEnd }`
   (`text` is the whole note).
2. Collect the task lines in `[lineStart, lineEnd]` (regex `TASK_LINE`, exported
   from `detector.ts` — bullet or ordered marker followed by `[x]`). The editor
   menu and cycle command use the same `isTaskLine` guard so neither fires on
   incidental `[x]`-like text (e.g. footnote refs `[1]`).
3. Find the clicked checkbox's index among all rendered checkboxes in the block.
4. Both lists are in document order, so index N → the Nth task line.

The write goes through `Vault.process` (atomic read-modify-write). It re-checks the
recorded `[start,end]` span and falls back to the first checkbox on the line if the
file shifted between opening the menu and clicking.

## Shared menu rendering

`menu.ts` exposes `populateStateMenu(target, states, currentState, settings, onSelect)`.
Both the editor submenu and the reading-mode menu call it, so items render
identically; only the `onSelect` side effect differs (editor edit vs. file write).
