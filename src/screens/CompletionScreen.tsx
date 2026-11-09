import { useEffect, useRef } from 'react';
import { CompletionStats } from '../components/HabitFacts';
import { useI18n } from '../i18n';
import { habitStats } from '../lib/habits';
import type { Habit } from '../lib/types';
import { Plant } from '../plant/Plant';
import './CompletionScreen.css';

const PETALS = Array.from({ length: 18 }, (_, i) => i);

/** Shown once per finished plant, the next time the app is opened. */
export function CompletionScreen({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const { t } = useI18n();
  const stats = habitStats(habit);
  const healthy = stats.allGreen;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [habit.id]);

  return (
    <div className={`completion ${healthy ? 'completion--healthy' : ''}`} role="dialog" aria-modal="true" aria-labelledby="completion-title">
      {healthy && (
        <div className="petals" aria-hidden>
          {PETALS.map((i) => (
            <span key={i} className="petal" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>
      )}
      <div className="completion__inner">
        <div className="completion__plant">
          <Plant
            leafCount={habit.durationDays}
            seed={habit.plantSeed}
            style={habit.plantStyle}
            potColor={habit.potColor}
            statuses={habit.leaves.map((l) => l.status)}
            title={habit.name}
            crop
          />
        </div>
        <h1 id="completion-title" className="completion__title" tabIndex={-1} ref={headingRef}>
          {healthy ? t('completion.healthyTitle') : t('completion.finishedTitle')}
        </h1>
        <p className="completion__text">
          {healthy
            ? t('completion.healthyText', { name: habit.name })
            : t('completion.finishedText', { name: habit.name, n: habit.durationDays })}
        </p>
        <CompletionStats habit={habit} />
        <button type="button" className="btn btn--primary btn--block" onClick={onDone}>
          {t('completion.toGarden')}
        </button>
      </div>
    </div>
  );
}
