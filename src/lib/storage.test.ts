import { createHabit, setLeafStatus } from './habits';
import { BACKUP_PREFIX, DATA_KEY, emptyData, exportJson, importJson, loadData, migrate, saveData } from './storage';
import { SCHEMA_VERSION, type AppData } from './types';

function sampleData(): AppData {
  let a = createHabit({ name: 'No coffee', successCondition: 'No coffee at all.', durationDays: 10 }, '2026-11-01', []);
  a = setLeafStatus(a, 0, 'green', '2026-11-05');
  a = setLeafStatus(a, 2, 'ochre', '2026-11-05');
  const b = createHabit({ name: 'Walk', successCondition: '30 minutes outside.', durationDays: 4 }, '2026-11-05', [a]);
  return { schemaVersion: SCHEMA_VERSION, habits: [a, b], settings: { language: 'en' } };
}

describe('storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty data when nothing is stored', () => {
    expect(loadData(localStorage)).toEqual(emptyData());
  });

  it('survives a reload (storage round-trip)', () => {
    const data = sampleData();
    saveData(data, localStorage);
    expect(loadData(localStorage)).toEqual(data);
  });

  it('survives an export → import round-trip', () => {
    const data = sampleData();
    const result = importJson(exportJson(data));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(data);
  });

  it('rejects invalid import files with a reason', () => {
    expect(importJson('not json').ok).toBe(false);
    expect(importJson('{"hello":1}').ok).toBe(true); // unversioned object with no plants → empty data
    const bad = sampleData();
    bad.habits[0].leaves[3].date = '2020-01-01';
    const r = importJson(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/wrong dates/);
    const future = { ...sampleData(), schemaVersion: SCHEMA_VERSION + 1 };
    expect(importJson(JSON.stringify(future)).ok).toBe(false);
  });

  it('does not wipe corrupt data: it keeps a backup copy', () => {
    localStorage.setItem(DATA_KEY, '{broken');
    expect(loadData(localStorage)).toEqual(emptyData());
    expect(localStorage.getItem(DATA_KEY)).toBe('{broken');
    const backups = Object.keys(localStorage).filter((k) => k.startsWith(BACKUP_PREFIX));
    expect(backups).toHaveLength(1);
  });

  it('migrates unversioned data from an earlier prototype and keeps a backup', () => {
    const legacy = {
      plants: [
        {
          id: 'old-1',
          title: 'Read',
          goal: 'Read 10 pages',
          plantType: 'monstera',
          startDate: '2026-11-01',
          endDate: '2026-11-07',
          marks: { '2026-11-01': 'done', '2026-11-02': 'missed' },
        },
        { nonsense: true },
      ],
    };
    localStorage.setItem('little-garden', JSON.stringify(legacy));
    const data = loadData(localStorage);
    expect(data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(data.habits).toHaveLength(1);
    const h = data.habits[0];
    expect(h.name).toBe('Read');
    expect(h.successCondition).toBe('Read 10 pages');
    expect(h.durationDays).toBe(7);
    expect(h.leaves[0]).toEqual({ date: '2026-11-01', status: 'green' });
    expect(h.leaves[1]).toEqual({ date: '2026-11-02', status: 'ochre' });
    expect(h.leaves[2].status).toBe('white');
    // Saved in the new format, with the original kept as a backup.
    expect(JSON.parse(localStorage.getItem(DATA_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.keys(localStorage).some((k) => k.startsWith(BACKUP_PREFIX))).toBe(true);
  });

  it('migration is a no-op for current data', () => {
    const data = sampleData();
    const r = migrate(JSON.parse(JSON.stringify(data)));
    expect(r.ok && r.data).toEqual(data);
  });
});
