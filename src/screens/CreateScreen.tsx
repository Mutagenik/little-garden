import { useState, type FormEvent } from 'react';
import { MinusIcon, PlusIcon, BackIcon } from '../components/Icons';
import { useI18n } from '../i18n';
import { clampDuration } from '../lib/habits';
import { MAX_DURATION_DAYS, MIN_DURATION_DAYS } from '../lib/types';
import { goBack, navigate } from '../state/router';
import { useStore } from '../state/store';
import './CreateScreen.css';

const DEFAULT_DURATION = 7;

export function CreateScreen() {
  const { t } = useI18n();
  const { draft, setDraft } = useStore();
  const [name, setName] = useState(draft?.name ?? '');
  const [condition, setCondition] = useState(draft?.successCondition ?? '');
  const [duration, setDuration] = useState(draft?.durationDays ?? DEFAULT_DURATION);
  const [submitted, setSubmitted] = useState(false);

  const nameError = !name.trim() ? t('create.nameRequired') : null;
  const conditionError = !condition.trim() ? t('create.conditionRequired') : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nameError || conditionError) return;
    setDraft({
      id: draft?.id,
      potColor: draft?.potColor,
      name: name.trim(),
      successCondition: condition.trim(),
      durationDays: duration,
    });
    navigate('/new/preview');
  };

  const step = (delta: number) => setDuration((d) => clampDuration(d + delta));

  return (
    <main className="page create">
      <header className="page__header">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            setDraft(null);
            goBack('/room');
          }}
        >
          <BackIcon /> {t('common.back')}
        </button>
        <h1 className="page__title">{t('create.title')}</h1>
        <p className="page__subtitle">{t('create.intro')}</p>
      </header>

      <form className="create__form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="habit-name">
            {t('create.nameLabel')}
          </label>
          <input
            id="habit-name"
            className="field__input"
            value={name}
            maxLength={60}
            placeholder={t('create.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={submitted && !!nameError}
            aria-describedby={submitted && nameError ? 'habit-name-error' : undefined}
            autoComplete="off"
          />
          {submitted && nameError && (
            <span className="field__error" id="habit-name-error">
              {nameError}
            </span>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="habit-condition">
            {t('create.conditionLabel')}
          </label>
          <textarea
            id="habit-condition"
            className="field__input"
            value={condition}
            maxLength={200}
            rows={2}
            placeholder={t('create.conditionPlaceholder')}
            onChange={(e) => setCondition(e.target.value)}
            aria-invalid={submitted && !!conditionError}
            aria-describedby={submitted && conditionError ? 'habit-condition-error' : undefined}
          />
          {submitted && conditionError && (
            <span className="field__error" id="habit-condition-error">
              {conditionError}
            </span>
          )}
        </div>

        <div className="field">
          <span className="field__label" id="duration-label">
            {t('create.durationLabel')}
          </span>
          <div className="stepper">
            <button
              type="button"
              className="stepper__btn"
              onClick={() => step(-1)}
              disabled={duration <= MIN_DURATION_DAYS}
              aria-label={t('create.decrease')}
            >
              <MinusIcon />
            </button>
            <output className="stepper__value" aria-live="polite" aria-labelledby="duration-label">
              <span className="stepper__number">{duration}</span>
              <span className="stepper__unit">{t('create.durationUnit')}</span>
            </output>
            <button
              type="button"
              className="stepper__btn"
              onClick={() => step(1)}
              disabled={duration >= MAX_DURATION_DAYS}
              aria-label={t('create.increase')}
            >
              <PlusIcon />
            </button>
          </div>
          <input
            type="range"
            className="stepper__range"
            min={MIN_DURATION_DAYS}
            max={MAX_DURATION_DAYS}
            step={1}
            value={duration}
            onChange={(e) => setDuration(clampDuration(Number(e.target.value)))}
            aria-labelledby="duration-label"
            aria-valuetext={t('create.durationValue', { n: duration })}
          />
          <span className="field__hint">
            {t('create.durationHint', { min: MIN_DURATION_DAYS, max: MAX_DURATION_DAYS })}
          </span>
        </div>

        <button type="submit" className="btn btn--primary btn--block">
          {t('create.continue')}
        </button>
      </form>
    </main>
  );
}
