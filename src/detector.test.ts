import { describe, it, expect } from 'vitest';
import { isTaskLine, findCheckboxOnLine } from './detector';

// ---------------------------------------------------------------------------
// TASK_LINE / isTaskLine
// ---------------------------------------------------------------------------

describe('isTaskLine', () => {
  // Positive cases — real task lines
  it('matches a dash list item with unchecked box', () => {
    expect(isTaskLine('- [ ] buy milk')).toBe(true);
  });

  it('matches an asterisk list item with checked box', () => {
    expect(isTaskLine('* [x] done')).toBe(true);
  });

  it('matches a plus list item with slash state', () => {
    expect(isTaskLine('+ [/] in progress')).toBe(true);
  });

  it('matches an ordered list with period delimiter', () => {
    expect(isTaskLine('1. [ ] numbered task')).toBe(true);
  });

  it('matches an ordered list with parenthesis delimiter', () => {
    expect(isTaskLine('1) [x] another numbered task')).toBe(true);
  });

  it('matches with leading whitespace / indentation', () => {
    expect(isTaskLine('  - [ ] indented task')).toBe(true);
    expect(isTaskLine('\t* [x] tab-indented task')).toBe(true);
  });

  it('matches any single character inside brackets', () => {
    expect(isTaskLine('- [!] important')).toBe(true);
    expect(isTaskLine('- [-] cancelled')).toBe(true);
    expect(isTaskLine('- [>] deferred')).toBe(true);
  });

  // Negative cases — must NOT match
  it('does NOT match a footnote reference like [1]: url', () => {
    expect(isTaskLine('[1]: https://example.com')).toBe(false);
  });

  it('does NOT match plain text containing [x] not in list position', () => {
    expect(isTaskLine('Press [x] to confirm')).toBe(false);
  });

  it('does NOT match a bare [ ] with no list marker', () => {
    expect(isTaskLine('[ ] no list marker')).toBe(false);
  });

  it('does NOT match a line that is just regular text', () => {
    expect(isTaskLine('just a sentence')).toBe(false);
  });

  it('does NOT match a list item without a checkbox bracket', () => {
    expect(isTaskLine('- plain list without checkbox')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findCheckboxOnLine
// ---------------------------------------------------------------------------

describe('findCheckboxOnLine', () => {
  it('returns null when the line has no checkbox', () => {
    expect(findCheckboxOnLine('- plain item')).toBeNull();
    expect(findCheckboxOnLine('')).toBeNull();
  });

  it('returns the first checkbox when no cursorOffset is provided', () => {
    const result = findCheckboxOnLine('- [x] task');
    expect(result).not.toBeNull();
    expect(result.currentState).toBe('[x]');
    expect(result.startPos).toBe(2);
  });

  it('returns the first checkbox when no cursorOffset and multiple exist', () => {
    const line = '[x] first [/] second';
    const result = findCheckboxOnLine(line);
    expect(result.currentState).toBe('[x]');
  });

  it('returns the closest checkbox to the cursor offset — near first checkbox', () => {
    // Line: "[x] hello [/] world"
    //        0123456789...
    // [x] at 0-3, [/] at 10-13
    const line = '[x] hello [/] world';
    // Cursor at col 1 — very close to [x]
    const result = findCheckboxOnLine(line, 1);
    expect(result.currentState).toBe('[x]');
  });

  it('returns the closest checkbox to the cursor offset — near second checkbox', () => {
    const line = '[x] hello [/] world';
    // Cursor at col 11 — inside [/]
    const result = findCheckboxOnLine(line, 11);
    expect(result.currentState).toBe('[/]');
  });

  it('when cursor is equidistant, returns whichever is measured closer by the dist formula', () => {
    // "[x] [/]" — [x] at 0-3, [/] at 4-7
    // Midpoint between endPos of [x] (3) and startPos of [/] (4) is 3.5
    // At offset 3: dist to [x] = min(|0-3|,|3-3|)=0, dist to [/]=min(|4-3|,|7-3|)=1 → [x] wins
    const line = '[x] [/]';
    expect(findCheckboxOnLine(line, 3).currentState).toBe('[x]');
    // At offset 4: dist to [x]=min(4,1)=1, dist to [/]=min(0,3)=0 → [/] wins
    expect(findCheckboxOnLine(line, 4).currentState).toBe('[/]');
  });

  it('returns correct position metadata', () => {
    const result = findCheckboxOnLine('- [ ] todo', 0);
    expect(result).toMatchObject({ startPos: 2, endPos: 5, currentState: '[ ]' });
  });
});
