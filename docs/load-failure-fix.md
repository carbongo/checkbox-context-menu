# "Failed to load" fix — fake Obsidian type stub

## Symptom

Plugin appeared in Obsidian's community-plugins list but showed a **"Failed to load"**
notice when enabled.

## Root cause

The repo had no `obsidian` dependency. Instead someone hand-wrote `src/obsidian.d.ts`
declaring the Obsidian API — and invented methods that **do not exist at runtime**:

- `Plugin.registerEditorContextMenu(cb)` — not a real API. First call in `onload()`,
  so `this.registerEditorContextMenu is not a function` threw → load failed.
- `Menu.addSubmenu(name, cb)` — not real either (would have thrown at right-click).
- `PluginSettingTab` constructor declared as `(app)` — real signature is `(app, plugin)`.
- `hotkeys.modifiers` typed as the string `'Ctrl|Shift'` — real type is `Modifier[]`.

TypeScript compiled cleanly against the fake types, hiding all of it.

## Fix

- Installed the real types: `npm i -D obsidian` (use `--legacy-peer-deps`; obsidian
  pins `@codemirror/state@6.5.0` which conflicts with the newer transitive copy).
- Deleted `src/obsidian.d.ts`.
- Editor context menu now uses the real event:
  `this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => ...))`.
- Submenu now uses `menu.addItem(item => { item.setSubmenu() })`. `setSubmenu()` is a
  real runtime method but missing from published typings, so it's augmented in
  `src/obsidian-augment.d.ts`.
- Settings tab constructed as `new CheckboxPluginSettingTab(this.app, this)`.
- Hotkey modifiers changed to `['Mod', 'Shift']`.
- Cleaned `manifest.json` to the valid Obsidian schema (dropped bogus `main`/`css`
  fields; `main.js` and `styles.css` are loaded by convention, not manifest keys).

## Lesson

Never hand-write the `obsidian` type surface. Depend on the real `obsidian` package so
`npm run lint` catches non-existent APIs before they reach Obsidian.
