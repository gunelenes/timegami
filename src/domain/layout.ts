import { GridConfig, UNIT_MINUTES, parseLocalDate } from './grid';

/** -1 marks a padding slot that is not a cell (e.g. Feb 30 on the year grid). */
export const NO_CELL = -1;

export interface GridRow {
  label: string;
  cells: number[];
}

export interface GridLayout {
  rows: GridRow[];
  columns: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const MS_PER_DAY = 86_400_000;
// 2024-01-01 is a Monday in a leap year: a stable reference for weekday and leap-year day names.
const REF_MONDAY = Date.UTC(2024, 0, 1);

function utcFormat(locale: string, options: Intl.DateTimeFormatOptions, ms: number): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(ms));
}

const weekdayName = (locale: string, weekday: number) =>
  utcFormat(locale, { weekday: 'short' }, REF_MONDAY + weekday * MS_PER_DAY);

const minuteOfDayLabel = (minutes: number) => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

function calendarDayMs(config: GridConfig, dayOffset: number): number {
  const { year, month, day } = parseLocalDate(config.startDate!);
  return Date.UTC(year, month - 1, day) + dayOffset * MS_PER_DAY;
}

/** Human label for a cell, e.g. "03:47", "Mon 14:00", "Feb 29", "67'", "Oct 7, 2026". */
export function cellLabel(config: GridConfig, index: number, locale: string): string {
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;
  switch (config.clock) {
    case 'wall_day':
      return minuteOfDayLabel(index * cellMinutes);
    case 'wall_week': {
      const start = index * cellMinutes;
      const day = weekdayName(locale, Math.floor(start / 1440));
      return config.unit === 'day' ? day : `${day} ${minuteOfDayLabel(start % 1440)}`;
    }
    case 'wall_year':
      return utcFormat(locale, { month: 'short', day: 'numeric' }, REF_MONDAY + index * config.step * MS_PER_DAY);
    case 'calendar':
      return utcFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }, calendarDayMs(config, index * config.step));
    case 'free':
      return config.unit === 'minute' ? `${index * config.step + 1}'` : `#${index + 1}`;
  }
}

/** Rows of `size` cells covering [first, first + count), labelled by their first cell. */
function chunkRange(first: number, count: number, size: number, label: (start: number) => string): GridRow[] {
  const end = first + count;
  const rows: GridRow[] = [];
  for (let start = first; start < end; start += size) {
    const cells: number[] = [];
    for (let i = start; i < start + size; i++) cells.push(i < end ? i : NO_CELL);
    rows.push({ label: label(start), cells });
  }
  return rows;
}

const chunk = (cellCount: number, size: number, label: (first: number) => string) => chunkRange(0, cellCount, size, label);

const toLayout = (rows: GridRow[]): GridLayout => ({ rows, columns: Math.max(...rows.map((r) => r.cells.length)) });

const calendarRowLabel = (config: GridConfig, locale: string, first: number) =>
  utcFormat(locale, { month: 'short', day: 'numeric' }, calendarDayMs(config, first * config.step));

/** Arranges cells into rows that follow the natural rhythm of the grid (hours, weekdays, months, weeks). */
export function buildGridLayout(config: GridConfig, locale: string): GridLayout {
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;
  let rows: GridRow[];

  if (config.clock === 'wall_day' && cellMinutes < 60 && 60 % cellMinutes === 0) {
    rows = chunk(config.cellCount, 60 / cellMinutes, (first) => pad2((first * cellMinutes) / 60));
  } else if (config.clock === 'wall_week' && cellMinutes < 1440 && 1440 % cellMinutes === 0) {
    rows = chunk(config.cellCount, 1440 / cellMinutes, (first) => weekdayName(locale, (first * cellMinutes) / 1440));
  } else if (config.clock === 'wall_year' && config.step === 1) {
    rows = [];
    let index = 0;
    for (let month = 0; month < 12; month++) {
      const days = new Date(Date.UTC(2024, month + 1, 0)).getUTCDate();
      const cells = Array.from({ length: 31 }, (_, d) => (d < days ? index + d : NO_CELL));
      rows.push({ label: utcFormat(locale, { month: 'short' }, Date.UTC(2024, month, 1)), cells });
      index += days;
    }
  } else if (config.clock === 'calendar') {
    rows = chunk(config.cellCount, 7, (first) => calendarRowLabel(config, locale, first));
  } else {
    const columns = config.cellCount <= 12 ? config.cellCount : config.clock === 'wall_day' ? 6 : 10;
    rows = chunk(config.cellCount, columns, (first) => cellLabel(config, first, locale));
  }

  return toLayout(rows);
}

/** Above this many cells the board is shown in sections, so the screen never draws one giant grid. */
export const LARGE_GRID_CELLS = 1500;
const FREE_SECTION_CELLS = 500;
const CALENDAR_SECTION_DAYS = 52 * 7;

/** A contiguous block of cells [first, first + count) with its own grid layout (global cell indices). */
export interface GridSection {
  label: string;
  first: number;
  count: number;
  layout: GridLayout;
}

/**
 * Splits large grids into sections: the week into its days, long streaks into 52-week blocks,
 * anything else into blocks of 500. Returns null when the grid is small enough to show whole.
 */
export function buildSections(config: GridConfig, locale: string): GridSection[] | null {
  if (config.cellCount <= LARGE_GRID_CELLS) return null;
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;

  if (config.clock === 'wall_week' && cellMinutes < 1440 && 1440 % cellMinutes === 0) {
    const perDay = 1440 / cellMinutes;
    return Array.from({ length: 7 }, (_, day) => {
      const first = day * perDay;
      const timeOf = (start: number) => (start - first) * cellMinutes;
      const rows =
        60 % cellMinutes === 0
          ? chunkRange(first, perDay, 60 / cellMinutes, (start) => pad2(timeOf(start) / 60))
          : chunkRange(first, perDay, 10, (start) => minuteOfDayLabel(timeOf(start)));
      return {
        label: utcFormat(locale, { weekday: 'long' }, REF_MONDAY + day * MS_PER_DAY),
        first,
        count: perDay,
        layout: toLayout(rows),
      };
    });
  }

  const isCalendar = config.clock === 'calendar';
  const size = isCalendar ? CALENDAR_SECTION_DAYS : FREE_SECTION_CELLS;
  const sections: GridSection[] = [];
  for (let first = 0; first < config.cellCount; first += size) {
    const count = Math.min(size, config.cellCount - first);
    const rows = isCalendar
      ? chunkRange(first, count, 7, (start) => calendarRowLabel(config, locale, start))
      : chunkRange(first, count, 10, (start) => cellLabel(config, start, locale));
    sections.push({
      label: `${cellLabel(config, first, locale)} – ${cellLabel(config, first + count - 1, locale)}`,
      first,
      count,
      layout: toLayout(rows),
    });
  }
  return sections;
}

/** `YYYY-MM-DD` of an instant in a time zone, for streak start dates. */
export function localDateString(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}
