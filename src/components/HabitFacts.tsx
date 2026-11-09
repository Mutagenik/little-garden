import { useI18n } from '../i18n';
import { formatLongDate, formatShortDate } from '../lib/dates';
import { habitStats, lastDate } from '../lib/habits';
import type { Habit } from '../lib/types';
import './HabitFacts.css';

/** Statistics block for a finished plant (completion screen and garden detail). */
export function CompletionStats({ habit }: { habit: Habit }) {
  const { t, locale } = useI18n();
  const s = habitStats(habit);
  return (
    <div className="completion-stats">
      <div className="completion-stats__period">
        <span className="stat__label">{t('completion.period')}</span>
        <span>
          {formatLongDate(habit.startDate, locale)} – {formatLongDate(lastDate(habit), locale)}
        </span>
      </div>
      <div className="stat-grid">
        <Stat label={t('completion.total')} value={s.total} />
        <Stat label={t('completion.percent')} value={`${s.percent}%`} />
        <Stat label={t('completion.green')} value={s.green} swatch="green" />
        <Stat label={t('completion.ochre')} value={s.ochre} swatch="ochre" />
        <Stat label={t('completion.unmarked')} value={s.white} swatch="white" />
      </div>
    </div>
  );
}

function Stat({ label, value, swatch }: { label: string; value: string | number; swatch?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">
        {swatch && <span className={`swatch swatch--${swatch}`} aria-hidden />}
        {label}
      </span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

/** Day-by-day list of results. */
export function DayResults({ habit }: { habit: Habit }) {
  const { t, locale } = useI18n();
  const label = { green: t('garden.resultGreen'), ochre: t('garden.resultOchre'), white: t('garden.resultWhite') };
  return (
    <ol className="day-results">
      {habit.leaves.map((leaf, i) => (
        <li key={leaf.date} className="day-results__row">
          <span className={`swatch swatch--${leaf.status}`} aria-hidden />
          <span className="day-results__day">{t('care.leafTitle', { x: i + 1, date: formatShortDate(leaf.date, locale) })}</span>
          <span className="day-results__status">{label[leaf.status]}</span>
        </li>
      ))}
    </ol>
  );
}
