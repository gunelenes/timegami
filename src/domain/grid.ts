export type ChallengeKind = 'collection' | 'streak';
export type CellUnit = 'minute' | 'hour' | 'day';

/**
 * How a timestamp maps to a cell.
 * - wall_day / wall_week / wall_year: position within a repeating local-time cycle.
 * - free: no clock; the player picks the cell (e.g. minute of a football match).
 * - calendar: consecutive calendar days starting at `startDate` (streak challenges).
 */
export type GridClock = 'wall_day' | 'wall_week' | 'wall_year' | 'free' | 'calendar';

export interface GridConfig {
  kind: ChallengeKind;
  clock: GridClock;
  unit: CellUnit;
  /** Units per cell, e.g. 10 for "every 10 minutes". */
  step: number;
  cellCount: number;
  /** Local calendar date `YYYY-MM-DD`; required for the calendar clock. */
  startDate?: string;
}

export const UNIT_MINUTES: Record<CellUnit, number> = { minute: 1, hour: 60, day: 1440 };

const CYCLE_MINUTES = { wall_day: 1440, wall_week: 7 * 1440 } as const;
/** wall_year uses a leap-year layout so Feb 29 always has its own cell. */
export const DAYS_IN_WALL_YEAR = 366;

export class GridConfigError extends Error {}

function isPositiveInt(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

/** Number of cells implied by a repeating wall-clock cycle, or null if the cell size does not divide it evenly. */
export function wallCellCount(
  clock: 'wall_day' | 'wall_week' | 'wall_year',
  unit: CellUnit,
  step: number,
): number | null {
  if (clock === 'wall_year') {
    return unit === 'day' && DAYS_IN_WALL_YEAR % step === 0 ? DAYS_IN_WALL_YEAR / step : null;
  }
  const cellMinutes = UNIT_MINUTES[unit] * step;
  const cycle = CYCLE_MINUTES[clock];
  return cycle % cellMinutes === 0 ? cycle / cellMinutes : null;
}

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export function parseLocalDate(date: string): LocalDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new GridConfigError(`Invalid date: ${date}`);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new GridConfigError(`Invalid date: ${date}`);
  }
  return { year, month, day };
}

export function validateGridConfig(config: GridConfig): void {
  const { kind, clock, unit, step, cellCount } = config;
  if (!isPositiveInt(step)) throw new GridConfigError('step must be a positive integer');
  if (!isPositiveInt(cellCount)) throw new GridConfigError('cellCount must be a positive integer');
  if ((kind === 'streak') !== (clock === 'calendar')) {
    throw new GridConfigError('streak challenges use the calendar clock, and only they do');
  }
  if (clock === 'calendar') {
    if (unit !== 'day') throw new GridConfigError('calendar clock requires day units');
    if (!config.startDate) throw new GridConfigError('calendar clock requires startDate');
    parseLocalDate(config.startDate);
  } else if (clock !== 'free') {
    const expected = wallCellCount(clock, unit, step);
    if (expected === null) throw new GridConfigError(`${step} ${unit}(s) does not divide the ${clock} cycle`);
    if (expected !== cellCount) throw new GridConfigError(`cellCount must be ${expected} for this cycle`);
  }
}

/** Ready-made challenge setups shown when creating a room. */
export const GRID_TEMPLATES = {
  everyMinuteOfDay: { kind: 'collection', clock: 'wall_day', unit: 'minute', step: 1, cellCount: 1440 },
  every10MinutesOfDay: { kind: 'collection', clock: 'wall_day', unit: 'minute', step: 10, cellCount: 144 },
  everyHourOfWeek: { kind: 'collection', clock: 'wall_week', unit: 'hour', step: 1, cellCount: 168 },
  everyDayOfYear: { kind: 'collection', clock: 'wall_year', unit: 'day', step: 1, cellCount: 366 },
  matchMinutes: { kind: 'collection', clock: 'free', unit: 'minute', step: 1, cellCount: 90 },
  dailyStreak365: { kind: 'streak', clock: 'calendar', unit: 'day', step: 1, cellCount: 365 },
} satisfies Record<string, Omit<GridConfig, 'startDate'>>;
