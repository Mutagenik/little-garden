import { addDays, compareDates, consecutiveDates, daysBetween, type DateString } from './dates';
import { createId, createRng, hashString } from './random';
import {
  MAX_DURATION_DAYS,
  MIN_DURATION_DAYS,
  PLANT_STYLES,
  POT_COLORS,
  type Habit,
  type HabitDraft,
  type LeafStatus,
  type PlantStyle,
  type PotColor,
} from './types';

export function isValidDuration(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_DURATION_DAYS && days <= MAX_DURATION_DAYS;
}

export function clampDuration(days: number): number {
  if (!Number.isFinite(days)) return MIN_DURATION_DAYS;
  return Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, Math.round(days)));
}

export function seedFromId(id: string): number {
  return hashString(id);
}

/**
 * Style and pot colour come from the seed, but skip whatever the most recent
 * plant used, so neighbouring plants in the room always look different.
 */
export function chooseLook(
  seed: number,
  previous: Pick<Habit, 'plantStyle' | 'potColor'> | undefined,
): { plantStyle: PlantStyle; potColor: PotColor } {
  const rng = createRng(seed ^ 0x9e3779b9);
  const styles = PLANT_STYLES.filter((s) => s !== previous?.plantStyle);
  const colors = POT_COLORS.filter((c) => c !== previous?.potColor);
  return {
    plantStyle: styles[Math.floor(rng() * styles.length)],
    potColor: colors[Math.floor(rng() * colors.length)],
  };
}

export function lastDate(habit: Pick<Habit, 'startDate' | 'durationDays'>): DateString {
  return addDays(habit.startDate, habit.durationDays - 1);
}

export function createHabit(
  draft: HabitDraft,
  today: DateString,
  existing: Habit[],
  options: { id?: string; now?: Date } = {},
): Habit {
  if (!isValidDuration(draft.durationDays)) {
    throw new Error(`Duration must be ${MIN_DURATION_DAYS}–${MAX_DURATION_DAYS} days`);
  }
  const id = options.id ?? draft.id ?? createId();
  const plantSeed = seedFromId(id);
  const previous = [...existing].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  const look = chooseLook(plantSeed, previous);
  return {
    id,
    name: draft.name.trim(),
    successCondition: draft.successCondition.trim(),
    durationDays: draft.durationDays,
    startDate: today,
    plantSeed,
    plantStyle: look.plantStyle,
    potColor: look.potColor,
    leaves: consecutiveDates(today, draft.durationDays).map((date) => ({ date, status: 'white' })),
    status: 'active',
    completionSeen: false,
    createdAt: (options.now ?? new Date()).toISOString(),
  };
}

/** 0-based index of today's leaf; may be negative (never) or ≥ duration (period over). */
export function todayIndex(habit: Habit, today: DateString): number {
  return daysBetween(habit.startDate, today);
}

/** "Day X of N": X is clamped to 1…N. */
export function dayNumber(habit: Habit, today: DateString): number {
  return Math.min(habit.durationDays, Math.max(1, todayIndex(habit, today) + 1));
}

export function isPeriodOver(habit: Habit, today: DateString): boolean {
  return compareDates(today, lastDate(habit)) > 0;
}

export type LeafState = 'past' | 'today' | 'future';

export function leafState(habit: Habit, index: number, today: DateString): LeafState {
  const c = compareDates(habit.leaves[index].date, today);
  return c < 0 ? 'past' : c === 0 ? 'today' : 'future';
}

/** Only active plants, and only today's or earlier leaves, can be changed. */
export function canMarkLeaf(habit: Habit, index: number, today: DateString): boolean {
  if (habit.status !== 'active') return false;
  if (index < 0 || index >= habit.leaves.length) return false;
  if (isPeriodOver(habit, today)) return false;
  return leafState(habit, index, today) !== 'future';
}

/** Returns an updated habit, or the same object if the change is not allowed. */
export function setLeafStatus(habit: Habit, index: number, status: LeafStatus, today: DateString): Habit {
  if (!canMarkLeaf(habit, index, today)) return habit;
  if (habit.leaves[index].status === status) return habit;
  const leaves = habit.leaves.map((leaf, i) => (i === index ? { ...leaf, status } : leaf));
  return { ...habit, leaves };
}

/** Marks every plant whose last day has passed as completed. Pure; returns the same array if nothing changed. */
export function refreshStatuses(habits: Habit[], today: DateString): Habit[] {
  let changed = false;
  const next = habits.map((h) => {
    if (h.status === 'active' && isPeriodOver(h, today)) {
      changed = true;
      return { ...h, status: 'completed' as const, completionSeen: false };
    }
    return h;
  });
  return changed ? next : habits;
}

export interface HabitStats {
  total: number;
  green: number;
  ochre: number;
  white: number;
  marked: number;
  /** green / total, rounded to a whole percent. */
  percent: number;
  allGreen: boolean;
}

export function habitStats(habit: Habit): HabitStats {
  const total = habit.leaves.length;
  const green = habit.leaves.filter((l) => l.status === 'green').length;
  const ochre = habit.leaves.filter((l) => l.status === 'ochre').length;
  const white = total - green - ochre;
  return {
    total,
    green,
    ochre,
    white,
    marked: green + ochre,
    percent: total === 0 ? 0 : Math.round((green / total) * 100),
    allGreen: total > 0 && green === total,
  };
}

/** Days still to come after today (on the last day this is 0). */
export function daysRemaining(habit: Habit, today: DateString): number {
  if (habit.status === 'completed') return 0;
  return Math.max(0, habit.durationDays - dayNumber(habit, today));
}

export const activeHabits = (habits: Habit[]) =>
  habits.filter((h) => h.status === 'active').sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const completedHabits = (habits: Habit[]) =>
  habits
    .filter((h) => h.status === 'completed')
    .sort((a, b) => compareDates(lastDate(b), lastDate(a)) || b.createdAt.localeCompare(a.createdAt));
