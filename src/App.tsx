import { lazy, Suspense, useEffect, useRef } from 'react';
import { playWelcomeSound } from './lib/welcomeSound';
import { TabBar } from './components/TabBar';
import { I18nProvider } from './i18n';
import { compareDates } from './lib/dates';
import { lastDate } from './lib/habits';
import { CareScreen } from './screens/CareScreen';
import { CompletionScreen } from './screens/CompletionScreen';
import { CreateScreen } from './screens/CreateScreen';
import { GardenDetailScreen, GardenScreen } from './screens/GardenScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { RoomScreen } from './screens/RoomScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { navigate, useRoute, type Route } from './state/router';
import { StoreProvider, useStore } from './state/store';

// The plant gallery exists only in development builds; production code never includes it.
const GalleryScreen = import.meta.env.DEV ? lazy(() => import('./screens/GalleryScreen')) : null;

export function App({ storage }: { storage?: Storage }) {
  return (
    <StoreProvider storage={storage}>
      <LocalizedApp />
    </StoreProvider>
  );
}

function LocalizedApp() {
  const { data } = useStore();
  // Welcome chime once per app load (if sounds are on).
  const soundOnAtStart = useRef(data.settings.sound);
  useEffect(() => {
    if (soundOnAtStart.current) void playWelcomeSound();
  }, []);
  return (
    <I18nProvider language={data.settings.language}>
      <Shell />
    </I18nProvider>
  );
}

function Shell() {
  const route = useRoute();
  const { habits, acknowledgeCompletion } = useStore();
  const pending = habits
    .filter((h) => h.status === 'completed' && !h.completionSeen)
    .sort((a, b) => compareDates(lastDate(a), lastDate(b)));
  const current = pending[0];

  return (
    <>
      <Screen route={route} />
      <TabBar route={route} />
      {current && (
        <CompletionScreen
          key={current.id}
          habit={current}
          onDone={() => {
            acknowledgeCompletion(current.id);
            if (pending.length === 1) navigate('/garden', { replace: true });
          }}
        />
      )}
    </>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'room':
      return <RoomScreen />;
    case 'create':
      return <CreateScreen />;
    case 'preview':
      return <PreviewScreen />;
    case 'care':
      return <CareScreen id={route.id} />;
    case 'garden':
      return <GardenScreen />;
    case 'gardenDetail':
      return <GardenDetailScreen id={route.id} />;
    case 'settings':
      return <SettingsScreen />;
    case 'gallery':
      return GalleryScreen ? (
        <Suspense fallback={null}>
          <GalleryScreen />
        </Suspense>
      ) : (
        <RoomScreen />
      );
  }
}
