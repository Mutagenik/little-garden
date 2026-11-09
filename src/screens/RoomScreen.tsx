import { BrandLogo } from '../components/BrandLogo';
import { PlusIcon } from '../components/Icons';
import { BookStack, WateringCan, WindowArt } from '../components/RoomArt';
import { useI18n } from '../i18n';
import { formatWeekdayDate } from '../lib/dates';
import { activeHabits, dayNumber, habitStats, todayIndex } from '../lib/habits';
import type { Habit } from '../lib/types';
import { Plant } from '../plant/Plant';
import { navigate } from '../state/router';
import { useStore } from '../state/store';
import './RoomScreen.css';

const PER_SHELF = 3;

export function RoomScreen() {
  const { t, locale } = useI18n();
  const { habits, today } = useStore();
  const plants = activeHabits(habits);
  const grow = () => navigate('/new');

  const shelves: Habit[][] = [];
  for (let i = 0; i < plants.length; i += PER_SHELF) shelves.push(plants.slice(i, i + PER_SHELF));

  return (
    <main className="page room">
      <header className="page__header page__header--brand room__header">
        <p className="room__date">{formatWeekdayDate(today, locale)}</p>
        <h1 className="page__title">{t('room.title')}</h1>
        <BrandLogo />
      </header>

      {plants.length === 0 ? (
        <section className="room__empty">
          <div className="room-scene">
            <div className="shelf shelf--sill shelf--empty">
              <WindowArt />
              <div className="shelf__decor">
                <WateringCan />
                <BookStack />
              </div>
            </div>
          </div>
          <h2 className="room__empty-title">{t('room.emptyTitle')}</h2>
          <p className="room__empty-text">{t('room.emptyText')}</p>
          <button type="button" className="btn btn--primary" onClick={grow}>
            <PlusIcon /> {t('room.emptyButton')}
          </button>
        </section>
      ) : (
        <>
          <button type="button" className="btn btn--primary btn--block room__grow" onClick={grow}>
            <PlusIcon /> {t('room.growButton')}
          </button>
          <div className="room-scene">
            {shelves.map((row, r) => (
              <div
                key={r}
                className={`shelf ${r === 0 ? 'shelf--sill' : 'shelf--wood'} ${plants.length === 1 ? 'shelf--single' : ''}`}
              >
                {r === 0 && <WindowArt />}
                {row.map((h) => (
                  <PlantTile key={h.id} habit={h} today={today} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function PlantTile({ habit, today }: { habit: Habit; today: string }) {
  const { t } = useI18n();
  const stats = habitStats(habit);
  const day = dayNumber(habit, today);
  const idx = todayIndex(habit, today);
  return (
    <button
      type="button"
      className="plant-tile"
      onClick={() => navigate(`/plant/${habit.id}`)}
      aria-label={t('room.plantLabel', {
        name: habit.name,
        x: day,
        n: habit.durationDays,
        marked: stats.marked,
        total: stats.total,
      })}
    >
      <span className="plant-tile__plant">
        <Plant
          leafCount={habit.durationDays}
          seed={habit.plantSeed}
          style={habit.plantStyle}
          potColor={habit.potColor}
          statuses={habit.leaves.map((l) => l.status)}
          todayIndex={idx}
          crop
        />
      </span>
      <span className="plant-tile__label" aria-hidden>
        <span className="plant-tile__name">{habit.name}</span>
        <span className="plant-tile__meta">
          {t('common.progress', { marked: stats.marked, total: stats.total })} ·{' '}
          {t('common.dayOf', { x: day, n: habit.durationDays })}
        </span>
      </span>
    </button>
  );
}
