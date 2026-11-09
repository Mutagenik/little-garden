import {
  addDays,
  consecutiveDates,
  dateInPrague,
  daysBetween,
  formatShortDate,
  getToday,
  isValidDateString,
  setTodayProvider,
} from './dates';

describe('dates', () => {
  it('computes today in Europe/Prague, not UTC', () => {
    // 23:30 UTC on 9 Nov is already 00:30 on 10 Nov in Prague (CET, UTC+1).
    expect(dateInPrague(new Date('2026-11-09T23:30:00Z'))).toBe('2026-11-10');
    // 21:30 UTC in summer is 23:30 in Prague (CEST, UTC+2) — still the same day.
    expect(dateInPrague(new Date('2026-07-01T21:30:00Z'))).toBe('2026-07-01');
    expect(dateInPrague(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  });

  it('lets tests inject today', () => {
    setTodayProvider('2030-01-15');
    expect(getToday()).toBe('2030-01-15');
    setTodayProvider(null);
    expect(isValidDateString(getToday())).toBe(true);
  });

  it('adds calendar days across month and year ends and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it.each([
    ['2026-03-25', 10],
    ['2026-10-21', 10],
  ])('periods spanning a DST change are continuous (%s, %i days)', (start, n) => {
    const dates = consecutiveDates(start, n);
    expect(dates).toHaveLength(n);
    expect(new Set(dates).size).toBe(n);
    for (let i = 1; i < n; i++) expect(daysBetween(dates[i - 1], dates[i])).toBe(1);
    expect(daysBetween(start, dates[n - 1])).toBe(n - 1);
  });

  it('DST periods produce the exact expected dates', () => {
    expect(consecutiveDates('2026-03-25', 10)).toEqual([
      '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29',
      '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03',
    ]);
    expect(consecutiveDates('2026-10-21', 10)).toEqual([
      '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30',
    ]);
  });

  it('Prague midnight on DST-change days maps to the right date', () => {
    // 29 Mar 2026: clocks go forward at 02:00. 22:30 UTC on 28 Mar = 23:30 CET, 23:30 UTC = 01:30 CEST on 29 Mar.
    expect(dateInPrague(new Date('2026-03-28T22:30:00Z'))).toBe('2026-03-28');
    expect(dateInPrague(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29');
    // 25 Oct 2026: clocks go back at 03:00.
    expect(dateInPrague(new Date('2026-10-24T21:30:00Z'))).toBe('2026-10-24');
    expect(dateInPrague(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
  });

  it('validates date strings', () => {
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2028-02-29')).toBe(true);
    expect(isValidDateString('2026-1-5')).toBe(false);
    expect(isValidDateString(20260105)).toBe(false);
  });

  it('formats short dates without shifting the day', () => {
    expect(formatShortDate('2026-11-11', 'en-GB')).toBe('Wed 11 Nov');
  });
});
