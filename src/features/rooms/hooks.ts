import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';

import { GridConfigError } from '@/domain';
import { ensureSignedIn } from '@/lib/firebase';

import {
  Member,
  MarkDoc,
  Room,
  RoomError,
  subscribeMarks,
  subscribeMembers,
  subscribeMyRooms,
  subscribeRoom,
} from './api';

/** Signs in anonymously on first launch; null until ready. */
export function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    ensureSignedIn().then(setUid, console.error);
  }, []);
  return uid;
}

export function useMyRooms(uid: string | null): Room[] | null {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  useEffect(() => (uid ? subscribeMyRooms(uid, setRooms) : undefined), [uid]);
  return rooms;
}

export type RoomState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'ready'; room: Room; members: Member[]; marks: MarkDoc[] };

/**
 * Live room, members and marks. Members and marks are only readable once membership is confirmed.
 * Stays "loading" until the first marks snapshot, so progress and badges never flash from an empty board.
 */
export function useRoomData(roomId: string, uid: string | null): RoomState {
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [marks, setMarks] = useState<MarkDoc[] | null>(null);

  useEffect(() => (uid ? subscribeRoom(roomId, setRoom) : undefined), [roomId, uid]);

  const isMember = !!(uid && room?.memberColors[uid]);
  useEffect(() => {
    if (!isMember) return;
    setMarks(null);
    const unsubs = [subscribeMembers(roomId, setMembers), subscribeMarks(roomId, setMarks)];
    return () => unsubs.forEach((u) => u());
  }, [roomId, isMember]);

  if (room === undefined) return { status: 'loading' };
  if (room === null || !isMember) return { status: 'not_found' };
  if (marks === null) return { status: 'loading' };
  return { status: 'ready', room, members, marks };
}

/** Current time, refreshed periodically so the "now" cell and streak day stay current. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof RoomError) return t(`errors.${error.code}`);
  if (error instanceof GridConfigError) return t('create.invalid');
  console.error(error);
  return t('errors.generic');
}
