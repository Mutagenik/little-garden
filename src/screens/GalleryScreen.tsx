/** Development-only page: every plant style at 4, 7, 10 and 15 leaves. Not reachable in production builds. */
import { useState } from 'react';
import { useI18n } from '../i18n';
import { PLANT_STYLES, POT_COLORS, type LeafStatus } from '../lib/types';
import { Plant } from '../plant/Plant';

const COUNTS = [4, 7, 10, 15];
const SEEDS = [1234567, 987654321, 42424242];

function sampleStatuses(n: number): LeafStatus[] {
  return Array.from({ length: n }, (_, i) => (i % 5 === 3 ? 'ochre' : i % 7 === 5 ? 'white' : 'green'));
}

export default function GalleryScreen() {
  const { t } = useI18n();
  const [seedIndex, setSeedIndex] = useState(0);
  const [colored, setColored] = useState(false);
  const [indices, setIndices] = useState(true);
  const seed = SEEDS[seedIndex];

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <header className="page__header">
        <h1 className="page__title">{t('gallery.title')}</h1>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
          <label>
            Seed{' '}
            <select value={seedIndex} onChange={(e) => setSeedIndex(Number(e.target.value))}>
              {SEEDS.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={colored} onChange={(e) => setColored(e.target.checked)} /> Coloured leaves
          </label>
          <label>
            <input type="checkbox" checked={indices} onChange={(e) => setIndices(e.target.checked)} /> Day numbers &amp; touch areas
          </label>
        </div>
      </header>
      {PLANT_STYLES.map((style, si) => (
        <section key={style} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>{style}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {COUNTS.map((n) => (
              <figure key={n} style={{ margin: 0, background: 'var(--wall)', borderRadius: 12, padding: 8 }}>
                <Plant
                  leafCount={n}
                  seed={seed + n}
                  style={style}
                  potColor={POT_COLORS[(si + n) % POT_COLORS.length]}
                  statuses={colored ? sampleStatuses(n) : undefined}
                  todayIndex={Math.floor(n / 2)}
                  showIndices={indices}
                />
                <figcaption style={{ textAlign: 'center', fontSize: 13 }}>{n} leaves</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
