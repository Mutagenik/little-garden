/**
 * Tiny hash router. Hash URLs (#/garden) work on any static host, including
 * GitHub Pages sub-folders, and inside the installed app.
 */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'room' }
  | { name: 'create' }
  | { name: 'preview' }
  | { name: 'care'; id: string }
  | { name: 'garden' }
  | { name: 'gardenDetail'; id: string }
  | { name: 'settings' }
  | { name: 'gallery' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case undefined:
    case 'room':
      return { name: 'room' };
    case 'new':
      return parts[1] === 'preview' ? { name: 'preview' } : { name: 'create' };
    case 'plant':
      return parts[1] ? { name: 'care', id: parts[1] } : { name: 'room' };
    case 'garden':
      return parts[1] ? { name: 'gardenDetail', id: parts[1] } : { name: 'garden' };
    case 'settings':
      return { name: 'settings' };
    case 'gallery':
      return { name: 'gallery' };
    default:
      return { name: 'room' };
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
  };
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function useRoute(): Route {
  return parseRoute(useHash());
}

/** Navigate inside the app. `replace` swaps the current history entry. */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const url = `#${path}`;
  if (window.location.hash === url) return;
  const depth = ((window.history.state as { depth?: number } | null)?.depth ?? 0) + (options.replace ? 0 : 1);
  if (options.replace) window.history.replaceState({ depth }, '', url);
  else window.history.pushState({ depth }, '', url);
  window.scrollTo?.({ top: 0 });
  notify();
}

/** Rewind in-app history to its first entry and show `path` there (so Back does not reopen finished flows). */
export function resetTo(path: string): void {
  const depth = (window.history.state as { depth?: number } | null)?.depth ?? 0;
  if (depth === 0) {
    navigate(path, { replace: true });
    return;
  }
  const onPop = () => {
    window.removeEventListener('popstate', onPop);
    navigate(path, { replace: true });
  };
  window.addEventListener('popstate', onPop);
  window.history.go(-depth);
}

/** Go back if the previous page is inside the app, otherwise go to `fallback`. */
export function goBack(fallback: string): void {
  const depth = (window.history.state as { depth?: number } | null)?.depth ?? 0;
  if (depth > 0) window.history.back();
  else navigate(fallback, { replace: true });
}
