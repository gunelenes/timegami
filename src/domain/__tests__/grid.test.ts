import { GRID_TEMPLATES, GridConfig, GridConfigError, validateGridConfig, wallCellCount } from '..';

describe('validateGridConfig', () => {
  it('accepts every template', () => {
    for (const t of Object.values(GRID_TEMPLATES)) {
      const config: GridConfig = t.clock === 'calendar' ? { ...t, startDate: '2026-10-06' } : t;
      expect(() => validateGridConfig(config)).not.toThrow();
    }
  });

  it('accepts custom free grids of any size', () => {
    expect(() =>
      validateGridConfig({ kind: 'collection', clock: 'free', unit: 'minute', step: 1, cellCount: 120 }),
    ).not.toThrow();
  });

  it('rejects cell sizes that do not divide the cycle', () => {
    expect(() =>
      validateGridConfig({ kind: 'collection', clock: 'wall_day', unit: 'minute', step: 7, cellCount: 205 }),
    ).toThrow(GridConfigError);
  });

  it('rejects a cellCount that does not match the cycle', () => {
    expect(() =>
      validateGridConfig({ kind: 'collection', clock: 'wall_day', unit: 'minute', step: 10, cellCount: 100 }),
    ).toThrow(GridConfigError);
  });

  it('ties streaks to the calendar clock', () => {
    expect(() => validateGridConfig({ ...GRID_TEMPLATES.everyMinuteOfDay, kind: 'streak' })).toThrow(GridConfigError);
    expect(() =>
      validateGridConfig({ ...GRID_TEMPLATES.dailyStreak365, kind: 'collection', startDate: '2026-10-06' }),
    ).toThrow(GridConfigError);
  });

  it('requires a real start date for streaks', () => {
    expect(() => validateGridConfig(GRID_TEMPLATES.dailyStreak365)).toThrow(GridConfigError);
    expect(() => validateGridConfig({ ...GRID_TEMPLATES.dailyStreak365, startDate: '2027-02-29' })).toThrow(
      GridConfigError,
    );
    expect(() => validateGridConfig({ ...GRID_TEMPLATES.dailyStreak365, startDate: '6.10.2026' })).toThrow(
      GridConfigError,
    );
  });

  it('rejects non-positive or fractional sizes', () => {
    expect(() => validateGridConfig({ ...GRID_TEMPLATES.matchMinutes, cellCount: 0 })).toThrow(GridConfigError);
    expect(() => validateGridConfig({ ...GRID_TEMPLATES.matchMinutes, step: 1.5 })).toThrow(GridConfigError);
  });
});

describe('wallCellCount', () => {
  it('derives cell counts from the cycle', () => {
    expect(wallCellCount('wall_day', 'minute', 1)).toBe(1440);
    expect(wallCellCount('wall_day', 'minute', 15)).toBe(96);
    expect(wallCellCount('wall_day', 'hour', 1)).toBe(24);
    expect(wallCellCount('wall_week', 'day', 1)).toBe(7);
    expect(wallCellCount('wall_year', 'day', 1)).toBe(366);
    expect(wallCellCount('wall_year', 'hour', 1)).toBeNull();
  });
});
