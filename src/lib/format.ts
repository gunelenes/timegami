import type { TFunction } from 'i18next';

/** "in 15 min", "in 2 h 5 min". */
export function formatIn(t: TFunction, minutes: number): string {
  if (minutes < 60) return t('time.inMinutes', { count: Math.max(1, minutes) });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? t('time.inHours', { count: hours }) : t('time.inHoursMinutes', { hours, minutes: rest });
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function formatAgo(t: TFunction, thenMs: number, nowMs: number): string {
  const minutes = Math.floor((nowMs - thenMs) / 60_000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: Math.floor(hours / 24) });
}
