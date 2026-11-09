/**
 * Welcome chime played once each time the app loads (owner-supplied recording,
 * src/assets/sounds/welcome.mp3, ~3 s). It respects Settings → Sounds.
 *
 * Browsers often block sound until the person has touched the page. If the browser blocks
 * the chime at load, it plays on the first tap or key press instead — but only during the first
 * WELCOME_GRACE_MS, so a late tap never triggers a stray welcome sound.
 */
import welcomeUrl from '../assets/sounds/welcome.mp3';
import { isSoundEnabled } from './sound';

export const WELCOME_VOLUME = 0.6;
export const WELCOME_GRACE_MS = 15_000;

let played = false; // once per page load (also guards React StrictMode's double effects)

const GESTURES = ['pointerdown', 'keydown', 'touchstart'] as const;

export function playWelcomeSound(now: () => number = Date.now): void {
  if (played || typeof Audio === 'undefined') return;
  played = true;
  const startedAt = now();
  let audio: HTMLAudioElement;
  try {
    audio = new Audio(welcomeUrl);
    audio.volume = WELCOME_VOLUME;
  } catch {
    return;
  }

  const removeListeners = () => GESTURES.forEach((g) => window.removeEventListener(g, onGesture, true));
  function onGesture() {
    removeListeners();
    if (now() - startedAt > WELCOME_GRACE_MS || !isSoundEnabled()) return;
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }

  let attempt: Promise<void> | undefined;
  try {
    attempt = audio.play();
  } catch {
    attempt = Promise.reject(new Error('play failed'));
  }
  Promise.resolve(attempt).catch(() => {
    // Autoplay blocked: wait for the first touch.
    GESTURES.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }));
    window.setTimeout(removeListeners, WELCOME_GRACE_MS);
  });
}

/** Test helper. */
export function resetWelcomeForTests(): void {
  played = false;
}
