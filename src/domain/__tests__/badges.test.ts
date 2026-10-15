import { BADGE_ORDER, GRID_TEMPLATES, GridConfig, applicableBadges, earnedBadges } from '..';

const T = GRID_TEMPLATES;
const day = T.everyMinuteOfDay as GridConfig;
const streak: GridConfig = { ...T.dailyStreak365, startDate: '2026-10-06' };
const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

describe('applicableBadges', () => {
  it('offers clock badges only where the grid has a time of day', () => {
    expect(applicableBadges(day)).toEqual(['firstCell', 'quarter', 'half', 'complete', 'nightOwl', 'fullHour']);
    expect(applicableBadges(T.matchMinutes as GridConfig)).toEqual(['firstCell', 'quarter', 'half', 'complete']);
  });

  it('offers streak badges only to streaks', () => {
    expect(applicableBadges(streak)).toEqual(['firstCell', 'quarter', 'half', 'complete', 'streak7', 'streak30']);
  });

  it('lists badges in display order', () => {
    for (const config of [day, streak]) {
      const ids = applicableBadges(config);
      expect([...ids].sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))).toEqual(ids);
    }
  });
});

describe('earnedBadges', () => {
  it('earns nothing on an empty board', () => {
    expect(earnedBadges(day, new Set())).toEqual(new Set());
  });

  it('earns the first cell and progress milestones', () => {
    expect(earnedBadges(day, new Set([600]))).toEqual(new Set(['firstCell']));
    expect(earnedBadges(day, new Set(range(600, 360)))).toEqual(new Set(['firstCell', 'quarter', 'fullHour']));
    expect(earnedBadges(day, new Set(range(0, 1440)))).toEqual(
      new Set(['firstCell', 'quarter', 'half', 'complete', 'nightOwl', 'fullHour']),
    );
  });

  it('earns night owl for a cell between 00:00 and 04:59', () => {
    expect(earnedBadges(day, new Set([299])).has('nightOwl')).toBe(true);
    expect(earnedBadges(day, new Set([300])).has('nightOwl')).toBe(false);
  });

  it('earns streak badges from the longest streak', () => {
    expect(earnedBadges(streak, new Set(range(0, 6)))).toEqual(new Set(['firstCell']));
    expect(earnedBadges(streak, new Set(range(10, 7)))).toEqual(new Set(['firstCell', 'streak7']));
    expect(earnedBadges(streak, new Set(range(0, 30)))).toEqual(new Set(['firstCell', 'streak7', 'streak30']));
  });
});
