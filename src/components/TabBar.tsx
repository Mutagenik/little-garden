import { useI18n } from '../i18n';
import { navigate, type Route } from '../state/router';
import { GardenIcon, RoomIcon, SettingsIcon } from './Icons';
import './TabBar.css';

const TABS = [
  { key: 'room', path: '/room', label: 'nav.room', Icon: RoomIcon, match: ['room', 'create', 'preview', 'care'] },
  { key: 'garden', path: '/garden', label: 'nav.garden', Icon: GardenIcon, match: ['garden', 'gardenDetail'] },
  { key: 'settings', path: '/settings', label: 'nav.settings', Icon: SettingsIcon, match: ['settings'] },
] as const;

export function TabBar({ route }: { route: Route }) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ key, path, label, Icon, match }) => {
        const active = (match as readonly string[]).includes(route.name);
        return (
          <button
            key={key}
            type="button"
            className={`tabbar__tab ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(path, { replace: true })}
          >
            <Icon />
            <span>{t(label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
