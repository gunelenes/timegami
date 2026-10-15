import {
  GRID_TEMPLATES,
  GridConfig,
  Mark,
  completedHour,
  missingRanges,
  nextEmptyCell,
  recentActivity,
  streakReminderTimes,
} from '..';

const T = GRID_TEMPLATES;
const day = T.everyMinuteOfDay as GridConfig;
const tenMinutes = T.every10MinutesOfDay as GridConfig;
const match = T.matchMinutes as GridConfig;
const streak: GridConfig = { ...T.dailyStreak365, startDate: '2026-10-06' };
// 2026-10-12 14:37:30 in Istanbul (UTC+3)
const NOW = Date.UTC(2026, 9, 12, 11, 37, 30);
const TZ = 'Europe/Istanbul';
const NOW_CELL = 14 * 60 + 37;

describe('nextEmptyCell', () => {
  it('finds the next unfilled minute and how long until it starts', () => {
    const filled = new Set([NOW_CELL + 1, NOW_CELL + 2]);
    expect(nextEmptyCell(day, filled, NOW_CELL, NOW, TZ)).toEqual({ cell: NOW_CELL + 3, steps: 3, minutesUntil: 3 });
  });

  it('counts from the start of the current cell for coarser cells', () => {
    // 14:37 is inside the 14:30 cell (index 87); 14:40 starts in 3 minutes.
    expect(nextEmptyCell(tenMinutes, new Set(), 87, NOW, TZ)).toEqual({ cell: 88, steps: 1, minutesUntil: 3 });
  });

  it('wraps around midnight on repeating grids', () => {
    const filled = new Set(Array.from({ length: 1440 }, (_, i) => i).filter((i) => i !== 5));
    expect(nextEmptyCell(day, filled, 1430, NOW, TZ)?.cell).toBe(5);
  });

  it('ignores the current cell itself and returns null when everything else is filled', () => {
    const filled = new Set(Array.from({ length: 1440 }, (_, i) => i).filter((i) => i !== NOW_CELL));
    expect(nextEmptyCell(day, filled, NOW_CELL, NOW, TZ)).toBeNull();
  });

  it('does not wrap calendar grids and gives no minute estimate for days', () => {
    expect(nextEmptyCell(streak, new Set([7]), 6, NOW, TZ)).toEqual({ cell: 8, steps: 2, minutesUntil: null });
    expect(nextEmptyCell(streak, new Set(), 364, NOW, TZ)).toBeNull();
  });

  it('has nothing to say for grids without a clock', () => {
    expect(nextEmptyCell(match, new Set(), null, NOW, TZ)).toBeNull();
  });
});

describe('missingRanges', () => {
  it('groups consecutive unfilled cells', () => {
    expect(missingRanges(new Set([0, 1, 4, 7, 8, 9]), 10)).toEqual([
      { first: 2, last: 3 },
      { first: 5, last: 6 },
    ]);
  });

  it('is empty for a full grid and one range for an empty grid', () => {
    expect(missingRanges(new Set([0, 1, 2]), 3)).toEqual([]);
    expect(missingRanges(new Set(), 3)).toEqual([{ first: 0, last: 2 }]);
  });
});

describe('recentActivity', () => {
  const marks: (Mark & { id: string })[] = [
    { id: 'a', uid: 'ali', cellIndex: 5, occurredAt: 1 },
    { id: 'b', uid: 'ayse', cellIndex: 5, occurredAt: 2 },
    { id: 'c', uid: 'ali', cellIndex: 5, occurredAt: 3 },
    { id: 'd', uid: 'ali', cellIndex: 9, occurredAt: 4 },
  ];

  it('lists newest first and flags each player\'s first fill of a cell', () => {
    expect(recentActivity(marks, 10).map((a) => [a.mark.id, a.firstFill])).toEqual([
      ['d', true],
      ['c', false],
      ['b', true],
      ['a', true],
    ]);
  });

  it('respects the limit', () => {
    expect(recentActivity(marks, 2).map((a) => a.mark.id)).toEqual(['d', 'c']);
  });
});

describe('completedHour', () => {
  const hour3 = Array.from({ length: 60 }, (_, i) => 180 + i);

  it('returns the hour once all of its minutes are filled', () => {
    expect(completedHour(day, new Set(hour3), 200)).toBe(3);
    expect(completedHour(day, new Set(hour3.slice(1)), 200)).toBeNull();
  });

  it('works for coarser cells and the week', () => {
    expect(completedHour(tenMinutes, new Set([18, 19, 20, 21, 22, 23]), 20)).toBe(3);
    const week: GridConfig = { kind: 'collection', clock: 'wall_week', unit: 'minute', step: 1, cellCount: 10080 };
    expect(completedHour(week, new Set(hour3.map((c) => c + 1440)), 1440 + 200)).toBe(3);
  });

  it('does not apply to grids without an hour rhythm', () => {
    expect(completedHour(T.everyHourOfWeek as GridConfig, new Set([0]), 0)).toBeNull();
    expect(completedHour(match, new Set(Array.from({ length: 90 }, (_, i) => i)), 5)).toBeNull();
  });
});

describe('streakReminderTimes', () => {
  // 2026-10-12 14:37:30 Istanbul; the streak started 2026-10-06, so today is cell 6.
  const at = (dayOffset: number) => Date.UTC(2026, 9, 12 + dayOffset, 17, 0, 30); // 20:00:30 local

  it('reminds at 20:00 local on each coming day that is not filled yet', () => {
    expect(streakReminderTimes(streak, new Set([6, 8]), NOW, TZ, 20, 4)).toEqual([at(1), at(3)]);
    expect(streakReminderTimes(streak, new Set(), NOW, TZ, 20, 2)).toEqual([at(0), at(1)]);
  });

  it('skips today once 20:00 has passed', () => {
    const evening = Date.UTC(2026, 9, 12, 18, 0, 30); // 21:00 local
    expect(streakReminderTimes(streak, new Set(), evening, TZ, 20, 2)).toEqual([at(1)]);
  });

  it('stops at the end of the streak and waits for its start', () => {
    const short: GridConfig = { ...streak, cellCount: 8 };
    expect(streakReminderTimes(short, new Set(), NOW, TZ, 20, 5)).toEqual([at(0), at(1)]);
    const later: GridConfig = { ...streak, startDate: '2026-10-14' };
    expect(streakReminderTimes(later, new Set(), NOW, TZ, 20, 4)).toEqual([at(2), at(3)]);
  });

  it('is empty for grids that are not streaks', () => {
    expect(streakReminderTimes(day, new Set(), NOW, TZ, 20, 3)).toEqual([]);
  });
});
