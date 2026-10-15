export interface Mark {
  uid: string;
  cellIndex: number;
  occurredAt: number; // UTC ms
}

/** cellIndex -> uid -> mark count. Drives the shared board, where one cell can hold several players. */
export type BoardState = Map<number, Map<string, number>>;

export function buildBoard(marks: Iterable<Mark>, onlyUid?: string): BoardState {
  const board: BoardState = new Map();
  for (const m of marks) {
    if (onlyUid !== undefined && m.uid !== onlyUid) continue;
    let cell = board.get(m.cellIndex);
    if (!cell) board.set(m.cellIndex, (cell = new Map()));
    cell.set(m.uid, (cell.get(m.uid) ?? 0) + 1);
  }
  return board;
}

export function filledCells(marks: Iterable<Mark>, uid?: string): Set<number> {
  const set = new Set<number>();
  for (const m of marks) if (uid === undefined || m.uid === uid) set.add(m.cellIndex);
  return set;
}

export interface CollectionProgress {
  filled: number;
  total: number;
  /** 0..1 */
  ratio: number;
  missing: number[];
}

export function collectionProgress(filled: Set<number>, cellCount: number): CollectionProgress {
  const missing: number[] = [];
  for (let i = 0; i < cellCount; i++) if (!filled.has(i)) missing.push(i);
  const count = cellCount - missing.length;
  return { filled: count, total: cellCount, ratio: count / cellCount, missing };
}

export interface StreakProgress {
  /** Consecutive filled cells ending today, or yesterday if today is not filled yet. */
  current: number;
  longest: number;
  filled: number;
  /** Past cells never filled. A broken streak does not stop play; they can still be backfilled. */
  missed: number[];
}

/**
 * @param currentCell index of "today" on the calendar grid; < 0 before the start, >= cellCount after the end.
 */
export function streakProgress(filled: Set<number>, cellCount: number, currentCell: number): StreakProgress {
  const last = Math.min(currentCell, cellCount - 1);
  let longest = 0;
  let run = 0;
  let filledCount = 0;
  const missed: number[] = [];
  for (let i = 0; i <= last; i++) {
    if (filled.has(i)) {
      filledCount++;
      longest = Math.max(longest, ++run);
    } else {
      // An empty "today" is not a miss yet.
      if (i < currentCell) missed.push(i);
      run = 0;
    }
  }
  let current = 0;
  let i = filled.has(last) ? last : last === currentCell ? last - 1 : -1;
  while (i >= 0 && filled.has(i)) {
    current++;
    i--;
  }
  return { current, longest, filled: filledCount, missed };
}
