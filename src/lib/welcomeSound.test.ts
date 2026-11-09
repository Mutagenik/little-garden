import { setSoundEnabled } from './sound';
import { playWelcomeSound, WELCOME_GRACE_MS } from './welcomeSound';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('welcome sound', () => {
  afterEach(() => setSoundEnabled(true));

  it('plays once per app load', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    playWelcomeSound();
    playWelcomeSound();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('if the browser blocks autoplay, plays on the first tap instead', async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')))
      .mockImplementation(() => Promise.resolve());
    playWelcomeSound();
    await flush();
    expect(play).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('pointerdown'));
    expect(play).toHaveBeenCalledTimes(2);
    // Only once.
    window.dispatchEvent(new Event('pointerdown'));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('does not play on a late tap, or when sounds were switched off meanwhile', async () => {
    let now = 1_000;
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    playWelcomeSound(() => now);
    await flush();
    now += WELCOME_GRACE_MS + 1;
    window.dispatchEvent(new Event('pointerdown'));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('respects the sound switch for the delayed play', async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    playWelcomeSound();
    await flush();
    setSoundEnabled(false);
    window.dispatchEvent(new Event('keydown'));
    expect(play).toHaveBeenCalledTimes(1);
  });
});
