# Checkbox Context Menu

Obsidian plugin — right-click context menu to toggle checkbox states.

## Run commands

```bash
npm install --legacy-peer-deps && npm run dev
npm run lint
npm test
```

## Key constraints

- **Never hand-write Obsidian type declarations.** Depend on the real `obsidian`
  package (installed with `--legacy-peer-deps`) so `npm run lint` catches non-existent
  APIs. A fake `src/obsidian.d.ts` once shipped invented methods and caused a
  "Failed to load" at startup — see `docs/load-failure-fix.md`.

## Docs

- `load-failure-fix.md` — why the plugin failed to load (fake API stub) and how it was fixed.
- `reading-mode.md` — how the context menu works in editing vs. reading (preview) mode, including mobile long-press.
- `unchecked-char-fix.md` — why the unchecked state uses `" "` (not `""`) and the settings migration.
- `status-styles.md` — the `styles.css` per-status styling and how it hooks the `data-task` attribute.
- `obsidian-marketplace.md` — how to publish/update on the Obsidian marketplace.
- `marketplace-scan-fixes.md` — the 71 marketplace scan issues, the CSS !important-free approach, TypeScript fixes, and linting workflow.
