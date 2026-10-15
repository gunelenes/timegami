import { Mark, buildBoard, collectionProgress, filledCells, streakProgress } from '..';

const marks: Mark[] = [
  { uid: 'ali', cellIndex: 5, occurredAt: 1 },
  { uid: 'ali', cellIndex: 5, occurredAt: 2 },
  { uid: 'ayse', cellIndex: 5, occurredAt: 3 },
  { uid: 'ayse', cellIndex: 7, occurredAt: 4 },
];

describe('buildBoard', () => {
  it('shares a cell between players and counts repeats', () => {
    const board = buildBoard(marks);
    expect(board.get(5)).toEqual(new Map([['ali', 2], ['ayse', 1]]));
    expect(board.get(7)).toEqual(new Map([['ayse', 1]]));
  });

  it('filters to one player for the personal board', () => {
    const board = buildBoard(marks, 'ali');
    expect([...board.keys()]).toEqual([5]);
  });
});

describe('collectionProgress', () => {
  it('counts each cell once and lists what is missing', () => {
    const p = collectionProgress(filledCells(marks), 10);
    expect(p.filled).toBe(2);
    expect(p.ratio).toBeCloseTo(0.2);
    expect(p.missing).toEqual([0, 1, 2, 3, 4, 6, 8, 9]);
  });

  it('is per player when a uid is given', () => {
    expect(collectionProgress(filledCells(marks, 'ali'), 10).filled).toBe(1);
  });
});

describe('streakProgress', () => {
  const filled = new Set([0, 1, 2, 4, 5]);

  it('tracks the current and longest run', () => {
    expect(streakProgress(filled, 10, 5)).toEqual({ current: 2, longest: 3, filled: 5, missed: [3] });
  });

  it('keeps the streak alive while today is still empty', () => {
    expect(streakProgress(filled, 10, 6)).toEqual({ current: 2, longest: 3, filled: 5, missed: [3] });
  });

  it('breaks the streak after a missed day but keeps counting', () => {
    expect(streakProgress(filled, 10, 7)).toEqual({ current: 0, longest: 3, filled: 5, missed: [3, 6] });
  });

  it('is empty before the start', () => {
    expect(streakProgress(new Set(), 10, -1)).toEqual({ current: 0, longest: 0, filled: 0, missed: [] });
  });

  it('freezes after the end', () => {
    const all = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(streakProgress(all, 10, 15)).toEqual({ current: 10, longest: 10, filled: 10, missed: [] });
    expect(streakProgress(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]), 10, 15).missed).toEqual([9]);
  });

  it('counts backfilled days', () => {
    expect(streakProgress(new Set([0, 1, 2, 3, 4, 5]), 10, 6).current).toBe(6);
  });
});
