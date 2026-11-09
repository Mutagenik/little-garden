import { useEffect, useMemo } from 'react';
import { BackIcon, RefreshIcon } from '../components/Icons';
import { playSound } from '../lib/sound';
import { useI18n } from '../i18n';
import { formatLongDate } from '../lib/dates';
import { createHabit, lastDate } from '../lib/habits';
import { createId } from '../lib/random';
import { POT_COLORS, type PotColor } from '../lib/types';
import { Plant } from '../plant/Plant';
import { POT_PALETTE } from '../plant/pots';
import { goBack, navigate, resetTo } from '../state/router';
import { useStore } from '../state/store';
import './PreviewScreen.css';

export function PreviewScreen() {
  const { t, locale } = useI18n();
  const store = useStore();
  const { draft, today, habits, setDraft } = store;

  // Reserve the plant's id now, so the plant shown here is exactly the one that gets planted.
  useEffect(() => {
    if (!draft) navigate('/new', { replace: true });
    else if (!draft.id) setDraft({ ...draft, id: createId() });
  }, [draft, setDraft]);

  const habit = useMemo(
    () => (draft?.id ? createHabit(draft, today, habits, { id: draft.id }) : null),
    [draft, today, habits],
  );
  if (!draft || !habit) return null;

  const grow = () => {
    store.createHabit(draft);
    playSound('plant');
    resetTo('/room');
  };

  /** Reserve a new id (= new seed) until the plant grows in a different style. */
  const reroll = () => {
    let id = createId();
    for (let i = 0; i < 30; i++) {
      if (createHabit({ ...draft, id }, today, habits, { id }).plantStyle !== habit.plantStyle) break;
      id = createId();
    }
    // Only the plant changes; the pot colour stays as shown (it has its own picker).
    setDraft({ ...draft, id, potColor: habit.potColor });
    playSound('reroll');
  };

  const pickPot = (potColor: PotColor) => {
    if (potColor === habit.potColor) return;
    setDraft({ ...draft, potColor });
    playSound('clear');
  };
  const edit = () => goBack('/new');

  return (
    <main className="page preview">
      <header className="page__header">
        <button type="button" className="back-link" onClick={edit}>
          <BackIcon /> {t('preview.edit')}
        </button>
        <h1 className="page__title">{t('preview.title')}</h1>
      </header>

      <div className="preview__stage">
        <div className="preview__plant">
          <Plant
            leafCount={habit.durationDays}
            seed={habit.plantSeed}
            style={habit.plantStyle}
            potColor={habit.potColor}
            title={t('preview.leavesEqualDays', { n: habit.durationDays })}
            crop
          />
        </div>
      </div>

      <div className="preview__reroll">
        <button type="button" className="btn btn--secondary btn--small" onClick={reroll}>
          <RefreshIcon /> {t('preview.reroll')}
        </button>
      </div>

      <div className="pot-picker" role="radiogroup" aria-label={t('preview.potColor')}>
        <span className="pot-picker__label" aria-hidden>
          {t('preview.potColor')}
        </span>
        <div className="pot-picker__swatches">
          {POT_COLORS.map((c) => {
            const p = POT_PALETTE[c];
            const selected = c === habit.potColor;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`pots.${c}`)}
                title={t(`pots.${c}`)}
                className={`pot-picker__swatch ${selected ? 'is-selected' : ''}`}
                onClick={() => pickPot(c)}
              >
                <span style={{ background: `linear-gradient(90deg, ${p.base} 45%, ${p.shade})` }} />
              </button>
            );
          })}
        </div>
      </div>

      <section className="preview__info">
        <h2 className="preview__name">{habit.name}</h2>
        {habit.successCondition && <p className="preview__condition">“{habit.successCondition}”</p>}
        <p className="preview__leaves">{t('preview.leavesEqualDays', { n: habit.durationDays })}</p>
        <p className="preview__dates">{t('preview.startsEnds', { date: formatLongDate(lastDate(habit), locale) })}</p>
      </section>

      <div className="preview__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={grow}>
          {t('preview.grow')}
        </button>
        <button type="button" className="btn btn--secondary btn--block" onClick={edit}>
          {t('preview.edit')}
        </button>
      </div>
    </main>
  );
}
