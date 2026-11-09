import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { setTodayProvider } from '../lib/dates';
import { resetWelcomeForTests } from '../lib/welcomeSound';

// jsdom cannot play media; pretend playback works (individual tests can override).
beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  setTodayProvider(null);
  resetWelcomeForTests();
  vi.restoreAllMocks();
  window.location.hash = '';
});
