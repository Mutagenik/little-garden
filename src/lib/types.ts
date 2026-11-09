import type { DateString } from './dates';

/** Allowed habit duration in days. Change these two numbers to extend the range. */
export const MIN_DURATION_DAYS = 4;
export const MAX_DURATION_DAYS = 15;

export type LeafStatus = 'white' | 'green' | 'ochre';

export interface Leaf {
  date: DateString;
  status: LeafStatus;
}

export const PLANT_STYLES = ['upright', 'rosette', 'fern', 'bushy', 'slender', 'tropical'] as const;
export type PlantStyle = (typeof PLANT_STYLES)[number];

export const POT_COLORS = ['terracotta', 'dustyPink', 'mustard', 'softBlue', 'sage', 'cream'] as const;
export type PotColor = (typeof POT_COLORS)[number];

export type HabitStatus = 'active' | 'completed';

export interface Habit {
  id: string;
  name: string;
  successCondition: string;
  durationDays: number;
  /** Day 1 = creation date, as a local calendar date. */
  startDate: DateString;
  plantSeed: number;
  plantStyle: PlantStyle;
  potColor: PotColor;
  /** leaves[i] is day i + 1; leaves[i].date = startDate + i days. */
  leaves: Leaf[];
  status: HabitStatus;
  /** True once the owner has seen the completion screen for this plant. */
  completionSeen: boolean;
  /** ISO timestamp of the moment the habit was created (informational only). */
  createdAt: string;
}

export type LanguageCode = 'en';

export interface Settings {
  language: LanguageCode;
  /** Gentle UI sounds on/off (added in schema version 2). */
  sound: boolean;
}

export const SCHEMA_VERSION = 2;

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION;
  habits: Habit[];
  settings: Settings;
}

export interface HabitDraft {
  name: string;
  successCondition: string;
  durationDays: number;
  /** Id reserved while previewing, so the previewed plant is exactly the one that gets planted. */
  id?: string;
  /** Pot colour chosen on the preview screen (otherwise picked automatically). */
  potColor?: PotColor;
}
