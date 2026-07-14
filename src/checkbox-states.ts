/**
 * Checkbox state and settings definitions for checkbox context menu plugin.
 */

export interface CheckboxState {
  /** The character inside brackets: "", "x", "/", etc. */
  char: string;
  /** Display label in menu */
  label: string;
  /** Optional emoji/icon shown alongside label */
  icon?: string;
}

/** Settings persisted to Obsidian's data.json. */
export interface CheckboxPluginSettings {
  /** Array of char values that are currently enabled. */
  enabledStates: string[];
  /** Custom label/icon overrides keyed by char value. */
  stateOverrides: Record<string, Partial<Omit<CheckboxState, 'char'>>>;
  /** User-defined checkbox states beyond the defaults. */
  customStates: CheckboxState[];
  /** Whether to show icons next to labels in the menu. */
  showIcons: boolean;
  /** Whether to highlight the currently active state in the menu. */
  highlightCurrent: boolean;
  /** Whether to sort states alphabetically by label. */
  sortAlphabetically: boolean;
  /**
   * Menu order of state chars (defaults + custom), rearrangeable by drag and
   * drop in settings. Ignored while sortAlphabetically is on.
   */
  stateOrder: string[];
  /**
   * Whether the plugin injects its per-status checkbox styling (the coloured
   * glyphs from styles.css). On by default; users with their own theme/CSS can
   * turn it off so the plugin doesn't fight their styling.
   */
  injectStatusStyles: boolean;
}

/**
 * The char for an unchecked task. It is a single space so the rendered
 * markdown is a valid `[ ]` — an empty `[]` is not a task and can't be
 * re-detected by the checkbox regex.
 */
export const UNCHECKED_CHAR = " ";

/** Built-in checkbox states. */
export const DEFAULT_STATES: readonly CheckboxState[] = [
  { char: UNCHECKED_CHAR, label: "Unchecked", icon: "☐" },
  { char: "x", label: "Done", icon: "✓" },
  { char: "/", label: "Half-done", icon: "◐" },
  { char: ">", label: "Deferred", icon: "→" },
  { char: "<", label: "Scheduled", icon: "←" },
  { char: "!", label: "Important", icon: "!" },
  { char: "-", label: "Cancelled", icon: "−" },
] as const;

/** Default plugin settings — all states enabled, icons on, highlight on, no sort. */
export const DEFAULT_SETTINGS: CheckboxPluginSettings = {
  enabledStates: DEFAULT_STATES.map(s => s.char),
  stateOverrides: {},
  customStates: [],
  showIcons: true,
  highlightCurrent: true,
  sortAlphabetically: false,
  stateOrder: DEFAULT_STATES.map(s => s.char),
  injectStatusStyles: true,
};

/**
 * Return stateOrder cleaned against the current set of known states: chars of
 * removed states are dropped, and any known state missing from the order
 * (new default after an update, freshly added custom state, or a pre-order
 * settings file) is appended in its natural position.
 */
export function normalizeStateOrder(settings: CheckboxPluginSettings): string[] {
  const known = [...DEFAULT_STATES, ...settings.customStates].map(s => s.char);
  const order = (settings.stateOrder ?? []).filter(c => known.includes(c));
  for (const c of known) {
    if (!order.includes(c)) order.push(c);
  }
  return order;
}

/** All states (default + custom) in the user's configured order. */
export function getOrderedStates(settings: CheckboxPluginSettings): CheckboxState[] {
  const byChar = new Map([...DEFAULT_STATES, ...settings.customStates].map(s => [s.char, s]));
  // normalizeStateOrder only returns chars present in byChar.
  return normalizeStateOrder(settings)
    .map(c => byChar.get(c))
    .filter((s): s is CheckboxState => s !== undefined);
}

/**
 * Return the merged list of default + custom states that are currently enabled,
 * in the user's configured order, applying any label/icon overrides. With
 * alphabetical sort on, the order is by label instead, unchecked pinned first.
 */
export function getActiveStates(settings: CheckboxPluginSettings): CheckboxState[] {
  const active = getOrderedStates(settings)
    .filter(s => settings.enabledStates.includes(s.char))
    .map(s => ({
      ...s,
      ...settings.stateOverrides[s.char],
    }));

  if (settings.sortAlphabetically) {
    const empty = active.find(s => s.char === UNCHECKED_CHAR);
    const rest = active.filter(s => s.char !== UNCHECKED_CHAR);

    rest.sort((a, b) => a.label.localeCompare(b.label));

    return empty ? [empty, ...rest] : rest;
  }

  return active;
}
