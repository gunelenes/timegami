import { GridConfig, UNIT_MINUTES } from './grid';
import { cellsPerHour } from './insights';

/** Achievements per room, derived from the player's filled cells; nothing is stored. */
export type BadgeId = 'firstCell' | 'quarter' | 'half' | 'complete' | 'nightOwl' | 'fullHour' | 'streak7' | 'streak30';

export const BADGE_ORDER: readonly BadgeId[] = ['firstCell', 'quarter', 'half', 'complete', 'nightOwl', 'fullHour', 'streak7', 'streak30'];

const NIGHT_END_MINUTE = 5 * 60;

/** Grids whose cells have a time of day (so "night" means something). */
function hasTimeOfDay(config: GridConfig): boolean {
  return (config.clock === 'wall_day' || config.clock === 'wall_week') && UNIT_MINUTES[config.unit] * config.step < 1440;
}

export function applicableBadges(config: GridConfig): BadgeId[] {
  const ids: BadgeId[] = ['firstCell', 'quarter', 'half', 'complete'];
  if (hasTimeOfDay(config)) ids.push('nightOwl');
  if (cellsPerHour(config) !== null) ids.push('fullHour');
  if (config.kind === 'streak') ids.push('streak7', 'streak30');
  return ids;
}

function longestRun(filled: Set<number>): number {
  let longest = 0;
  for (const cell of filled) {
    if (filled.has(cell - 1)) continue; // not the start of a run
    let length = 1;
    while (filled.has(cell + length)) length++;
    longest = Math.max(longest, length);
  }
  return longest;
}

function hasFullHour(config: GridConfig, filled: Set<number>): boolean {
  const perHour = cellsPerHour(config);
  if (perHour === null) return false;
  const counts = new Map<number, number>();
  for (const cell of filled) {
    const hour = Math.floor(cell / perHour);
    const count = (counts.get(hour) ?? 0) + 1;
    if (count === perHour) return true;
    counts.set(hour, count);
  }
  return false;
}

export function earnedBadges(config: GridConfig, filled: Set<number>): Set<BadgeId> {
  const earned = new Set<BadgeId>();
  if (filled.size === 0) return earned;
  const ratio = filled.size / config.cellCount;
  const cellMinutes = UNIT_MINUTES[config.unit] * config.step;

  earned.add('firstCell');
  if (ratio >= 0.25) earned.add('quarter');
  if (ratio >= 0.5) earned.add('half');
  if (ratio >= 1) earned.add('complete');
  if (hasTimeOfDay(config) && [...filled].some((cell) => (cell * cellMinutes) % 1440 < NIGHT_END_MINUTE)) {
    earned.add('nightOwl');
  }
  if (hasFullHour(config, filled)) earned.add('fullHour');
  if (config.kind === 'streak') {
    const run = longestRun(filled);
    if (run >= 7) earned.add('streak7');
    if (run >= 30) earned.add('streak30');
  }
  return earned;
}
