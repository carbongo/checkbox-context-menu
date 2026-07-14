# Obsidian marketplace scan fixes

## What the scan flagged

The Obsidian marketplace automated scan reported **71 issues** across three categories:

1. **CSS specificity errors (37 issues):** every rule in `styles.css` was flagged for
   using `!important`, which the marketplace prefers to avoid as it can interfere
   with user themes and snippets.
2. **TypeScript type-safety violations:** unsafe assignments, missing member-access
   guards, window timer typing, function signature mismatches.
3. **Linting and manifest issues:** unused imports, unnecessary non-null assertions,
   missing trailing periods in manifest.json, deprecated Obsidian API usage.

## CSS approach: doubled specificity, no `!important`

Instead of `!important` declarations, each rule now repeats the body class to raise
specificity without forcing importance. Before:

```css
input.task-list-item-checkbox[data-task="/"] {
  background: var(--color-yellow) !important;
}
```

After:

```css
body.checkbox-context-menu-styles.checkbox-context-menu-styles input.task-list-item-checkbox[data-task="/"] {
  background: var(--color-yellow);
}
```

Doubling the class selector from `(1,0,0)` to `(2,1,0)` overcomes Obsidian's default
theme checkbox rules without needing importance. As a bonus, the redundant
`-webkit-mask-image` vendor prefix was dropped — the standard `mask-image` property
covers all Electron/Chromium versions Obsidian runs on.

All **37 CSS !important declarations removed**.

## TypeScript fixes

- **`main.ts#loadData()` unsafe assignment:** cast via unknown to `Partial<CheckboxPluginSettings>` to clear type-safety errors.
- **`main.ts#activeDocument.body` for popout window compat:** replaced `document.body` (which is null in popout windows).
- **`main.ts#onunload()` signature:** changed from `async onunload()` to `void onunload()` — onunload cannot be async.
- **`reading-mode.ts` window timer typing:** used `window.setTimeout()`/`window.clearTimeout()` and typed timer as `number`.
- **`obsidian-augment.d.ts` missing import:** added `import { Menu } from 'obsidian'` to fix `no-undef` error on Menu type.
- **Removed unused imports and assertions:** `detector.ts`, detector/checkbox-states test files had redundant imports and unnecessary non-null operators.

## Linting workflow

Run `npm run lint` to execute the marketplace-equivalent linter:

- **ESLint config:** `eslint.config.mjs` uses eslint-plugin-obsidianmd (the plugin that powers the marketplace scan).
- **Typed linting:** projectService enabled with tsconfig.json for TypeScript type-safety checking.
- **CSS validation:** @eslint/css plugin with `css/no-invalid-properties` disabled (Obsidian custom properties would otherwise trigger false positives).
- **Manifest validation:** obsidianmd/validate-manifest rule checks manifest.json structure.

## Current state: 0 errors, 8 warnings

All **37 CSS !important errors eliminated**. All TypeScript type-safety violations fixed.
Remaining 8 warnings are **accepted deprecation notices** from Obsidian's own APIs:

- `settings.ts`: 7 warnings on deprecated `display`, `setWarning` methods and missing `getSettingDefinitions()`.
- `manifest.json`: 1 warning on manifest-as-JSON-object validation (cosmetic rule, does not block the plugin).

These deprecations cannot be fixed without breaking compatibility with Obsidian < 1.13.0 or rewriting the settings UI — not a priority for the current release cycle.

## Release workflow

The CI pipeline in `.github/workflows/release.yml` runs `npm run lint` as a pre-build check. Lint must stay at 0 errors before a release can proceed.

## Round 2 (1.1.1)

The post-1.1.0 scan surfaced four more findings, fixed as follows:

- **css-masks partial support** (`mask-image: none` in styles.css) — resolved by
  bumping `minAppVersion` to 1.13.0, where the feature is fully supported.
- **`display` deprecated (5 call sites)** — the settings tab's internal
  re-renders now call a private `render()`; the deprecated `display()` override
  just delegates to it, leaving no deprecated call sites.
- **`setWarning` deprecated** — replaced with `setDestructive()` (needs
  Obsidian 1.13, consistent with the minAppVersion bump).
- **Missing artifact attestations** — release.yml now runs
  `actions/attest-build-provenance@v2` over main.js/manifest.json/styles.css
  (with `id-token: write` + `attestations: write` permissions) before creating
  the draft release; checkout/setup-node bumped to v4 / Node 20.
