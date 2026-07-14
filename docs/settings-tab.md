# Settings tab (`src/settings.ts`)

## Never call `display()` from a text input's `onChange`

`display()` empties and rebuilds the whole pane. Text `onChange` fires per
keystroke, so re-rendering there destroys the focused `<input>` — the user had
to re-click the field after every character. Instead, each state row updates
its own title in place (`refreshName()` → `setting.setName(...)`).
`display()` is still fine from discrete actions (button clicks, drag-drop),
where nothing holds focus worth preserving.

## Unified, drag-reorderable state list

Built-in and custom states render as one list (`addStateRow`), ordered by
`settings.stateOrder` (see `getOrderedStates` / `normalizeStateOrder` in
`checkbox-states.ts`). Each row has:

- a `⠿` grip — HTML5 drag and drop; only the grip arms `draggable`, so the
  text inputs keep normal selection. Drop reorders `stateOrder`, saves, and
  re-renders. `getActiveStates` follows this order for the context menu and
  cycle command; alphabetical sort, when on, overrides it.
- enable toggle, custom-label and custom-icon text inputs (overrides work for
  custom states too), and a Remove button on custom rows.

`normalizeStateOrder` self-heals the order on load and after add/remove:
unknown chars are dropped, missing known chars appended — this also migrates
pre-`stateOrder` settings files. Drag-handle CSS lives at the bottom of
`styles.css`, deliberately not gated behind the body class (it's plugin UI,
not note styling).
