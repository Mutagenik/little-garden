/**
 * All calendar-date logic for Little Garden lives here.
 *
 * Rules:
 * - A "date" is always a plain local calendar date string `YYYY-MM-DD`, never a timestamp.
 * - "Today" is the current calendar date in Europe/Prague.
 * - Arithmetic is done on calendar dates via UTC midnight values, so daylight-saving
 *   changes can never shift, skip or duplicate a day.
 * - "Today" is injectable (setTodayProvider) so tests can simulate any date.
 */

export const APP_TIME_ZONE = 'Europe/Prague';

export type DateString = string; // `YYYY-MM-DD`

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const pragueFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date in Europe/Prague for a given instant. */
export function dateInPrague(instant: Date): DateString {
  const parts = pragueFormatter.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

type TodayProvider = () => DateString;
const defaultProvider: TodayProvider = () => dateInPrague(new Date());
let todayProvider: TodayProvider = defaultProvider;

/** Current local date (Europe/Prague), or the injected test date. */
export function getToday(): DateString {
  return todayProvider();
}

/** Inject a fixed "today" (tests, dev). Pass null to restore the real clock. */
export function setTodayProvider(provider: TodayProvider | DateString | null): void {
  if (provider === null) todayProvider = defaultProvider;
  else if (typeof provider === 'string') todayProvider = () => provider;
  else todayProvider = provider;
}

export function isValidDateString(value: unknown): value is DateString {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d;
}

function toUtcMs(date: DateString): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date string: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): DateString {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Add whole calendar days to a date. */
export function addDays(date: DateString, days: number): DateString {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date string: ${date}`);
  return fromUtcMs(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
}

/** Number of calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DateString, to: DateString): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** `count` consecutive calendar dates starting at `start`. */
export function consecutiveDates(start: DateString, count: number): DateString[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Plain string comparison works for `YYYY-MM-DD`. */
export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "Wed 11 Nov" style label. The date is rendered in UTC so the calendar day never shifts. */
export function formatShortDate(date: DateString, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(toUtcMs(date)));
}

/** "11 November 2026" style label. */
export function formatLongDate(date: DateString, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(toUtcMs(date)));
}

/** "Monday, 9 November" style label for headers. */
export function formatWeekdayDate(date: DateString, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(toUtcMs(date)));
}
