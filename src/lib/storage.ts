/**
 * Persistence for Little Garden.
 *
 * - Data is stored in localStorage under DATA_KEY as `{ schemaVersion, habits, settings }`.
 * - On every load the stored object is passed through `migrate()`, which upgrades any
 *   older schema step by step to SCHEMA_VERSION. Before a migration rewrites stored data,
 *   the original text is copied to a backup key, so nothing is ever silently lost.
 * - The service worker only caches app files; it never touches localStorage.
 */
import { consecutiveDates, isValidDateString, type DateString } from './dates';
import { chooseLook, clampDuration, seedFromId } from './habits';
import { createId } from './random';
import {
  PLANT_STYLES,
  POT_COLORS,
  SCHEMA_VERSION,
  type AppData,
  type Habit,
  type Leaf,
  type LeafStatus,
} from './types';

export const DATA_KEY = 'little-garden:data';
export const BACKUP_PREFIX = 'little-garden:backup:';
/** Keys an earlier prototype might have used; read once and migrated if found. */
const LEGACY_KEYS = ['little-garden', 'littleGarden', 'little-garden-data', 'myGarden'];

export function emptyData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, habits: [], settings: { language: 'en' } };
}

type ParseResult = { ok: true; data: AppData } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const LEAF_STATUSES: LeafStatus[] = ['white', 'green', 'ochre'];

/** Strict check of one habit in the current schema. Returns an error message or null. */
export function validateHabit(h: unknown): string | null {
  if (!isObject(h)) return 'a plant entry is not an object';
  if (typeof h.id !== 'string' || !h.id) return 'a plant has no id';
  if (typeof h.name !== 'string' || !h.name.trim()) return `plant ${h.id} has no name`;
  if (typeof h.successCondition !== 'string') return `plant "${h.name}" has no success condition`;
  if (typeof h.durationDays !== 'number' || !Number.isInteger(h.durationDays) || h.durationDays < 1)
    return `plant "${h.name}" has an invalid duration`;
  if (!isValidDateString(h.startDate)) return `plant "${h.name}" has an invalid start date`;
  if (typeof h.plantSeed !== 'number' || !Number.isFinite(h.plantSeed)) return `plant "${h.name}" has no seed`;
  if (!PLANT_STYLES.includes(h.plantStyle as never)) return `plant "${h.name}" has an unknown style`;
  if (!POT_COLORS.includes(h.potColor as never)) return `plant "${h.name}" has an unknown pot colour`;
  if (h.status !== 'active' && h.status !== 'completed') return `plant "${h.name}" has an invalid status`;
  if (typeof h.completionSeen !== 'boolean') return `plant "${h.name}" is missing completionSeen`;
  if (typeof h.createdAt !== 'string') return `plant "${h.name}" is missing createdAt`;
  if (!Array.isArray(h.leaves) || h.leaves.length !== h.durationDays)
    return `plant "${h.name}" does not have one leaf per day`;
  const expected = consecutiveDates(h.startDate, h.durationDays);
  for (let i = 0; i < h.leaves.length; i++) {
    const leaf = h.leaves[i] as unknown;
    if (!isObject(leaf)) return `plant "${h.name}" has a broken leaf`;
    if (leaf.date !== expected[i]) return `plant "${h.name}" has leaves with wrong dates`;
    if (!LEAF_STATUSES.includes(leaf.status as LeafStatus)) return `plant "${h.name}" has a leaf with unknown colour`;
  }
  return null;
}

export function validateAppData(data: unknown): string | null {
  if (!isObject(data)) return 'the file does not contain Little Garden data';
  if (data.schemaVersion !== SCHEMA_VERSION) return 'unsupported data version';
  if (!Array.isArray(data.habits)) return 'the file has no list of plants';
  const ids = new Set<string>();
  for (const h of data.habits) {
    const err = validateHabit(h);
    if (err) return err;
    const id = (h as Habit).id;
    if (ids.has(id)) return 'two plants share the same id';
    ids.add(id);
  }
  if (!isObject(data.settings) || data.settings.language !== 'en') return 'settings are invalid';
  return null;
}

// ---------------------------------------------------------------------------
// Migrations: each entry upgrades data from version N to N + 1.
// Version 0 = any unversioned object from an earlier prototype (e.g. the old
// fixed plant-library version). It is converted best-effort; anything that
// cannot be understood is skipped, and the raw original is kept as a backup.
// ---------------------------------------------------------------------------

const legacyStatus = (v: unknown): LeafStatus => {
  if (v === true || v === 'green' || v === 'done' || v === 'yes' || v === 'success') return 'green';
  if (v === false || v === 'ochre' || v === 'missed' || v === 'no' || v === 'fail' || v === 'dry') return 'ochre';
  return 'white';
};

function migrateLegacyHabit(raw: unknown, index: number, previous: Habit | undefined): Habit | null {
  if (!isObject(raw)) return null;
  const name = [raw.name, raw.title, raw.habit, raw.habitName].find((v) => typeof v === 'string' && v.trim()) as
    | string
    | undefined;
  const startDate = [raw.startDate, raw.start, raw.startedOn].find(isValidDateString) as DateString | undefined;
  if (!name || !startDate) return null;

  let duration = [raw.durationDays, raw.duration, raw.days, raw.length].find(
    (v) => typeof v === 'number' && v > 0,
  ) as number | undefined;
  if (duration === undefined && Array.isArray(raw.leaves)) duration = raw.leaves.length;
  if (duration === undefined && isValidDateString(raw.endDate)) {
    duration = consecutiveDates(startDate, 400).indexOf(raw.endDate) + 1 || undefined;
  }
  if (!duration) return null;
  duration = clampDuration(duration);

  const dates = consecutiveDates(startDate, duration);
  const marks: Record<string, unknown> = isObject(raw.marks) ? raw.marks : isObject(raw.log) ? raw.log : {};
  const oldLeaves = Array.isArray(raw.leaves) ? raw.leaves : [];
  const leaves: Leaf[] = dates.map((date, i) => {
    const old = oldLeaves[i] as unknown;
    const fromLeaf = isObject(old) ? (old.status ?? old.state ?? old.done) : old;
    return { date, status: legacyStatus(marks[date] ?? fromLeaf) };
  });

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `migrated-${index}-${createId()}`;
  const plantSeed = typeof raw.plantSeed === 'number' ? raw.plantSeed : seedFromId(id);
  const look = chooseLook(plantSeed, previous);
  return {
    id,
    name: name.trim(),
    successCondition:
      ([raw.successCondition, raw.condition, raw.goal, raw.description].find((v) => typeof v === 'string') as
        | string
        | undefined) ?? '',
    durationDays: duration,
    startDate,
    plantSeed,
    plantStyle: PLANT_STYLES.includes(raw.plantStyle as never) ? (raw.plantStyle as Habit['plantStyle']) : look.plantStyle,
    potColor: POT_COLORS.includes(raw.potColor as never) ? (raw.potColor as Habit['potColor']) : look.potColor,
    leaves,
    // Status is re-evaluated against today right after loading.
    status: 'active',
    completionSeen: raw.completionSeen === true,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
  };
}

const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  0: (data) => {
    const list = [data.habits, data.plants, data.items].find(Array.isArray) as unknown[] | undefined;
    const habits: Habit[] = [];
    (list ?? []).forEach((raw, i) => {
      const h = migrateLegacyHabit(raw, i, habits.at(-1));
      if (h && !habits.some((x) => x.id === h.id)) habits.push(h);
    });
    return { schemaVersion: 1, habits, settings: { language: 'en' } };
  },
};

export function detectVersion(data: Record<string, unknown>): number {
  return typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
}

/** Upgrades any known older shape to the current schema, then validates it. */
export function migrate(input: unknown): ParseResult {
  if (Array.isArray(input)) input = { habits: input };
  if (!isObject(input)) return { ok: false, error: 'the file does not contain Little Garden data' };
  let data = input;
  let version = detectVersion(data);
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: 'this data was made by a newer version of Little Garden' };
  }
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, error: `cannot upgrade data from version ${version}` };
    data = step(data);
    version = detectVersion(data);
  }
  const error = validateAppData(data);
  return error ? { ok: false, error } : { ok: true, data: data as unknown as AppData };
}

export function parseJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'the file is not valid JSON' };
  }
  return migrate(raw);
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Loads saved data, migrating older formats. Never throws; corrupt data is backed up, not deleted. */
export function loadData(storage: Storage = localStorage): AppData {
  let key = DATA_KEY;
  let text = safeGet(storage, DATA_KEY);
  if (text === null) {
    for (const legacy of LEGACY_KEYS) {
      const t = safeGet(storage, legacy);
      if (t !== null) {
        key = legacy;
        text = t;
        break;
      }
    }
  }
  if (text === null) return emptyData();

  const result = parseJson(text);
  let parsedVersion: number | null = null;
  try {
    const raw = JSON.parse(text);
    parsedVersion = isObject(raw) ? detectVersion(raw) : 0;
  } catch {
    parsedVersion = null;
  }
  const needsBackup = !result.ok || key !== DATA_KEY || parsedVersion !== SCHEMA_VERSION;
  if (needsBackup) {
    try {
      storage.setItem(`${BACKUP_PREFIX}${new Date().toISOString()}`, text);
    } catch {
      /* storage full — keep going with what we have */
    }
  }
  if (!result.ok) return emptyData();
  if (key !== DATA_KEY || parsedVersion !== SCHEMA_VERSION) saveData(result.data, storage);
  return result.data;
}

export function saveData(data: AppData, storage: Storage = localStorage): void {
  storage.setItem(DATA_KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString(), app: 'Little Garden' }, null, 2);
}

/** Removes extra export-only fields before validation. */
export function importJson(text: string): ParseResult {
  const result = parseJson(text);
  if (!result.ok) return result;
  const { schemaVersion, habits, settings } = result.data;
  return { ok: true, data: { schemaVersion, habits, settings } };
}
