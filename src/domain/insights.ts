import { GridConfig, UNIT_MINUTES } from './grid';
import type { Mark } from './progress';
import { calendarPosition } from './cells';
import { toLocalParts } from './time';

const isRepeating = (config: GridConfig) =>
  config.clock === 'wall_day' || config.clock === 'wall_week' || config.clock === 'wall_year';

/** Minutes since the start of the current day/week cycle, or null for clocks without a minute rhythm. */
function minuteOfCycle(timestampMs: number, config: GridConfig, timeZone: string): number | null {
  if (config.clock !== 'wall_day' && config.clock !== 'wall_week') return null;
  const local = toLocalParts(timestampMs, timeZone);
  const ofDay = local.hour * 60 + local.minute;
  return config.clock === 'wall_day' ? ofDay : local.weekday * 1440 + ofDay;
}

export interface NextEmpty {
  cell: number;
  /** Cells ahead of the current one. */
  steps: number;
  /** Whole minutes until that cell starts; null for day-sized cells and calendars. */
  minutesUntil: number | null;
}

/**
 * The first cell after the current one that is not filled yet, wrapping around repeating cycles.
 * Tells the player when to be ready next.
 */
export function nextEmptyCell(
  config: GridConfig,
  filled: Set<number>,
  nowCell: number | null,
  nowMs: number,
  timeZone: string,
): NextEmpty | null {
  if (nowCell === null) return null;
  const wraps = isRepeating(config);
  for (let steps = 1; steps < config.cellCount; steps++) {
    let cell = nowCell + steps;
    if (cell >= config.cellCount) {
      if (!wraps) return null;
      cell -= config.cellCount;
    }
    if (filled.has(cell)) continue;
    const cellMinutes = UNIT_MINUTES[config.unit] * config.step;
    const elapsed = minuteOfCycle(nowMs, config, timeZone);
    return { cell, steps, minutesUntil: elapsed === null ? null : steps * cellMinutes - (elapsed % cellMinutes) };
  }
  return null;
}

export interface CellRange {
  first: number;
  last: number;
}

/** Unfilled cells grouped into consecutive runs, e.g. 03:12–03:15. */
export function missingRanges(filled: Set<number>, cellCount: number): CellRange[] {
  const ranges: CellRange[] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    if (filled.has(cell)) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.last === cell - 1) last.last = cell;
    else ranges.push({ first: cell, last: cell });
  }
  return ranges;
}

export interface ActivityItem<M extends Mark> {
  mark: M;
  /** The player's first mark in this cell, i.e. a newly captured cell. */
  firstFill: boolean;
}

/** Latest marks, newest first, for the room's activity feed. */
export function recentActivity<M extends Mark & { id: string }>(marks: M[], limit: number): ActivityItem<M>[] {
  const firstOf = new Map<string, M>();
  for (const mark of marks) {
    const key = `${mark.uid}:${mark.cellIndex}`;
    const seen = firstOf.get(key);
    if (!seen || mark.occurredAt < seen.occurredAt) firstOf.set(key, mark);
  }
  return [...marks]
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, limit)
    .map((mark) => ({ mark, firstFill: firstOf.get(`${mark.uid}:${mark.cellIndex}`) === mark }));
}

/** Cells per clock hour when the grid splits hours evenly into several cells, else null. */
export function cellsPerHour(config: GridConfig): number | null {
  if (config.clock !== 'wall_day' && config.clock !== 'wall_week') return null;
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;
  return cellMinutes < 60 && 60 % cellMinutes === 0 ? 60 / cellMinutes : null;
}

/** Hour of day (0–23) whose cells are now all filled, if `cell` belongs to such an hour. */
export function completedHour(config: GridConfig, filled: Set<number>, cell: number): number | null {
  const perHour = cellsPerHour(config);
  if (perHour === null) return null;
  const first = Math.floor(cell / perHour) * perHour;
  for (let c = first; c < first + perHour; c++) if (!filled.has(c)) return null;
  return (first / perHour) % 24;
}

/**
 * When to remind a streak player: `hour`:00 in their time zone on each of the next `days` days
 * whose cell is still empty. Later days assume today's UTC offset (an hour off across a DST switch).
 */
export function streakReminderTimes(
  config: GridConfig,
  filled: Set<number>,
  nowMs: number,
  timeZone: string,
  hour: number,
  days: number,
): number[] {
  if (config.clock !== 'calendar') return [];
  const today = calendarPosition(nowMs, config, timeZone);
  const local = toLocalParts(nowMs, timeZone);
  const minutesNow = local.hour * 60 + local.minute;
  const times: number[] = [];
  for (let k = 0; k < days; k++) {
    const cell = today + k;
    if (cell >= config.cellCount) break;
    if (cell < 0 || filled.has(cell)) continue;
    const minutesAhead = k * 1440 + hour * 60 - minutesNow;
    if (minutesAhead > 0) times.push(nowMs + minutesAhead * 60_000);
  }
  return times;
}
