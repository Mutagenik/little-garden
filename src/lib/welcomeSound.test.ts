import { resetSoundForTests, setSoundEnabled } from './sound';
import { playWelcomeSound, resetWelcomeForTests, WELCOME_GRACE_MS } from './welcomeSound';

/**
 * Fake Web Audio + fetch. `locked` mimics a browser autoplay policy: resume() only works while
 * a user-activation event is being handled (we flag that from the test).
 */
function installFakeAudio(locked: boolean) {
  const state = { played: 0, inGesture: false };
  class FakeCtx {
    state: AudioContextState = locked ? 'suspended' : 'running';
    destination = {};
    resume = () => {
      if (!locked || state.inGesture) this.state = 'running';
      return Promise.resolve();
    };
    decodeAudioData = () => Promise.resolve({ duration: 3 } as AudioBuffer);
    createGain = () => ({ gain: { value: 1 }, connect: () => undefined });
    createBufferSource = () => ({ buffer: null, connect: () => undefined, start: () => state.played++ });
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new ArrayBuffer(8)));
  const interact = async (type: string) => {
    state.inGesture = true;
    window.dispatchEvent(new Event(type));
    state.inGesture = false;
    await new Promise((r) => setTimeout(r, 0));
  };
  return { state, interact };
}

const welcomeState = () => document.documentElement.dataset.welcome;

describe('welcome sound', () => {
  beforeEach(() => {
    resetSoundForTests();
    resetWelcomeForTests();
  });
  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    setSoundEnabled(true);
  });

  it('plays right away where the browser allows sound (e.g. installed app)', async () => {
    const { state } = installFakeAudio(false);
    await playWelcomeSound();
    expect(state.played).toBe(1);
    expect(welcomeState()).toBe('played');
    await playWelcomeSound(); // once per load
    expect(state.played).toBe(1);
  });

  it('when sound is locked, plays on the first real tap (tap end / click)', async () => {
    const { state, interact } = installFakeAudio(true);
    await playWelcomeSound();
    expect(state.played).toBe(0);
    expect(welcomeState()).toBe('waiting-for-tap');
    await interact('click');
    expect(state.played).toBe(1);
    expect(welcomeState()).toBe('played-after-tap');
    await interact('click');
    expect(state.played).toBe(1);
  });

  it('a finger touching down is not enough; lifting it is', async () => {
    const { state, interact } = installFakeAudio(true);
    await playWelcomeSound();
    await interact('pointerdown');
    await interact('touchstart');
    expect(state.played).toBe(0);
    await interact('touchend');
    expect(state.played).toBe(1);
  });

  it('keeps waiting if an interaction did not unlock audio', async () => {
    const { state } = installFakeAudio(true);
    await playWelcomeSound();
    window.dispatchEvent(new Event('click')); // dispatched outside a real gesture → stays locked
    await new Promise((r) => setTimeout(r, 0));
    expect(state.played).toBe(0);
    expect(welcomeState()).toBe('waiting-for-tap');
  });

  it('does not play after the grace period, or when sounds were switched off', async () => {
    let now = 1_000;
    const a = installFakeAudio(true);
    await playWelcomeSound(() => now);
    now += WELCOME_GRACE_MS + 1;
    await a.interact('click');
    expect(a.state.played).toBe(0);
    expect(welcomeState()).toBe('skipped');

    resetSoundForTests();
    resetWelcomeForTests();
    const b = installFakeAudio(true);
    await playWelcomeSound();
    setSoundEnabled(false);
    await b.interact('click');
    expect(b.state.played).toBe(0);
  });

  it('fails quietly where audio is unavailable', async () => {
    await expect(playWelcomeSound()).resolves.toBeUndefined();
    expect(welcomeState()).toBe('unavailable');
  });
});
