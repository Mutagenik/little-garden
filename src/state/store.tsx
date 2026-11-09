import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { getToday, type DateString } from '../lib/dates';
import { createHabit as buildHabit, refreshStatuses, setLeafStatus } from '../lib/habits';
import { setSoundEnabled } from '../lib/sound';
import { emptyData, loadData, saveData } from '../lib/storage';
import type { AppData, Habit, HabitDraft, LanguageCode, LeafStatus } from '../lib/types';

interface State {
  data: AppData;
  today: DateString;
  draft: HabitDraft | null;
}

type Action =
  | { type: 'tick'; today: DateString }
  | { type: 'add'; habit: Habit }
  | { type: 'leaf'; id: string; index: number; status: LeafStatus }
  | { type: 'edit'; id: string; name: string; successCondition: string }
  | { type: 'delete'; id: string }
  | { type: 'seen'; id: string }
  | { type: 'replace'; data: AppData }
  | { type: 'language'; language: LanguageCode }
  | { type: 'sound'; on: boolean }
  | { type: 'draft'; draft: HabitDraft | null };

function withHabits(state: State, habits: Habit[]): State {
  return habits === state.data.habits ? state : { ...state, data: { ...state.data, habits } };
}

function mapHabit(state: State, id: string, fn: (h: Habit) => Habit): State {
  let changed = false;
  const habits = state.data.habits.map((h) => {
    if (h.id !== id) return h;
    const next = fn(h);
    if (next !== h) changed = true;
    return next;
  });
  return changed ? withHabits(state, habits) : state;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      const habits = refreshStatuses(state.data.habits, action.today);
      if (action.today === state.today && habits === state.data.habits) return state;
      return { ...withHabits(state, habits), today: action.today };
    }
    case 'add':
      return withHabits(state, [...state.data.habits, action.habit]);
    case 'leaf':
      return mapHabit(state, action.id, (h) => setLeafStatus(h, action.index, action.status, state.today));
    case 'edit':
      return mapHabit(state, action.id, (h) => {
        const name = action.name.trim();
        const successCondition = action.successCondition.trim();
        if (!name || !successCondition) return h;
        return { ...h, name, successCondition };
      });
    case 'delete':
      return withHabits(
        state,
        state.data.habits.filter((h) => h.id !== action.id),
      );
    case 'seen':
      return mapHabit(state, action.id, (h) => (h.completionSeen ? h : { ...h, completionSeen: true }));
    case 'replace':
      return { ...state, data: { ...action.data, habits: refreshStatuses(action.data.habits, state.today) } };
    case 'language':
      return { ...state, data: { ...state.data, settings: { ...state.data.settings, language: action.language } } };
    case 'sound':
      return { ...state, data: { ...state.data, settings: { ...state.data.settings, sound: action.on } } };
    case 'draft':
      return { ...state, draft: action.draft };
  }
}

export interface Store {
  data: AppData;
  habits: Habit[];
  today: DateString;
  draft: HabitDraft | null;
  setDraft: (draft: HabitDraft | null) => void;
  createHabit: (draft: HabitDraft) => Habit;
  setLeaf: (id: string, index: number, status: LeafStatus) => void;
  editHabit: (id: string, name: string, successCondition: string) => void;
  deleteHabit: (id: string) => void;
  acknowledgeCompletion: (id: string) => void;
  replaceData: (data: AppData) => void;
  resetAll: () => void;
  setLanguage: (language: LanguageCode) => void;
  setSound: (on: boolean) => void;
  /** Re-reads "today" (used when the app returns to the foreground). */
  refreshToday: () => void;
}

const StoreContext = createContext<Store | null>(null);

function init(storage: Storage): State {
  const today = getToday();
  const data = loadData(storage);
  return { data: { ...data, habits: refreshStatuses(data.habits, today) }, today, draft: null };
}

export function StoreProvider({ children, storage }: { children: ReactNode; storage?: Storage }) {
  const store = storage ?? window.localStorage;
  const [state, dispatch] = useReducer(reducer, store, init);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Save immediately after every change.
  const lastSaved = useRef<AppData | null>(null);
  useEffect(() => {
    if (lastSaved.current === state.data) return;
    try {
      saveData(state.data, store);
      lastSaved.current = state.data;
    } catch (err) {
      console.error('Could not save data', err);
    }
  }, [state.data, store]);

  // Keep the sound module in step with the saved setting.
  useEffect(() => setSoundEnabled(state.data.settings.sound), [state.data.settings.sound]);

  const refreshToday = useCallback(() => dispatch({ type: 'tick', today: getToday() }), []);

  // Re-evaluate the date on start, when the app comes back to the foreground, and every half minute.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshToday();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshToday);
    window.addEventListener('pageshow', refreshToday);
    const timer = window.setInterval(refreshToday, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshToday);
      window.removeEventListener('pageshow', refreshToday);
      window.clearInterval(timer);
    };
  }, [refreshToday]);

  const value = useMemo<Store>(
    () => ({
      data: state.data,
      habits: state.data.habits,
      today: state.today,
      draft: state.draft,
      setDraft: (draft) => dispatch({ type: 'draft', draft }),
      createHabit: (draft) => {
        const { today, data } = stateRef.current;
        const habit = buildHabit(draft, today, data.habits);
        dispatch({ type: 'add', habit });
        dispatch({ type: 'draft', draft: null });
        return habit;
      },
      setLeaf: (id, index, status) => dispatch({ type: 'leaf', id, index, status }),
      editHabit: (id, name, successCondition) => dispatch({ type: 'edit', id, name, successCondition }),
      deleteHabit: (id) => dispatch({ type: 'delete', id }),
      acknowledgeCompletion: (id) => dispatch({ type: 'seen', id }),
      replaceData: (data) => dispatch({ type: 'replace', data }),
      resetAll: () => dispatch({ type: 'replace', data: emptyData() }),
      setLanguage: (language) => dispatch({ type: 'language', language }),
      setSound: (on) => dispatch({ type: 'sound', on }),
      refreshToday,
    }),
    [state, refreshToday],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
