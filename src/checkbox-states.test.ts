import { describe, it, expect } from 'vitest';
import {
  getActiveStates,
  DEFAULT_SETTINGS,
  DEFAULT_STATES,
  UNCHECKED_CHAR,
  CheckboxPluginSettings,
  normalizeStateOrder,
  getOrderedStates,
} from './checkbox-states';

// Helper: build a settings object from DEFAULT_SETTINGS with overrides.
function makeSettings(overrides: Partial<CheckboxPluginSettings>): CheckboxPluginSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

// ---------------------------------------------------------------------------
// Migration invariant
// ---------------------------------------------------------------------------

describe('UNCHECKED_CHAR', () => {
  it('is a single space character (not empty string)', () => {
    expect(UNCHECKED_CHAR).toBe(' ');
    expect(UNCHECKED_CHAR).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveStates — enabledStates filtering
// ---------------------------------------------------------------------------

describe('getActiveStates — enabledStates filtering', () => {
  it('returns only states whose char is in enabledStates', () => {
    const settings = makeSettings({ enabledStates: [UNCHECKED_CHAR, 'x'] });
    const result = getActiveStates(settings);
    const chars = result.map(s => s.char);
    expect(chars).toContain(UNCHECKED_CHAR);
    expect(chars).toContain('x');
    expect(chars).not.toContain('/');
    expect(chars).not.toContain('>');
    expect(result).toHaveLength(2);
  });

  it('returns no states when enabledStates is empty', () => {
    const result = getActiveStates(makeSettings({ enabledStates: [] }));
    expect(result).toHaveLength(0);
  });

  it('returns all default states when all are enabled (default settings)', () => {
    const result = getActiveStates(DEFAULT_SETTINGS);
    expect(result).toHaveLength(DEFAULT_STATES.length);
  });
});

// ---------------------------------------------------------------------------
// getActiveStates — stateOverrides
// ---------------------------------------------------------------------------

describe('getActiveStates — stateOverrides', () => {
  it('applies label override for a state', () => {
    const settings = makeSettings({
      stateOverrides: { x: { label: 'Completed' } },
    });
    const result = getActiveStates(settings);
    const done = result.find(s => s.char === 'x');
    expect(done.label).toBe('Completed');
  });

  it('applies icon override for a state', () => {
    const settings = makeSettings({
      stateOverrides: { '!': { icon: '🔥' } },
    });
    const result = getActiveStates(settings);
    const important = result.find(s => s.char === '!');
    expect(important.icon).toBe('🔥');
  });

  it('applies both label and icon override together', () => {
    const settings = makeSettings({
      stateOverrides: { '/': { label: 'In Progress', icon: '⏳' } },
    });
    const result = getActiveStates(settings);
    const half = result.find(s => s.char === '/');
    expect(half.label).toBe('In Progress');
    expect(half.icon).toBe('⏳');
  });

  it('does not mutate states that have no override', () => {
    const settings = makeSettings({
      stateOverrides: { x: { label: 'Completed' } },
    });
    const result = getActiveStates(settings);
    const unchecked = result.find(s => s.char === UNCHECKED_CHAR);
    expect(unchecked.label).toBe('Unchecked'); // original label preserved
  });
});

// ---------------------------------------------------------------------------
// getActiveStates — sortAlphabetically
// ---------------------------------------------------------------------------

describe('getActiveStates — sortAlphabetically: true', () => {
  it('keeps UNCHECKED_CHAR state first regardless of alphabetical order', () => {
    const settings = makeSettings({ sortAlphabetically: true });
    const result = getActiveStates(settings);
    expect(result[0].char).toBe(UNCHECKED_CHAR);
  });

  it('sorts remaining states alphabetically by label', () => {
    const settings = makeSettings({ sortAlphabetically: true });
    const result = getActiveStates(settings);
    const rest = result.slice(1);
    const labels = rest.map(s => s.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it('UNCHECKED_CHAR is still first even when its label would sort late (via override)', () => {
    // Override unchecked label to "Zzz" which would sort last alphabetically.
    const settings = makeSettings({
      sortAlphabetically: true,
      stateOverrides: { [UNCHECKED_CHAR]: { label: 'Zzz' } },
    });
    const result = getActiveStates(settings);
    expect(result[0].char).toBe(UNCHECKED_CHAR);
  });
});

describe('getActiveStates — sortAlphabetically: false', () => {
  it('preserves definition order (default)', () => {
    const settings = makeSettings({ sortAlphabetically: false });
    const result = getActiveStates(settings);
    // The enabled chars should appear in the same order as DEFAULT_STATES
    const expectedChars = DEFAULT_STATES.map(s => s.char);
    const resultChars = result.map(s => s.char);
    expect(resultChars).toEqual(expectedChars);
  });
});

// ---------------------------------------------------------------------------
// getActiveStates — customStates
// ---------------------------------------------------------------------------

describe('getActiveStates — customStates', () => {
  it('includes custom states when they are enabled', () => {
    const customState = { char: '?', label: 'Maybe', icon: '?' };
    const settings = makeSettings({
      customStates: [customState],
      enabledStates: [...DEFAULT_SETTINGS.enabledStates, '?'],
    });
    const result = getActiveStates(settings);
    const found = result.find(s => s.char === '?');
    expect(found).toBeDefined();
    expect(found.label).toBe('Maybe');
  });

  it('excludes custom states that are not in enabledStates', () => {
    const customState = { char: '?', label: 'Maybe', icon: '?' };
    const settings = makeSettings({
      customStates: [customState],
      // '?' deliberately NOT added to enabledStates
    });
    const result = getActiveStates(settings);
    expect(result.find(s => s.char === '?')).toBeUndefined();
  });

  it('applies stateOverrides to custom states too', () => {
    const customState = { char: '@', label: 'At', icon: '@' };
    const settings = makeSettings({
      customStates: [customState],
      enabledStates: [...DEFAULT_SETTINGS.enabledStates, '@'],
      stateOverrides: { '@': { label: 'Mention' } },
    });
    const result = getActiveStates(settings);
    const found = result.find(s => s.char === '@');
    expect(found.label).toBe('Mention');
  });
});

// ---------------------------------------------------------------------------
// stateOrder — drag-and-drop menu ordering
// ---------------------------------------------------------------------------

describe('stateOrder', () => {
  it('getActiveStates follows a custom stateOrder', () => {
    const settings = makeSettings({
      stateOrder: ['x', '!', UNCHECKED_CHAR, '/', '>', '<', '-'],
    });
    const chars = getActiveStates(settings).map(s => s.char);
    expect(chars).toEqual(['x', '!', UNCHECKED_CHAR, '/', '>', '<', '-']);
  });

  it('sortAlphabetically overrides stateOrder', () => {
    const settings = makeSettings({
      stateOrder: ['x', '!', UNCHECKED_CHAR, '/', '>', '<', '-'],
      sortAlphabetically: true,
    });
    const chars = getActiveStates(settings).map(s => s.char);
    expect(chars[0]).toBe(UNCHECKED_CHAR);
  });

  it('normalizeStateOrder appends states missing from the order', () => {
    const settings = makeSettings({
      customStates: [{ char: '?', label: 'Maybe' }],
      stateOrder: ['x', UNCHECKED_CHAR],
    });
    const order = normalizeStateOrder(settings);
    expect(order.slice(0, 2)).toEqual(['x', UNCHECKED_CHAR]);
    expect(order).toContain('?');
    expect(order).toHaveLength(DEFAULT_STATES.length + 1);
  });

  it('normalizeStateOrder drops chars of removed states', () => {
    const settings = makeSettings({
      stateOrder: ['zombie', ...DEFAULT_STATES.map(s => s.char)],
    });
    expect(normalizeStateOrder(settings)).not.toContain('zombie');
  });

  it('getOrderedStates includes disabled states (settings list shows all)', () => {
    const settings = makeSettings({ enabledStates: ['x'] });
    expect(getOrderedStates(settings)).toHaveLength(DEFAULT_STATES.length);
  });
});
