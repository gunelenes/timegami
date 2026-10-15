import {
  INVITE_CODE_LENGTH,
  PLAYER_COLORS,
  generateInviteCode,
  nextFreeColor,
  normalizeInviteCode,
  validateNickname,
} from '..';

describe('nextFreeColor', () => {
  it('picks the first unused colour', () => {
    expect(nextFreeColor([])).toBe(PLAYER_COLORS[0]);
    expect(nextFreeColor([PLAYER_COLORS[0], PLAYER_COLORS[2]])).toBe(PLAYER_COLORS[1]);
  });

  it('returns null when the room is full', () => {
    expect(nextFreeColor(PLAYER_COLORS)).toBeNull();
  });

  it('has unique colours', () => {
    expect(new Set(PLAYER_COLORS).size).toBe(PLAYER_COLORS.length);
  });
});

describe('invite codes', () => {
  it('generates readable codes of fixed length', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]+$/);
    expect(generateInviteCode(() => 0)).toBe('AAAAAA');
    expect(generateInviteCode(() => 0.9999)).toBe('999999');
  });

  it('normalizes user input', () => {
    expect(normalizeInviteCode(' ab-c2 9x ')).toBe('ABC29X');
  });
});

describe('validateNickname', () => {
  it('trims and collapses whitespace', () => {
    expect(validateNickname('  Enes   G ')).toBe('Enes G');
  });

  it('rejects empty or overly long names', () => {
    expect(validateNickname('   ')).toBeNull();
    expect(validateNickname('x'.repeat(21))).toBeNull();
  });
});
