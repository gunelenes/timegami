import {
  DocumentReference,
  FirestoreError,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';

import {
  GridConfig,
  generateInviteCode,
  isValidCell,
  nextFreeColor,
  normalizeInviteCode,
  timestampToCell,
  validateGridConfig,
  validateNickname,
} from '@/domain';
import { auth, db, ensureSignedIn } from '@/lib/firebase';
import { deviceTimeZone } from '@/lib/locale';

export interface Room {
  id: string;
  name: string;
  emoji: string;
  config: GridConfig;
  ownerId: string;
  inviteCode: string;
  /** uid -> colour; also the membership list checked by firestore.rules. */
  memberColors: Record<string, string>;
}

export interface Member {
  uid: string;
  nickname: string;
  color: string;
}

export interface MarkDoc {
  id: string;
  uid: string;
  cellIndex: number;
  occurredAt: number; // UTC ms
  timeZone: string;
  source: 'live' | 'manual';
  note?: string;
}

export class RoomError extends Error {
  constructor(public code: 'invalid_nickname' | 'invalid_code' | 'room_full' | 'invalid_cell' | 'no_clock' | 'not_owner') {
    super(code);
  }
}

const roomRef = (roomId: string) => doc(db, 'rooms', roomId);
const memberRef = (roomId: string, uid: string) => doc(db, 'rooms', roomId, 'members', uid);
const marksCol = (roomId: string) => collection(db, 'rooms', roomId, 'marks');
const membersCol = (roomId: string) => collection(db, 'rooms', roomId, 'members');
const codeRef = (code: string) => doc(db, 'inviteCodes', code);
const myRoomRef = (uid: string, roomId: string) => doc(db, 'users', uid, 'rooms', roomId);

const MAX_CODE_ATTEMPTS = 5;

/** Picks an unused invite code inside the transaction and points it at the room. */
async function claimInviteCode(
  tx: Parameters<Parameters<typeof runTransaction>[1]>[0],
  roomId: string,
): Promise<string> {
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
    const code = generateInviteCode();
    if (!(await tx.get(codeRef(code))).exists()) {
      tx.set(codeRef(code), { roomId });
      return code;
    }
  }
  throw new Error('Could not allocate an invite code');
}

export async function createRoom(input: {
  name: string;
  emoji: string;
  config: GridConfig;
  nickname: string;
}): Promise<string> {
  const uid = await ensureSignedIn();
  validateGridConfig(input.config);
  const nickname = validateNickname(input.nickname);
  if (!nickname) throw new RoomError('invalid_nickname');

  const ref = doc(collection(db, 'rooms'));
  const color = nextFreeColor([])!;
  await runTransaction(db, async (tx) => {
    const inviteCode = await claimInviteCode(tx, ref.id);
    tx.set(ref, {
      name: input.name.trim(),
      emoji: input.emoji,
      config: input.config,
      ownerId: uid,
      inviteCode,
      memberColors: { [uid]: color },
      createdAt: serverTimestamp(),
    });
    tx.set(memberRef(ref.id, uid), { nickname, color, inviteCode, joinedAt: serverTimestamp() });
    tx.set(myRoomRef(uid, ref.id), { joinedAt: serverTimestamp() });
  });
  return ref.id;
}

/** Joins with an invite code and a room-specific nickname; returns the room id. */
export async function joinRoom(rawCode: string, rawNickname: string): Promise<string> {
  const uid = await ensureSignedIn();
  const nickname = validateNickname(rawNickname);
  if (!nickname) throw new RoomError('invalid_nickname');

  const code = normalizeInviteCode(rawCode);
  const codeSnap = code ? await getDoc(codeRef(code)) : null;
  if (!codeSnap?.exists()) throw new RoomError('invalid_code');
  const roomId: string = codeSnap.data().roomId;

  await runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(roomId))).data() as Omit<Room, 'id'> | undefined;
    if (!room || room.inviteCode !== code) throw new RoomError('invalid_code');
    tx.set(myRoomRef(uid, roomId), { joinedAt: serverTimestamp() });
    if (room.memberColors[uid]) return; // already a member
    const color = nextFreeColor(Object.values(room.memberColors));
    if (!color) throw new RoomError('room_full');
    tx.update(roomRef(roomId), { [`memberColors.${uid}`]: color });
    tx.set(memberRef(roomId, uid), { nickname, color, inviteCode: code, joinedAt: serverTimestamp() });
  });
  return roomId;
}

/** Owner only: replaces the invite code; the old one stops working. */
export async function regenerateInviteCode(roomId: string): Promise<string> {
  await ensureSignedIn();
  return runTransaction(db, async (tx) => {
    const room = (await tx.get(roomRef(roomId))).data() as Omit<Room, 'id'>;
    const inviteCode = await claimInviteCode(tx, roomId);
    tx.delete(codeRef(room.inviteCode));
    tx.update(roomRef(roomId), { inviteCode });
    return inviteCode;
  });
}

/** "It happened now!" — the cell is derived from the clock, in the player's current time zone. Returns the cell. */
export async function markNow(room: Room, note?: string): Promise<number> {
  const occurredAt = Date.now();
  const timeZone = deviceTimeZone();
  const cellIndex = timestampToCell(occurredAt, room.config, timeZone);
  if (cellIndex === null) throw new RoomError(room.config.clock === 'free' ? 'no_clock' : 'invalid_cell');
  await addMark(room, { cellIndex, occurredAt, timeZone, source: 'live', note });
  return cellIndex;
}

/** Tap on a cell: free grids, or backfilling a past cell. */
export async function markCell(room: Room, cellIndex: number, note?: string): Promise<void> {
  await addMark(room, { cellIndex, occurredAt: Date.now(), timeZone: deviceTimeZone(), source: 'manual', note });
}

async function addMark(room: Room, mark: Omit<MarkDoc, 'id' | 'uid'>): Promise<void> {
  const uid = await ensureSignedIn();
  if (!isValidCell(room.config, mark.cellIndex)) throw new RoomError('invalid_cell');
  const data = { ...mark, uid, createdAt: serverTimestamp() };
  if (data.note === undefined) delete data.note;
  else data.note = data.note.trim();
  await addDoc(marksCol(room.id), data);
}

export async function deleteMark(roomId: string, markId: string): Promise<void> {
  await deleteDoc(doc(marksCol(roomId), markId));
}

export async function renameInRoom(roomId: string, rawNickname: string): Promise<void> {
  const uid = await ensureSignedIn();
  const nickname = validateNickname(rawNickname);
  if (!nickname) throw new RoomError('invalid_nickname');
  await updateDoc(memberRef(roomId, uid), { nickname });
}

/**
 * Owner only: removes another player with all of their marks and renews the invite code, so the old
 * code cannot bring them back. Their home list drops the room by itself (subscribeMyRooms).
 */
export async function removeMember(roomId: string, memberUid: string): Promise<void> {
  const uid = await ensureSignedIn();
  if (memberUid === uid) throw new RoomError('not_owner');
  const room = (await getDoc(roomRef(roomId))).data() as Omit<Room, 'id'> | undefined;
  if (!room || room.ownerId !== uid) throw new RoomError('not_owner');

  const theirs = await getDocs(query(marksCol(roomId), where('uid', '==', memberUid)));
  await deleteInBatches([...theirs.docs.map((d) => d.ref), memberRef(roomId, memberUid)]);

  await runTransaction(db, async (tx) => {
    const current = (await tx.get(roomRef(roomId))).data() as Omit<Room, 'id'>;
    const inviteCode = await claimInviteCode(tx, roomId);
    tx.delete(codeRef(current.inviteCode));
    tx.update(roomRef(roomId), { [`memberColors.${memberUid}`]: deleteField(), inviteCode });
  });
}

/** Firestore allows 500 writes per batch; stay below it. */
const BATCH_LIMIT = 450;

/**
 * Leaves a room and deletes all of my marks in it. An owner hands the room to the longest-standing
 * remaining member, or deletes it when nobody else is left.
 */
export async function leaveRoom(roomId: string): Promise<void> {
  const uid = await ensureSignedIn();
  const snap = await getDoc(roomRef(roomId));
  const room = snap.exists() ? (snap.data() as Omit<Room, 'id'>) : null;
  if (!room || !room.memberColors[uid]) {
    await deleteDoc(myRoomRef(uid, roomId));
    return;
  }

  // My marks go first, while membership still lets me read them.
  const mine = await getDocs(query(marksCol(roomId), where('uid', '==', uid)));
  await deleteInBatches(mine.docs.map((d) => d.ref));

  const others = Object.keys(room.memberColors).filter((u) => u !== uid);
  const batch = writeBatch(db);
  if (room.ownerId === uid && others.length === 0) {
    batch.delete(codeRef(room.inviteCode));
    batch.delete(memberRef(roomId, uid));
    batch.delete(roomRef(roomId));
  } else {
    const leave = { [`memberColors.${uid}`]: deleteField() };
    batch.update(roomRef(roomId), room.ownerId === uid ? { ...leave, ownerId: await nextOwner(roomId, others) } : leave);
    batch.delete(memberRef(roomId, uid));
  }
  batch.delete(myRoomRef(uid, roomId));
  await batch.commit();
}

/**
 * Owner only: deletes the room for everyone, with every player's marks and memberships. Other players'
 * home lists still point at it; they drop the entry when they notice the room is gone (subscribeMyRooms).
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const uid = await ensureSignedIn();
  const snap = await getDoc(roomRef(roomId));
  if (!snap.exists()) {
    await deleteDoc(myRoomRef(uid, roomId));
    return;
  }
  const room = snap.data() as Omit<Room, 'id'>;
  if (room.ownerId !== uid) throw new RoomError('not_owner');

  // Children first: once the room document is gone the rules can no longer check ownership.
  const [marks, members] = await Promise.all([getDocs(marksCol(roomId)), getDocs(membersCol(roomId))]);
  await deleteInBatches([...marks.docs, ...members.docs.filter((d) => d.id !== uid)].map((d) => d.ref));

  const batch = writeBatch(db);
  batch.delete(codeRef(room.inviteCode));
  batch.delete(memberRef(roomId, uid));
  batch.delete(roomRef(roomId));
  batch.delete(myRoomRef(uid, roomId));
  await batch.commit();
}

async function deleteInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/** The remaining member who joined first. */
async function nextOwner(roomId: string, candidates: string[]): Promise<string> {
  const members = await getDocs(query(membersCol(roomId), orderBy('joinedAt')));
  return members.docs.map((d) => d.id).find((id) => candidates.includes(id)) ?? candidates[0];
}

/**
 * Deletes everything of mine on the server: marks, memberships, owned rooms (or hands them over),
 * my room list and finally the anonymous account itself.
 */
export async function deleteAccount(): Promise<void> {
  const uid = await ensureSignedIn();
  const myRooms = await getDocs(collection(db, 'users', uid, 'rooms'));
  for (const d of myRooms.docs) await leaveRoom(d.id);
  try {
    if (auth.currentUser) await deleteUser(auth.currentUser);
  } catch (e) {
    // An old anonymous session cannot re-authenticate; its data is already gone, so just sign out.
    console.warn('Could not delete the auth user', e);
    await signOut(auth);
  }
}

export function subscribeRoom(roomId: string, cb: (room: Room | null) => void): Unsubscribe {
  return onSnapshot(roomRef(roomId), (s) => cb(s.exists() ? ({ id: s.id, ...s.data() } as Room) : null));
}

/** Members and marks become unreadable the moment the room is deleted or left; that is expected. */
function ignoreLostAccess(e: FirestoreError) {
  if (e.code !== 'permission-denied') console.error(e);
}

export function subscribeMembers(roomId: string, cb: (members: Member[]) => void): Unsubscribe {
  return onSnapshot(
    membersCol(roomId),
    (s) => cb(s.docs.map((d) => ({ uid: d.id, nickname: d.data().nickname, color: d.data().color }))),
    ignoreLostAccess,
  );
}

export function subscribeMarks(roomId: string, cb: (marks: MarkDoc[]) => void): Unsubscribe {
  return onSnapshot(
    query(marksCol(roomId), orderBy('occurredAt')),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }) as MarkDoc)),
    ignoreLostAccess,
  );
}

/** Rooms the player has created or joined, newest first. */
export function subscribeMyRooms(uid: string, cb: (rooms: Room[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'users', uid, 'rooms'), orderBy('joinedAt', 'desc')), async (s) => {
    const rooms = await Promise.all(s.docs.map((d) => getDoc(roomRef(d.id))));
    // Rooms deleted by their owner (or that I am no longer in) leave a stale entry; tidy it up.
    const gone = rooms.filter((r) => !r.exists() || !r.data().memberColors?.[uid]);
    gone.forEach((r) => deleteDoc(myRoomRef(uid, r.id)).catch(console.warn));
    cb(rooms.filter((r) => !gone.includes(r)).map((r) => ({ id: r.id, ...r.data() }) as Room));
  });
}
