import { playSound, resetSoundForTests, setSoundEnabled, type SoundName } from './sound';

/** Minimal fake of the Web Audio API that counts started oscillators / noise sources. */
function installFakeAudio() {
  const started = { osc: 0, noise: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
  });
  const node = () => ({ connect: () => undefined });
  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume = () => Promise.resolve();
    createGain = () => ({ ...node(), gain: param() });
    createBiquadFilter = () => ({ ...node(), type: '', frequency: param(), Q: param() });
    createOscillator = () => ({
      ...node(),
      type: 'sine',
      frequency: param(),
      start: () => started.osc++,
      stop: () => undefined,
    });
    createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
    createBufferSource = () => ({ ...node(), buffer: null, start: () => started.noise++ });
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  return started;
}

describe('sounds', () => {
  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    resetSoundForTests();
  });

  it('does nothing (and never throws) where audio is unavailable', () => {
    resetSoundForTests();
    expect(() => playSound('green')).not.toThrow();
  });

  it.each<SoundName>(['plant', 'green', 'ochre', 'clear', 'reroll'])('plays "%s" when sounds are on', (name) => {
    resetSoundForTests();
    const started = installFakeAudio();
    playSound(name);
    expect(started.osc + started.noise).toBeGreaterThan(0);
  });

  it('stays silent when sounds are turned off', () => {
    resetSoundForTests();
    const started = installFakeAudio();
    setSoundEnabled(false);
    playSound('plant');
    playSound('green');
    expect(started.osc + started.noise).toBe(0);
  });
});
