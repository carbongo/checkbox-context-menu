import { describe, it, expect } from 'vitest';
import { findCheckboxes } from './utils';

describe('findCheckboxes', () => {
  it('returns empty array when line has no checkbox', () => {
    expect(findCheckboxes('- plain list item')).toEqual([]);
    expect(findCheckboxes('')).toEqual([]);
    expect(findCheckboxes('no brackets here')).toEqual([]);
  });

  it('finds a single checkbox with correct startPos, endPos, and currentState', () => {
    const result = findCheckboxes('- [x] do something');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ startPos: 2, endPos: 5, currentState: '[x]' });
  });

  it('finds an unchecked checkbox [ ] (single space char)', () => {
    const result = findCheckboxes('- [ ] todo item');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ startPos: 2, endPos: 5, currentState: '[ ]' });
  });

  it('finds a half-done checkbox [/]', () => {
    const result = findCheckboxes('* [/] in progress');
    expect(result).toHaveLength(1);
    expect(result[0].currentState).toBe('[/]');
  });

  it('finds multiple checkboxes on a single line in order', () => {
    // Contrived line with two checkboxes
    const line = '[x] first [/] second';
    const result = findCheckboxes(line);
    expect(result).toHaveLength(2);
    expect(result[0].currentState).toBe('[x]');
    expect(result[0].startPos).toBe(0);
    expect(result[0].endPos).toBe(3);
    expect(result[1].currentState).toBe('[/]');
    expect(result[1].startPos).toBe(10);
    expect(result[1].endPos).toBe(13);
  });

  it('resets lastIndex between calls — calling twice gives the same result', () => {
    const line = '- [x] task';
    const first = findCheckboxes(line);
    const second = findCheckboxes(line);
    expect(second).toEqual(first);
  });

  it('endPos equals startPos + 3 for every match (bracket + char + bracket)', () => {
    const result = findCheckboxes('- [x] a [!] b [-] c');
    expect(result).toHaveLength(3);
    for (const m of result) {
      expect(m.endPos - m.startPos).toBe(3);
    }
  });
});
