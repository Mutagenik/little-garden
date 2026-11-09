import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setTodayProvider } from '../lib/dates';

afterEach(() => {
  cleanup();
  localStorage.clear();
  setTodayProvider(null);
  window.location.hash = '';
});
