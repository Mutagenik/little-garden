import { useEffect, useState } from 'react';
import { BackIcon } from '../components/Icons';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useI18n } from '../i18n';
import { formatLongDate, formatShortDate } from '../lib/dates';
import { playSound } from '../lib/sound';
import { canMarkLeaf, dayNumber, daysRemaining, habitStats, lastDate, leafState, todayIndex } from '../lib/habits';
import type { Habit, LeafStatus } from '../lib/types';
import { Plant } from '../plant/Plant';
import { goBack, navigate } from '../state/router';
import { useStore } from '../state/store';
import './CareScreen.css';

export function CareScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const { habits } = useStore();
  const habit = habits.find((h) => h.id === id);

  // A plant that finished growing lives in the garden (read-only).
  useEffect(() => {
    if (habit?.status === 'completed') navigate(`/garden/${habit.id}`, { replace: true });
  }, [habit]);

  if (!habit) {
    return (
      <main className="page">
        <button type="button" className="back-link" onClick={() => goBack('/room')}>
          <BackIcon /> {t('common.back')}
        </button>
        <p>{t('care.notFound')}</p>
      </main>
    );
  }
  if (habit.status !== 'active') return null;
  return <CareView habit={habit} />;
}

function CareView({ habit }: { habit: Habit }) {
  const { t, locale } = useI18n();
  const { today, setLeaf, editHabit, deleteHabit } = useStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const idx = todayIndex(habit, today);
  const stats = habitStats(habit);
  const statusText = (i: number): string => {
    if (leafState(habit, i, today) === 'future') return t('care.statusFuture');
    const s = habit.leaves[i].status;
    return s === 'green' ? t('care.statusGreen') : s === 'ochre' ? t('care.statusOchre') : t('care.statusWhite');
  };
  const leafLabel = (i: number) =>
    t('care.leafLabel', { x: i + 1, date: formatShortDate(habit.leaves[i].date, locale), status: statusText(i) }) +
    (i === idx ? t('care.todaySuffix') : '');

  return (
    <main className="page care">
      <header className="page__header">
        <button type="button" className="back-link" onClick={() => goBack('/room')}>
          <BackIcon /> {t('nav.room')}
        </button>
        <h1 className="page__title">{habit.name}</h1>
        {habit.successCondition && <p className="care__condition">“{habit.successCondition}”</p>}
      </header>

      <div className="care__stage">
        <div className="care__plant">
          <Plant
            leafCount={habit.durationDays}
            seed={habit.plantSeed}
            style={habit.plantStyle}
            potColor={habit.potColor}
            statuses={habit.leaves.map((l) => l.status)}
            todayIndex={idx}
            futureFrom={idx + 1}
            selectedIndex={selected}
            onLeafSelect={setSelected}
            leafLabel={leafLabel}
            title={habit.name}
            crop
          />
        </div>
        <p className="care__day">{t('common.dayOf', { x: dayNumber(habit, today), n: habit.durationDays })}</p>
      </div>

      <p className="care__hint">{t('care.tapHint')}</p>

      <div className="care__legend" aria-hidden>
        <span>
          <span className="swatch swatch--green" /> {t('care.legendGreen')}
        </span>
        <span>
          <span className="swatch swatch--ochre" /> {t('care.legendOchre')}
        </span>
        <span>
          <span className="swatch swatch--white" /> {t('care.legendWhite')}
        </span>
      </div>

      <div className="stat-grid care__facts">
        <Fact label={t('care.started')} value={formatShortDate(habit.startDate, locale)} />
        <Fact label={t('care.ends')} value={formatShortDate(lastDate(habit), locale)} />
        <Fact label={t('care.marked')} value={t('common.progress', { marked: stats.marked, total: stats.total })} />
        <Fact label={t('care.remaining')} value={String(daysRemaining(habit, today))} />
      </div>

      <section className="care__days" aria-label={t('care.daysHeading')}>
        <h2 className="care__section-title">{t('care.daysHeading')}</h2>
        <div className="day-dots">
          {habit.leaves.map((leaf, i) => (
            <button
              key={leaf.date}
              type="button"
              className={`day-dot day-dot--${leaf.status} ${i === idx ? 'is-today' : ''} ${i > idx ? 'is-future' : ''}`}
              onClick={() => setSelected(i)}
              aria-label={leafLabel(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </section>

      <div className="care__actions">
        <button type="button" className="btn btn--secondary" onClick={() => setEditing(true)}>
          {t('care.edit')}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => setDeleting(true)}>
          {t('care.delete')}
        </button>
      </div>

      {selected !== null && (
        <LeafMenu
          habit={habit}
          index={selected}
          today={today}
          onPick={(status) => {
            setLeaf(habit.id, selected, status);
            playSound(status === 'white' ? 'clear' : status);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {editing && (
        <EditHabitDialog
          habit={habit}
          onSave={(name, condition) => {
            editHabit(habit.id, name, condition);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}

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
            goBack('/room');
          }}
        />
      )}
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

function LeafMenu({
  habit,
  index,
  today,
  onPick,
  onClose,
}: {
  habit: Habit;
  index: number;
  today: string;
  onPick: (status: LeafStatus) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const leaf = habit.leaves[index];
  const title = t('care.leafTitle', { x: index + 1, date: formatShortDate(leaf.date, locale) });
  const editable = canMarkLeaf(habit, index, today);
  return (
    <Modal title={title} onClose={onClose} variant="sheet">
      {editable ? (
        <div className="leaf-menu">
          <button
            type="button"
            className={`leaf-menu__option ${leaf.status === 'green' ? 'is-current' : ''}`}
            onClick={() => onPick('green')}
          >
            <span className="swatch swatch--green" aria-hidden /> {t('care.markGreen')}
          </button>
          <button
            type="button"
            className={`leaf-menu__option ${leaf.status === 'ochre' ? 'is-current' : ''}`}
            onClick={() => onPick('ochre')}
          >
            <span className="swatch swatch--ochre" aria-hidden /> {t('care.markOchre')}
          </button>
          <button
            type="button"
            className="leaf-menu__option leaf-menu__option--plain"
            onClick={() => onPick('white')}
            disabled={leaf.status === 'white'}
          >
            <span className="swatch swatch--white" aria-hidden /> {t('care.clear')}
          </button>
        </div>
      ) : (
        <p className="modal__text">{t('care.futureNote', { date: formatLongDate(leaf.date, locale) })}</p>
      )}
      <button type="button" className="btn btn--ghost" onClick={onClose}>
        {t('common.close')}
      </button>
    </Modal>
  );
}

function EditHabitDialog({
  habit,
  onSave,
  onClose,
}: {
  habit: Habit;
  onSave: (name: string, condition: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(habit.name);
  const [condition, setCondition] = useState(habit.successCondition);
  const valid = Boolean(name.trim());
  return (
    <Modal title={t('care.editTitle')} onClose={onClose}>
      <form
        className="edit-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name, condition);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="edit-name">
            {t('create.nameLabel')}
          </label>
          <input
            id="edit-name"
            className="field__input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          {!name.trim() && <span className="field__error">{t('create.nameRequired')}</span>}
        </div>
        <div className="field">
          <div className="field__label-row">
            <label className="field__label" htmlFor="edit-condition">
              {t('create.conditionLabel')}
            </label>
            <span className="field__optional" id="edit-condition-optional">
              {t('create.optional')}
            </span>
          </div>
          <textarea
            id="edit-condition"
            className="field__input"
            rows={2}
            maxLength={200}
            value={condition}
            placeholder={t('create.conditionPlaceholder')}
            onChange={(e) => setCondition(e.target.value)}
            aria-describedby="edit-condition-optional"
          />
        </div>
        <p className="field__hint">{t('care.durationLocked')}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={!valid}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
