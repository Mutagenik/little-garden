import { useRef, useState, type ChangeEvent } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { ConfirmDialog } from '../components/Modal';
import { dictionaries, useI18n } from '../i18n';
import { playSound, setSoundEnabled } from '../lib/sound';
import { exportJson, importJson } from '../lib/storage';
import type { AppData, LanguageCode } from '../lib/types';
import { useStore } from '../state/store';
import './SettingsScreen.css';

export function SettingsScreen() {
  const { t, language } = useI18n();
  const { data, today, replaceData, resetAll, setLanguage, setSound } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((m) => (m === text ? null : m)), 3500);
  };

  const onExport = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-garden-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(t('settings.exported'));
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = importJson(await file.text());
    if (result.ok) setPendingImport(result.data);
    else flash(t('settings.importError', { error: result.error }));
  };

  return (
    <main className="page settings">
      <header className="page__header page__header--brand">
        <h1 className="page__title">{t('settings.title')}</h1>
        <BrandLogo />
      </header>

      <section className="card settings__section">
        <label className="field">
          <span className="field__label">{t('settings.language')}</span>
          <select
            className="field__input"
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          >
            {(Object.keys(dictionaries) as LanguageCode[]).map((code) => (
              <option key={code} value={code}>
                {dictionaries[code].meta.languageName}
              </option>
            ))}
          </select>
          <span className="field__hint">{t('settings.languageHint')}</span>
        </label>
      </section>

      <section className="card settings__section">
        <label className="switch-row">
          <span className="switch-row__text">
            <span className="settings__heading">{t('settings.soundTitle')}</span>
            <span className="settings__text">{t('settings.soundText')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={data.settings.sound}
            onChange={(e) => {
              setSound(e.target.checked);
              if (e.target.checked) {
                setSoundEnabled(true);
                playSound('green');
              }
            }}
          />
        </label>
      </section>

      <section className="card settings__section">
        <h2 className="settings__heading">{t('settings.backupTitle')}</h2>
        <p className="settings__text">{t('settings.backupText')}</p>
        <button type="button" className="btn btn--primary btn--block" onClick={onExport}>
          {t('settings.export')}
        </button>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => fileRef.current?.click()}>
          {t('settings.import')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden
          onChange={onFile}
          data-testid="import-input"
        />
      </section>

      <section className="card settings__section">
        <h2 className="settings__heading">{t('settings.resetTitle')}</h2>
        <p className="settings__text">{t('settings.resetText')}</p>
        <button type="button" className="btn btn--danger btn--block" onClick={() => setResetOpen(true)}>
          {t('settings.reset')}
        </button>
      </section>

      <p className="settings__about">{t('settings.about', { v: __APP_VERSION__ })}</p>

      {pendingImport && (
        <ConfirmDialog
          title={t('settings.importConfirmTitle')}
          text={t('settings.importConfirmText', { count: pendingImport.habits.length, current: data.habits.length })}
          confirmLabel={t('settings.importConfirm')}
          cancelLabel={t('common.cancel')}
          onCancel={() => setPendingImport(null)}
          onConfirm={() => {
            replaceData(pendingImport);
            setPendingImport(null);
            flash(t('settings.importDone'));
          }}
        />
      )}

      {resetOpen && (
        <ConfirmDialog
          title={t('settings.resetConfirmTitle')}
          text={t('settings.resetConfirmText')}
          confirmLabel={t('settings.resetConfirm')}
          cancelLabel={t('common.cancel')}
          confirmDisabled={resetText.trim() !== t('settings.resetWord')}
          onCancel={() => {
            setResetOpen(false);
            setResetText('');
          }}
          onConfirm={() => {
            resetAll();
            setResetOpen(false);
            setResetText('');
            flash(t('settings.resetDone'));
          }}
        >
          <input
            className="field__input"
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder={t('settings.resetWord')}
            aria-label={t('settings.resetConfirmText')}
            autoCapitalize="characters"
            autoComplete="off"
          />
        </ConfirmDialog>
      )}

      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </main>
  );
}
