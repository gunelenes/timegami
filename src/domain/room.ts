/** Colour-blind-friendly palette; its size is the room capacity. */
export const PLAYER_COLORS = [
  '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00',
  '#CC79A7', '#882255', '#44AA99', '#999933', '#AA4499', '#332288',
] as const;

export const MAX_ROOM_MEMBERS = PLAYER_COLORS.length;

/** First palette colour no member is using, or null when the room is full. */
export function nextFreeColor(usedColors: Iterable<string>): string | null {
  const used = new Set(usedColors);
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? null;
}

// No 0/O or 1/I/L, so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 6;

/** @param random returns a float in [0, 1); inject a crypto-backed source in the app. */
export function generateInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export const NICKNAME_MAX_LENGTH = 20;

/** Trimmed nickname, or null if empty or too long. */
export function validateNickname(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= NICKNAME_MAX_LENGTH ? name : null;
}
