# Unchecked state: use `" "`, not `""`

## Symptom

Choosing **Unchecked** from the menu "ruined" the checkbox: the line became
`- []` instead of `- [ ]`, which Obsidian no longer renders as a task, and the
context menu could no longer find the checkbox to fix it.

## Root cause

The unchecked state was defined with `char: ""`. Writing `` `[${char}]` ``
therefore produced `[]` (no space). Two things break with `[]`:

1. Obsidian doesn't treat `[]` as a task — it renders as literal text.
2. The detector regex is `/\[.\]/` (exactly one char between brackets), so `[]`
   matches nothing. The checkbox becomes undetectable, and the cycle command
   couldn't recognise a real `[ ]` as "Unchecked" either (it extracts `" "` from
   `[ ]`, which never equalled the state's `""`).

## Fix

`UNCHECKED_CHAR = " "` in `checkbox-states.ts` is now the single source of truth
for the unchecked state's char. `[${" "}]` → `[ ]`, which is valid and
re-detectable, and the cycle command's `" "` extraction now matches.

`main.ts#migrateEmptyUncheckedChar` rewrites any persisted `""` (in
`enabledStates` and `stateOverrides` keys) to `" "` on load, so existing vaults
keep the state enabled and start rendering `[ ]`.

Custom states now reject `" "` and the empty string, and reject chars that
collide with a built-in state, so this ambiguity can't be reintroduced.
