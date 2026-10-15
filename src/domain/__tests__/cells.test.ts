import { GRID_TEMPLATES, GridConfig, calendarPosition, timestampToCell } from '..';

const at = (iso: string) => Date.parse(iso);
const IST = 'Europe/Istanbul'; // UTC+3, no DST
const NY = 'America/New_York';

const minuteOfDay = GRID_TEMPLATES.everyMinuteOfDay as GridConfig;
const tenMinutes = GRID_TEMPLATES.every10MinutesOfDay as GridConfig;
const hourOfWeek = GRID_TEMPLATES.everyHourOfWeek as GridConfig;
const dayOfYear = GRID_TEMPLATES.everyDayOfYear as GridConfig;

describe('wall_day', () => {
  it('maps local time to the minute cell', () => {
    expect(timestampToCell(at('2026-10-06T00:47:00Z'), minuteOfDay, IST)).toBe(3 * 60 + 47);
  });

  it('respects the step size', () => {
    expect(timestampToCell(at('2026-10-06T00:47:00Z'), tenMinutes, IST)).toBe(22);
    expect(timestampToCell(at('2026-10-06T00:40:00Z'), tenMinutes, IST)).toBe(22);
    expect(timestampToCell(at('2026-10-06T00:39:59Z'), tenMinutes, IST)).toBe(21);
  });

  it('handles midnight boundaries', () => {
    expect(timestampToCell(at('2026-10-05T20:59:59Z'), minuteOfDay, IST)).toBe(1439);
    expect(timestampToCell(at('2026-10-05T21:00:00Z'), minuteOfDay, IST)).toBe(0);
  });

  it('uses the given time zone, not the device zone', () => {
    const t = at('2026-10-06T00:47:00Z');
    expect(timestampToCell(t, minuteOfDay, 'UTC')).toBe(47);
    expect(timestampToCell(t, minuteOfDay, 'Asia/Kolkata')).toBe(6 * 60 + 17);
  });

  it('skips the missing hour on spring-forward DST', () => {
    expect(timestampToCell(at('2026-03-08T06:59:00Z'), minuteOfDay, NY)).toBe(60 + 59); // 01:59 EST
    expect(timestampToCell(at('2026-03-08T07:00:00Z'), minuteOfDay, NY)).toBe(3 * 60); // 03:00 EDT
  });

  it('maps the repeated hour on fall-back DST to the same cell', () => {
    expect(timestampToCell(at('2026-11-01T05:30:00Z'), minuteOfDay, NY)).toBe(90); // 01:30 EDT
    expect(timestampToCell(at('2026-11-01T06:30:00Z'), minuteOfDay, NY)).toBe(90); // 01:30 EST
  });

  it('rejects unknown time zones', () => {
    expect(() => timestampToCell(0, minuteOfDay, 'Mars/Olympus')).toThrow(RangeError);
  });
});

describe('wall_week', () => {
  it('starts the week on Monday', () => {
    expect(timestampToCell(at('2026-10-05T11:00:00Z'), hourOfWeek, IST)).toBe(14); // Mon 14:00
    expect(timestampToCell(at('2026-10-11T20:59:00Z'), hourOfWeek, IST)).toBe(167); // Sun 23:59
    expect(timestampToCell(at('2026-10-11T21:00:00Z'), hourOfWeek, IST)).toBe(0); // Mon 00:00
  });
});

describe('wall_year', () => {
  it('uses a fixed leap-year layout', () => {
    expect(timestampToCell(at('2027-01-01T12:00:00Z'), dayOfYear, IST)).toBe(0);
    expect(timestampToCell(at('2028-02-29T12:00:00Z'), dayOfYear, IST)).toBe(59);
    expect(timestampToCell(at('2027-03-01T12:00:00Z'), dayOfYear, IST)).toBe(60);
    expect(timestampToCell(at('2028-03-01T12:00:00Z'), dayOfYear, IST)).toBe(60);
    expect(timestampToCell(at('2027-12-31T12:00:00Z'), dayOfYear, IST)).toBe(365);
  });

  it('uses the local date at the day boundary', () => {
    expect(timestampToCell(at('2026-12-31T21:30:00Z'), dayOfYear, IST)).toBe(0); // already Jan 1 in Istanbul
    expect(timestampToCell(at('2026-12-31T21:30:00Z'), dayOfYear, 'UTC')).toBe(365);
  });
});

describe('free', () => {
  it('has no clock', () => {
    expect(timestampToCell(Date.now(), GRID_TEMPLATES.matchMinutes as GridConfig, IST)).toBeNull();
  });
});

describe('calendar', () => {
  const streak: GridConfig = { ...GRID_TEMPLATES.dailyStreak365, startDate: '2026-10-06' };

  it('counts days from the local start date', () => {
    expect(timestampToCell(at('2026-10-05T20:59:00Z'), streak, IST)).toBeNull(); // Oct 5, before start
    expect(timestampToCell(at('2026-10-05T21:00:00Z'), streak, IST)).toBe(0);
    expect(timestampToCell(at('2026-10-07T12:00:00Z'), streak, IST)).toBe(1);
    expect(timestampToCell(at('2027-10-05T12:00:00Z'), streak, IST)).toBe(364);
    expect(timestampToCell(at('2027-10-06T12:00:00Z'), streak, IST)).toBeNull(); // after the last day
  });

  it('is not affected by DST', () => {
    const ny: GridConfig = { ...streak, startDate: '2026-03-07' };
    expect(timestampToCell(at('2026-03-09T04:30:00Z'), ny, NY)).toBe(2); // Mar 9 00:30 EDT
  });

  it('reports the unclamped position for streak progress', () => {
    expect(calendarPosition(at('2026-10-04T12:00:00Z'), streak, IST)).toBe(-2);
    expect(calendarPosition(at('2027-10-07T12:00:00Z'), streak, IST)).toBe(366);
  });

  it('supports multi-day cells', () => {
    const weekly: GridConfig = { ...streak, step: 7, cellCount: 52 };
    expect(timestampToCell(at('2026-10-12T12:00:00Z'), weekly, IST)).toBe(0);
    expect(timestampToCell(at('2026-10-13T12:00:00Z'), weekly, IST)).toBe(1);
  });
});
