# Status styles (`styles.css`)

Obsidian only renders a checkmark for the built-in `done` (`x`) state. Every
other status renders as a plain empty box, so switching to `/`, `>`, `<`, `!`,
or `-` looked like nothing changed. `styles.css` ships per-status styling so
each state is visually distinct.

## Optional — gated behind a body class

Obsidian always loads `styles.css`, but every rule is scoped under
`body.checkbox-context-menu-styles`. `main.ts` toggles that class from the
**Inject status styles** setting (`injectStatusStyles`, on by default) via
`applyStatusStyles()`. With the setting off the class is absent and all rules go
inert, so users with their own theme/snippet can turn the plugin's styling off.
The class is also removed on unload (`this.register(...)`).

## How it hooks in

The status character lives in **different places** in the two modes, which is
what tripped up earlier versions:

- **Live Preview (CM6):** there is no `<li>`; the char is on the
  `<input class="task-list-item-checkbox" data-task="…">` itself.
- **Reading mode:** the char reliably sits on the parent
  `<li class="task-list-item" data-task="…">`; the input may **not** carry it.

An input-only selector (`input.task-list-item-checkbox[data-task="…"]`) therefore
matched Live Preview but silently missed Reading mode. So every rule targets the
input **two ways** — by its own `data-task` and by the parent li's `data-task`:

```
input.task-list-item-checkbox[data-task="/"],
.task-list-item[data-task="/"] input.task-list-item-checkbox { … }
```

Every declaration is `!important` so the default theme's own, more-specific
checkbox rules can't override the border/glyph in either mode (previously only
the `!important` background applied in Reading mode, leaving a half-styled box).

For non-`x` states we force `appearance: none`, make the box transparent
(clearing Obsidian's default background/checkmark), and draw our own glyph with
`::after`. `appearance: none` is what lets pseudo-elements render on the
checkbox input.

## Current mapping

| Char | State      | Colour            | Glyph            |
|------|------------|-------------------|------------------|
| `/`  | Half-done  | yellow            | left-half fill   |
| `>`  | Deferred   | blue              | `→`              |
| `<`  | Scheduled  | orange            | `←`              |
| `!`  | Important  | red               | `!`              |
| `-`  | Cancelled  | faint + strikethrough | `–`          |

Colours use Obsidian's built-in theme variables (`--color-yellow`,
`--text-faint`, …) so they adapt to light/dark and the active theme.

## Notes

- Custom user states get **no** styling here (their char is unknown at build
  time); they still render as Obsidian's default box. The context menu still
  labels and switches them correctly.
- A theme with its own `data-task` styling may override or combine with these
  rules — that's expected; these are sensible defaults, not a hard override.
