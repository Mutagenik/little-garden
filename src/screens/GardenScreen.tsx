import { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { CompletionStats, DayResults } from '../components/HabitFacts';
import { BackIcon } from '../components/Icons';
import { ConfirmDialog } from '../components/Modal';
import { useI18n } from '../i18n';
import { formatShortDate } from '../lib/dates';
import { completedHabits, habitStats, lastDate } from '../lib/habits';
import type { Habit } from '../lib/types';
import { Plant } from '../plant/Plant';
import { goBack, navigate } from '../state/router';
import { useStore } from '../state/store';
import './GardenScreen.css';

export function GardenScreen() {
  const { t } = useI18n();
  const { habits } = useStore();
  const plants = completedHabits(habits);

  return (
    <main className="page garden">
      <header className="page__header page__header--brand">
        <h1 className="page__title">{t('garden.title')}</h1>
        <p className="page__subtitle">{t('garden.intro')}</p>
        <BrandLogo />
      </header>

      <div className="greenhouse">
        <div className="greenhouse__roof" aria-hidden />
        {plants.length === 0 ? (
          <div className="greenhouse__empty">
            <div className="greenhouse__bench greenhouse__bench--empty" aria-hidden />
            <h2>{t('garden.emptyTitle')}</h2>
            <p>{t('garden.emptyText')}</p>
          </div>
        ) : (
          <div className="greenhouse__beds">
            {plants.map((h) => (
              <GardenTile key={h.id} habit={h} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function GardenTile({ habit }: { habit: Habit }) {
  const { t, locale } = useI18n();
  const s = habitStats(habit);
  return (
    <button
      type="button"
      className="garden-tile"
      onClick={() => navigate(`/garden/${habit.id}`)}
      aria-label={t('garden.plantLabel', { name: habit.name, p: s.percent })}
    >
      <span className="garden-tile__plant">
        <Plant
          leafCount={habit.durationDays}
          seed={habit.plantSeed}
          style={habit.plantStyle}
          potColor={habit.potColor}
          statuses={habit.leaves.map((l) => l.status)}
          crop
        />
      </span>
      <span className="garden-tile__label" aria-hidden>
        <span className="garden-tile__name">{habit.name}</span>
        <span className="garden-tile__meta">
          {formatShortDate(habit.startDate, locale)} – {formatShortDate(lastDate(habit), locale)}
        </span>
        <span className="garden-tile__meta">{t('garden.percentShort', { p: s.percent })}</span>
      </span>
    </button>
  );
}

export function GardenDetailScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const { habits, deleteHabit, setDraft } = useStore();
  const [deleting, setDeleting] = useState(false);
  const habit = habits.find((h) => h.id === id && h.status === 'completed');

  if (!habit) {
    return (
      <main className="page">
        <button type="button" className="back-link" onClick={() => goBack('/garden')}>
          <BackIcon /> {t('common.back')}
        </button>
        <p>{t('care.notFound')}</p>
      </main>
    );
  }

  const growAgain = () => {
    setDraft({ name: habit.name, successCondition: habit.successCondition, durationDays: habit.durationDays });
    navigate('/new');
  };

  return (
    <main className="page garden-detail">
      <header className="page__header">
        <button type="button" className="back-link" onClick={() => goBack('/garden')}>
          <BackIcon /> {t('nav.garden')}
        </button>
        <h1 className="page__title">{habit.name}</h1>
        {habit.successCondition && <p className="care__condition">“{habit.successCondition}”</p>}
      </header>

      <div className="garden-detail__stage">
        <div className="garden-detail__plant">
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
      </div>
      <p className="garden-detail__readonly">{t('care.readOnlyHint')}</p>

      <CompletionStats habit={habit} />

      <h2 className="care__section-title garden-detail__heading">{t('garden.results')}</h2>
      <DayResults habit={habit} />

      <div className="garden-detail__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={growAgain}>
          {t('garden.growAgain')}
        </button>
        <button type="button" className="btn btn--danger btn--block" onClick={() => setDeleting(true)}>
          {t('garden.delete')}
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          title={t('care.deleteTitle')}
          text={t('care.deleteText', { name: habit.name })}
          confirmLabel={t('care.deleteConfirm')}
          cancelLabel={t('common.cancel')}
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            setDeleting(false);
            deleteHabit(habit.id);
            goBack('/garden');
          }}
        />
      )}
    </main>
  );
}
