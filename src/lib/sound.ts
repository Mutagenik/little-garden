/**
 * Gentle UI sounds, synthesised with the Web Audio API (no audio files, works offline).
 * Every sound is short and quiet; the phone's media volume controls loudness.
 * Sounds play only after a tap (browsers block audio before the first user gesture).
 */

export type SoundName = 'plant' | 'green' | 'ochre' | 'clear' | 'reroll';

const MASTER_VOLUME = 0.5;

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

interface Note {
  freq: number;
  /** Seconds after the sound starts. */
  at: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  /** Frequency at the end of the note (gentle glide). */
  glideTo?: number;
}

function playNotes(c: AudioContext, notes: Note[], cutoff = 4000): void {
  const out = c.createGain();
  out.gain.value = MASTER_VOLUME;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.connect(out);
  out.connect(c.destination);

  const now = c.currentTime + 0.01;
  for (const n of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? 'sine';
    const start = now + n.at;
    const end = start + n.duration;
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.glideTo) osc.frequency.exponentialRampToValueAtTime(n.glideTo, end);
    // Soft pluck: quick attack, smooth exponential fade.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(n.volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/** A short burst of filtered noise — like rustling leaves. */
function playRustle(c: AudioContext): void {
  const duration = 0.32;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    // Grainy envelope: a few soft swells, fading out.
    const swell = 0.55 + 0.45 * Math.sin(t * Math.PI * 7);
    data[i] = (Math.random() * 2 - 1) * swell * (1 - t) * Math.min(1, t * 12);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.value = 0.16 * MASTER_VOLUME;
  src.connect(band);
  band.connect(gain);
  gain.connect(c.destination);
  src.start();
}

const SOUNDS: Record<SoundName, (c: AudioContext) => void> = {
  // Rising, sparkling arpeggio: something new is growing.
  plant: (c) =>
    playNotes(c, [
      { freq: 196, at: 0, duration: 0.35, volume: 0.18, type: 'sine', glideTo: 220 },
      { freq: 523.25, at: 0.05, duration: 0.5, volume: 0.16, type: 'triangle' },
      { freq: 659.25, at: 0.13, duration: 0.5, volume: 0.15, type: 'triangle' },
      { freq: 783.99, at: 0.21, duration: 0.55, volume: 0.14, type: 'triangle' },
      { freq: 1046.5, at: 0.29, duration: 0.8, volume: 0.12, type: 'sine' },
    ]),
  // Bright, happy two-note chime.
  green: (c) =>
    playNotes(c, [
      { freq: 783.99, at: 0, duration: 0.28, volume: 0.16, type: 'triangle' },
      { freq: 1174.66, at: 0.08, duration: 0.45, volume: 0.13, type: 'sine' },
    ]),
  // Warm, soft, slightly lower tone — calm, never a "wrong" buzzer.
  ochre: (c) =>
    playNotes(
      c,
      [
        { freq: 392, at: 0, duration: 0.4, volume: 0.2, type: 'sine', glideTo: 370 },
        { freq: 587.33, at: 0.02, duration: 0.25, volume: 0.06, type: 'triangle' },
      ],
      1800,
    ),
  // Tiny, quiet tick.
  clear: (c) => playNotes(c, [{ freq: 1318.5, at: 0, duration: 0.07, volume: 0.07, type: 'sine', glideTo: 1100 }]),
  reroll: (c) => {
    playRustle(c);
    playNotes(c, [{ freq: 659.25, at: 0.16, duration: 0.3, volume: 0.07, type: 'sine', glideTo: 698.46 }]);
  },
};

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const c = getContext();
  if (!c) return;
  try {
    if (c.state === 'suspended') void c.resume();
    SOUNDS[name](c);
  } catch {
    /* Sound is a nicety; never let it break the app. */
  }
}

/** Test helper: forget the cached AudioContext. */
export function resetSoundForTests(): void {
  ctx = null;
  enabled = true;
}
