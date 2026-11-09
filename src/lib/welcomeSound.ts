/**
 * Welcome chime played once each time the app loads (owner-supplied recording,
 * src/assets/sounds/welcome.mp3, ~3 s). It respects Settings → Sounds.
 *
 * Browser rules ("autoplay policy"): sound may start without a touch only where the browser
 * allows it — typically an INSTALLED app (home-screen app on Android, installed app on desktop) or a
 * site the person uses a lot. Otherwise audio stays locked until the first real interaction.
 * Only some events count as that interaction: a click/tap END (click, pointerup, touchend) or a
 * key press — NOT pointerdown/touchstart from a finger. So:
 *   1. The file is fetched and decoded with Web Audio (same AudioContext as the UI sounds).
 *   2. If the context is already allowed to run → play immediately.
 *   3. Otherwise wait for the first unlocking interaction and play then, within
 *      WELCOME_GRACE_MS, retrying on every interaction until the browser lets it play.
 *
 * <html data-welcome="…"> records what happened (loading / played / waiting-for-tap /
 * played-after-tap / skipped / unavailable) to make on-device diagnosis easy.
 */
import welcomeUrl from '../assets/sounds/welcome.mp3';
import { getAudioContext, isSoundEnabled } from './sound';

export const WELCOME_VOLUME = 0.6;
export const WELCOME_GRACE_MS = 60_000;

/** Events that browsers accept as a user activation for starting audio. */
const UNLOCK_EVENTS = ['click', 'pointerup', 'touchend', 'keydown'] as const;

let started = false; // once per page load (also guards React StrictMode's double effects)

function setState(state: string): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.welcome = state;
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = WELCOME_VOLUME;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export async function playWelcomeSound(now: () => number = Date.now): Promise<void> {
  if (started) return;
  started = true;
  const startedAt = now();
  const ctx = getAudioContext();
  if (!ctx || typeof fetch === 'undefined') {
    setState('unavailable');
    return;
  }
  setState('loading');

  let buffer: AudioBuffer;
  try {
    const data = await (await fetch(welcomeUrl)).arrayBuffer();
    buffer = await ctx.decodeAudioData(data);
  } catch {
    setState('unavailable');
    return;
  }

  // Try straight away: works where the browser allows sound without a touch.
  if (ctx.state !== 'running') {
    try {
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 250))]);
    } catch {
      /* still locked */
    }
  }
  if (ctx.state === 'running') {
    if (isSoundEnabled()) {
      playBuffer(ctx, buffer);
      setState('played');
    } else setState('skipped');
    return;
  }

  // Locked: play on the first real interaction (within the grace period).
  setState('waiting-for-tap');
  let done = false;
  const stop = () => {
    done = true;
    UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, onInteract, true));
  };
  function onInteract() {
    if (done) return;
    if (now() - startedAt > WELCOME_GRACE_MS || !isSoundEnabled()) {
      stop();
      setState('skipped');
      return;
    }
    // resume() must be called synchronously inside the interaction handler.
    ctx!.resume().then(
      () => {
        if (done || ctx!.state !== 'running') return; // not unlocked yet — keep listening
        stop();
        playBuffer(ctx!, buffer);
        setState('played-after-tap');
      },
      () => undefined,
    );
  }
  UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, onInteract, { capture: true, passive: true }));
  window.setTimeout(() => {
    if (!done) {
      stop();
      setState('skipped');
    }
  }, WELCOME_GRACE_MS);
}

/** Test helper. */
export function resetWelcomeForTests(): void {
  started = false;
  if (typeof document !== 'undefined') delete document.documentElement.dataset.welcome;
}
