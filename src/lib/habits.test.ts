import { addDays } from './dates';
import {
  activeHabits,
  canMarkLeaf,
  completedHabits,
  createHabit,
  dayNumber,
  daysRemaining,
  habitStats,
  lastDate,
  refreshStatuses,
  setLeafStatus,
} from './habits';
import type { Habit, LeafStatus } from './types';

const draft = (n: number, name = 'No coffee') => ({ name, successCondition: 'I do not drink coffee.', durationDays: n });

function withStatuses(h: Habit, statuses: LeafStatus[]): Habit {
  return { ...h, leaves: h.leaves.map((l, i) => ({ ...l, status: statuses[i] ?? 'white' })) };
}

describe('habit creation', () => {
  it.each([4, 15])('a %i-day habit gets consecutive dates starting on the creation date', (n) => {
    const h = createHabit(draft(n), '2026-11-09', []);
    expect(h.leaves).toHaveLength(n);
    expect(h.startDate).toBe('2026-11-09');
    h.leaves.forEach((leaf, i) => expect(leaf.date).toBe(addDays('2026-11-09', i)));
    expect(lastDate(h)).toBe(addDays('2026-11-09', n - 1));
    expect(h.leaves.every((l) => l.status === 'white')).toBe(true);
  });

  it('maps each leaf to exactly one date, in order, with no repeats', () => {
    const h = createHabit(draft(15), '2026-12-25', []);
    const dates = h.leaves.map((l) => l.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);
  });

  it('rejects durations outside 4–15', () => {
    expect(() => createHabit(draft(3), '2026-11-09', [])).toThrow();
    expect(() => createHabit(draft(16), '2026-11-09', [])).toThrow();
    expect(() => createHabit(draft(7.5), '2026-11-09', [])).toThrow();
  });

  it('stores a seed derived from the id, and differs in look from the previous plant', () => {
    const a = createHabit(draft(5), '2026-11-09', [], { id: 'abc', now: new Date('2026-11-09T08:00:00Z') });
    const again = createHabit(draft(5), '2026-11-09', [], { id: 'abc', now: new Date('2026-11-09T08:00:00Z') });
    expect(a.plantSeed).toBe(again.plantSeed);
    expect(a.plantStyle).toBe(again.plantStyle);
    const b = createHabit(draft(5), '2026-11-09', [a], { id: 'def', now: new Date('2026-11-09T09:00:00Z') });
    expect(b.plantStyle).not.toBe(a.plantStyle);
    expect(b.potColor).not.toBe(a.potColor);
  });
});

describe('marking leaves', () => {
  const start = '2026-11-09';
  const base = createHabit(draft(7), start, []);

  it('yesterday can be marked; a mark can be changed and cleared', () => {
    const today = '2026-11-11';
    let h = setLeafStatus(base, 1, 'green', today);
    expect(h.leaves[1].status).toBe('green');
    h = setLeafStatus(h, 1, 'ochre', today);
    expect(h.leaves[1].status).toBe('ochre');
    h = setLeafStatus(h, 1, 'white', today);
    expect(h.leaves[1].status).toBe('white');
  });

  it("today's leaf can be marked", () => {
    const h = setLeafStatus(base, 2, 'green', '2026-11-11');
    expect(h.leaves[2].status).toBe('green');
  });

  it('a future day cannot be marked', () => {
    const today = '2026-11-11';
    expect(canMarkLeaf(base, 3, today)).toBe(false);
    const h = setLeafStatus(base, 3, 'green', today);
    expect(h).toBe(base);
    expect(h.leaves[3].status).toBe('white');
  });

  it('never colours missed days automatically', () => {
    const later = refreshStatuses([base], '2026-11-14')[0];
    expect(later.leaves.every((l) => l.status === 'white')).toBe(true);
  });
});

describe('Day X of N', () => {
  it('is correct after the app was closed for several days', () => {
    const h = createHabit(draft(10), '2026-11-09', []);
    expect(dayNumber(h, '2026-11-09')).toBe(1);
    // App closed, reopened five days later.
    expect(dayNumber(h, '2026-11-14')).toBe(6);
    expect(daysRemaining(h, '2026-11-14')).toBe(4);
    expect(dayNumber(h, '2026-11-18')).toBe(10);
    expect(daysRemaining(h, '2026-11-18')).toBe(0);
  });
});

describe('several plants', () => {
  it('coexist independently', () => {
    const a = createHabit(draft(4, 'A'), '2026-11-01', []);
    const b = createHabit(draft(10, 'B'), '2026-11-03', [a]);
    const c = createHabit(draft(15, 'C'), '2026-11-09', [a, b]);
    let habits = [a, b, c];
    const today = '2026-11-09';
    habits = habits.map((h) => (h.id === b.id ? setLeafStatus(h, 0, 'green', today) : h));
    habits = refreshStatuses(habits, today);
    expect(habits.find((h) => h.id === a.id)!.status).toBe('completed');
    expect(habits.find((h) => h.id === b.id)!.status).toBe('active');
    expect(habits.find((h) => h.id === b.id)!.leaves[0].status).toBe('green');
    expect(habits.find((h) => h.id === c.id)!.leaves.every((l) => l.status === 'white')).toBe(true);
    expect(dayNumber(habits.find((h) => h.id === b.id)!, today)).toBe(7);
    expect(activeHabits(habits).map((h) => h.name)).toEqual(['B', 'C']);
    expect(completedHabits(habits).map((h) => h.name)).toEqual(['A']);
  });
});

describe('completion', () => {
  it('on day N+1 the plant completes, unmarked leaves stay white, and it becomes read-only', () => {
    let h = createHabit(draft(4), '2026-11-09', []);
    h = setLeafStatus(h, 0, 'green', '2026-11-09');
    const lastDay = refreshStatuses([h], '2026-11-12')[0];
    expect(lastDay.status).toBe('active');
    const after = refreshStatuses([h], '2026-11-13')[0];
    expect(after.status).toBe('completed');
    expect(after.completionSeen).toBe(false);
    expect(after.leaves.map((l) => l.status)).toEqual(['green', 'white', 'white', 'white']);
    expect(canMarkLeaf(after, 1, '2026-11-13')).toBe(false);
    expect(setLeafStatus(after, 1, 'green', '2026-11-13')).toBe(after);
  });

  it('completes even when the app was closed for weeks', () => {
    const h = createHabit(draft(5), '2026-11-09', []);
    expect(refreshStatuses([h], '2026-12-30')[0].status).toBe('completed');
  });

  it('stats for an all-green plant', () => {
    const h = withStatuses(createHabit(draft(5), '2026-11-09', []), Array(5).fill('green'));
    expect(habitStats(h)).toEqual({ total: 5, green: 5, ochre: 0, white: 0, marked: 5, percent: 100, allGreen: true });
  });

  it('stats for a green / ochre / white mix', () => {
    const h = withStatuses(createHabit(draft(7), '2026-11-09', []), [
      'green', 'ochre', 'green', 'white', 'green', 'ochre', 'white',
    ]);
    expect(habitStats(h)).toEqual({ total: 7, green: 3, ochre: 2, white: 2, marked: 5, percent: 43, allGreen: false });
  });
});
