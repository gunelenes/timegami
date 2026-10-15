import {
  GRID_TEMPLATES,
  GridConfig,
  LARGE_GRID_CELLS,
  NO_CELL,
  buildGridLayout,
  buildSections,
  cellLabel,
  localDateString,
} from '..';

const T = GRID_TEMPLATES;
const streak: GridConfig = { ...T.dailyStreak365, startDate: '2026-10-06' };
const allCells = (config: GridConfig) =>
  buildGridLayout(config, 'en-US')
    .rows.flatMap((r) => r.cells)
    .filter((c) => c !== NO_CELL);

describe('buildGridLayout', () => {
  it('lays the minute of day out as 24 hours x 60 minutes', () => {
    const layout = buildGridLayout(T.everyMinuteOfDay as GridConfig, 'en-US');
    expect(layout.rows).toHaveLength(24);
    expect(layout.columns).toBe(60);
    expect(layout.rows[3].label).toBe('03');
    expect(layout.rows[3].cells[47]).toBe(227);
  });

  it('lays 10-minute cells out as 24 x 6', () => {
    const layout = buildGridLayout(T.every10MinutesOfDay as GridConfig, 'en-US');
    expect(layout.rows).toHaveLength(24);
    expect(layout.columns).toBe(6);
  });

  it('lays the hour of week out by weekday', () => {
    const layout = buildGridLayout(T.everyHourOfWeek as GridConfig, 'en-US');
    expect(layout.rows.map((r) => r.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(layout.columns).toBe(24);
  });

  it('lays the year out by month with padding for short months', () => {
    const layout = buildGridLayout(T.everyDayOfYear as GridConfig, 'en-US');
    expect(layout.rows).toHaveLength(12);
    expect(layout.rows[1].label).toBe('Feb');
    expect(layout.rows[1].cells[28]).toBe(59); // Feb 29
    expect(layout.rows[1].cells[29]).toBe(NO_CELL);
    expect(layout.rows[2].cells[0]).toBe(60); // Mar 1
  });

  it('lays a 90-minute match out as 9 x 10', () => {
    const layout = buildGridLayout(T.matchMinutes as GridConfig, 'en-US');
    expect(layout.rows).toHaveLength(9);
    expect(layout.rows[6].label).toBe("61'");
  });

  it('lays streak days out in weeks', () => {
    const layout = buildGridLayout(streak, 'en-US');
    expect(layout.rows).toHaveLength(53);
    expect(layout.columns).toBe(7);
    expect(layout.rows[0].label).toBe('Oct 6');
    expect(layout.rows[52].cells).toEqual([364, NO_CELL, NO_CELL, NO_CELL, NO_CELL, NO_CELL, NO_CELL]);
  });

  it('contains every cell exactly once', () => {
    for (const config of [
      T.everyMinuteOfDay,
      T.every10MinutesOfDay,
      T.everyHourOfWeek,
      T.everyDayOfYear,
      T.matchMinutes,
      streak,
      { kind: 'collection', clock: 'wall_day', unit: 'hour', step: 1, cellCount: 24 },
      { kind: 'collection', clock: 'free', unit: 'day', step: 1, cellCount: 5 },
      // Cell sizes that do not divide an hour / a day fall back to plain rows.
      { kind: 'collection', clock: 'wall_day', unit: 'minute', step: 8, cellCount: 180 },
      { kind: 'collection', clock: 'wall_week', unit: 'minute', step: 7, cellCount: 1440 },
    ] as GridConfig[]) {
      expect(allCells(config)).toEqual(Array.from({ length: config.cellCount }, (_, i) => i));
    }
  });
});

describe('buildSections', () => {
  const minuteOfWeek: GridConfig = { kind: 'collection', clock: 'wall_week', unit: 'minute', step: 1, cellCount: 10080 };
  const sectionCells = (config: GridConfig) =>
    buildSections(config, 'en-US')!
      .flatMap((s) => s.layout.rows.flatMap((r) => r.cells))
      .filter((c) => c !== NO_CELL);

  it('leaves grids up to the limit whole', () => {
    expect(buildSections(T.everyMinuteOfDay as GridConfig, 'en-US')).toBeNull();
    expect(buildSections(T.everyDayOfYear as GridConfig, 'en-US')).toBeNull();
    expect(LARGE_GRID_CELLS).toBeGreaterThanOrEqual(1440);
  });

  it('splits the minute of week into days of 24 x 60', () => {
    const sections = buildSections(minuteOfWeek, 'en-US')!;
    expect(sections.map((s) => s.label)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(sections[1]).toMatchObject({ first: 1440, count: 1440 });
    expect(sections[1].layout.rows).toHaveLength(24);
    expect(sections[1].layout.columns).toBe(60);
    expect(sections[1].layout.rows[3].label).toBe('03');
    expect(sections[1].layout.rows[3].cells[47]).toBe(1440 + 227);
  });

  it('splits 5-minute cells of the week into days of 24 x 12', () => {
    const sections = buildSections({ ...minuteOfWeek, step: 5, cellCount: 2016 }, 'en-US')!;
    expect(sections).toHaveLength(7);
    expect(sections[6]).toMatchObject({ first: 6 * 288, count: 288 });
    expect(sections[6].layout.columns).toBe(12);
  });

  it('splits long free grids into blocks of 500', () => {
    const sections = buildSections({ kind: 'collection', clock: 'free', unit: 'minute', step: 1, cellCount: 5000 }, 'en-US')!;
    expect(sections).toHaveLength(10);
    expect(sections[0].label).toBe("1' – 500'");
    expect(sections[9]).toMatchObject({ first: 4500, count: 500 });
  });

  it('splits long streaks into 52-week blocks', () => {
    const sections = buildSections({ ...streak, cellCount: 2000 }, 'en-US')!;
    expect(sections.map((s) => s.count)).toEqual([364, 364, 364, 364, 364, 180]);
    expect(sections[0].label).toBe('Oct 6, 2026 – Oct 4, 2027');
    expect(sections[0].layout.columns).toBe(7);
    expect(sections[0].layout.rows[0].label).toBe('Oct 6');
  });

  it('covers every cell exactly once', () => {
    for (const config of [
      minuteOfWeek,
      { ...minuteOfWeek, step: 3, cellCount: 3360 },
      { kind: 'collection', clock: 'free', unit: 'day', step: 1, cellCount: 1777 },
      { ...streak, cellCount: 2000 },
    ] as GridConfig[]) {
      expect(sectionCells(config)).toEqual(Array.from({ length: config.cellCount }, (_, i) => i));
    }
  });
});

describe('cellLabel', () => {
  it('formats each grid type', () => {
    expect(cellLabel(T.everyMinuteOfDay as GridConfig, 227, 'en-US')).toBe('03:47');
    expect(cellLabel(T.every10MinutesOfDay as GridConfig, 22, 'en-US')).toBe('03:40');
    expect(cellLabel(T.everyHourOfWeek as GridConfig, 14, 'en-US')).toBe('Mon 14:00');
    expect(cellLabel(T.everyDayOfYear as GridConfig, 59, 'en-US')).toBe('Feb 29');
    expect(cellLabel(T.matchMinutes as GridConfig, 66, 'en-US')).toBe("67'");
    expect(cellLabel(streak, 1, 'en-US')).toBe('Oct 7, 2026');
  });

  it('localizes names', () => {
    expect(cellLabel(T.everyHourOfWeek as GridConfig, 14, 'tr-TR')).toBe('Pzt 14:00');
  });
});

describe('localDateString', () => {
  it('zero-pads', () => {
    expect(localDateString({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07');
  });
});
