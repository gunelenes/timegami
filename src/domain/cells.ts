import { GridConfig, UNIT_MINUTES, parseLocalDate } from './grid';
import { daysBetween, toLocalParts } from './time';

/**
 * Cell for an instant, using the player's time zone at the moment of the mark.
 * Returns null when the grid has no clock (free) or the instant falls outside a calendar grid.
 */
export function timestampToCell(timestampMs: number, config: GridConfig, timeZone: string): number | null {
  const local = toLocalParts(timestampMs, timeZone);
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;

  switch (config.clock) {
    case 'free':
      return null;
    case 'wall_day':
      return Math.floor((local.hour * 60 + local.minute) / cellMinutes);
    case 'wall_week':
      return Math.floor((local.weekday * 1440 + local.hour * 60 + local.minute) / cellMinutes);
    case 'wall_year': {
      // Leap-year layout: Feb 29 is day 59 and Mar 1 is always day 60.
      const dayOfYear = daysBetween({ year: 2000, month: 1, day: 1 }, { year: 2000, month: local.month, day: local.day });
      return Math.floor(dayOfYear / config.step);
    }
    case 'calendar': {
      const cell = calendarPosition(timestampMs, config, timeZone);
      return cell >= 0 && cell < config.cellCount ? cell : null;
    }
  }
}

/**
 * Unclamped calendar position of an instant: negative before the start, >= cellCount after the end.
 * Used as "today" for streak progress.
 */
export function calendarPosition(timestampMs: number, config: GridConfig, timeZone: string): number {
  const offset = daysBetween(parseLocalDate(config.startDate!), toLocalParts(timestampMs, timeZone));
  return Math.floor(offset / config.step);
}

export function isValidCell(config: GridConfig, cellIndex: number): boolean {
  return Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < config.cellCount;
}
