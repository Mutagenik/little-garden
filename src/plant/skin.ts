/**
 * "Soft botanical" plant skin (approved design, Option B).
 *
 * The generator (generatePlant.ts) decides WHERE leaves are; this module decides HOW they look:
 * - marked leaves are matte and two-tone (one half lighter), with a slight per-leaf shade variation
 *   and no dark outline — just a faint hairline;
 * - every style has its own leaf markings, drawn inside the leaf (clipped), in muted tones;
 * - white (unmarked) leaves stay plain, so a leaf visibly "comes alive" when it is marked.
 *
 * Everything here is pure and deterministic (depends only on the plant spec), so a plant looks
 * identical everywhere. Decorations are plain strokes/dots, never leaf-like shapes.
 */
import type { LeafStatus, PlantStyle } from '../lib/types';
import type { Point } from './geometry';
import type { PlantLeaf, PlantSpec } from './generatePlant';

const f1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Point) => `${f1(p.x)} ${f1(p.y)}`;
const add = (p: Point, q: Point, k = 1): Point => ({ x: p.x + q.x * k, y: p.y + q.y * k });
const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y });
const len = (v: Point) => Math.hypot(v.x, v.y) || 1;
const unit = (v: Point): Point => ({ x: v.x / len(v), y: v.y / len(v) });

export function mixHex(hex: string, other: string, k: number): string {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(other.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

function toneIndex(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) % 4;
}

// ---------------------------------------------------------------------------- colours
interface Palette {
  fills: string[];
  dark: string;
  vein: string;
  band: string;
  edge: string;
}
type Marked = Exclude<LeafStatus, 'white'>;

const SOFT: Record<Marked, Palette> = {
  green: { fills: ['#6f9a5e', '#7ea76b', '#628e56', '#88ae74'], dark: '#46703f', vein: '#c2dbb2', band: '#a9c694', edge: '#e6dca4' },
  ochre: { fills: ['#c79a60', '#d0a86f', '#bb8e57', '#d5b27c'], dark: '#8f6638', vein: '#efd8ae', band: '#e6cc98', edge: '#f0e2bf' },
};
/** Snake plant: deeper green with pale bands and a cream margin. */
const SNAKE: Record<Marked, Palette> = {
  green: { fills: ['#56804b', '#5f8a52', '#4f7845', '#668f58'], dark: '#3c6236', vein: '#9fbf8a', band: '#a9c694', edge: '#e9dfa8' },
  ochre: { fills: ['#b98c54', '#c39660', '#ad824c', '#c99f69'], dark: '#86602f', vein: '#e3c690', band: '#e6cc98', edge: '#f2e6c6' },
};

export const UNMARKED = { fill: '#fbf8f0', future: '#f7f4ec', line: '#b3bca3', vein: '#dfe3d4' };
export const STEM_COLOR = '#7d9466';

export interface LeafColors {
  fill: string;
  light: string;
  dark: string;
  vein: string;
  band: string;
  edge: string;
}

export function leafColors(style: PlantStyle, status: Marked, tone: number): LeafColors {
  const p = (style === 'slender' ? SNAKE : SOFT)[status];
  const fill = p.fills[tone % p.fills.length];
  return { fill, light: mixHex(fill, '#ffffff', 0.17), dark: p.dark, vein: p.vein, band: p.band, edge: p.edge };
}

// ---------------------------------------------------------------------------- leaf markings
export type DecorTone = 'dark' | 'vein' | 'band';
export interface DecorStroke {
  d: string;
  tone: DecorTone;
  width: number;
  opacity: number;
}
export interface DecorDot {
  cx: number;
  cy: number;
  r: number;
  tone: DecorTone;
  opacity: number;
}
export interface LeafSkin {
  /** Shade variant 0–3 (keeps neighbouring leaves distinguishable without outlines). */
  tone: number;
  /** Region covering one side of the midrib; filled lighter and clipped to the leaf. */
  half: string;
  strokes: DecorStroke[];
  dots: DecorDot[];
  /** Cream margin (snake plant). */
  edge: boolean;
}

interface Midrib {
  a: Point;
  c: Point;
  b: Point;
}

function parseVein(vein: string): Midrib {
  const n = (vein.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return { a: { x: n[0], y: n[1] }, c: { x: n[2], y: n[3] }, b: { x: n[4], y: n[5] } };
}
const at = (q: Midrib, t: number): Point => {
  const u = 1 - t;
  return { x: u * u * q.a.x + 2 * u * t * q.c.x + t * t * q.b.x, y: u * u * q.a.y + 2 * u * t * q.c.y + t * t * q.b.y };
};
const tangent = (q: Midrib, t: number): Point => {
  const s = Math.min(1, t);
  return unit({
    x: 2 * (1 - s) * (q.c.x - q.a.x) + 2 * s * (q.b.x - q.c.x),
    y: 2 * (1 - s) * (q.c.y - q.a.y) + 2 * s * (q.b.y - q.c.y),
  });
};
const normal = (q: Midrib, t: number): Point => {
  const T = tangent(q, t);
  return { x: -T.y, y: T.x };
};

const MARKINGS: Record<PlantStyle, 'feather' | 'tip' | 'serrate' | 'coin' | 'bands' | 'veins'> = {
  upright: 'feather', // calathea-like feathered stripes
  rosette: 'tip', // pale succulent tips
  fern: 'serrate', // fern notches
  bushy: 'coin', // pilea radial veins
  slender: 'bands', // snake-plant bands + cream margin
  tropical: 'veins', // philodendron side veins
};

export function leafSkin(spec: PlantSpec, leaf: PlantLeaf): LeafSkin {
  const q = parseVein(leaf.vein);
  const D = unit(sub(q.b, q.a));
  const N = { x: -D.y, y: D.x };
  const back = add(q.a, D, -30);
  const tipOut = add(leaf.tip, D, 6);
  const half = `M${pt(back)} L${pt(q.a)} Q${pt(q.c)} ${pt(q.b)} L${pt(tipOut)} L${pt(add(tipOut, N, 90))} L${pt(add(back, N, 90))} Z`;

  const strokes: DecorStroke[] = [];
  const dots: DecorDot[] = [];
  const kind = MARKINGS[spec.style];

  if (kind === 'feather') {
    for (let k = 1; k <= 7; k++) {
      const t = k / 8;
      const p = at(q, t);
      const T = tangent(q, t);
      const Nn = normal(q, t);
      const L = (k % 2 ? 13 : 8) * (1 - t * 0.35);
      for (const side of [1, -1]) {
        const e = add(add(p, T, L * 0.55), Nn, side * L);
        strokes.push({ d: `M${pt(p)} Q${pt(add(p, Nn, side * L * 0.6))} ${pt(e)}`, tone: 'dark', width: 2.2, opacity: 0.32 });
      }
    }
  } else if (kind === 'veins') {
    for (let k = 1; k <= 5; k++) {
      const t = 0.12 + k * 0.15;
      const p = at(q, t);
      const T = tangent(q, t);
      const Nn = normal(q, t);
      for (const side of [1, -1]) {
        const e = add(add(p, T, 9), Nn, side * 16);
        strokes.push({ d: `M${pt(p)} Q${pt(add(p, Nn, side * 10))} ${pt(e)}`, tone: 'vein', width: 0.8, opacity: 0.75 });
      }
    }
  } else if (kind === 'bands') {
    for (let t = 0.06; t < 1.05; t += 0.075) {
      const p = at(q, t);
      const T = tangent(q, t);
      const Nn = normal(q, t);
      const w = 7;
      strokes.push({
        d: `M${pt(add(p, Nn, -w))} Q${pt(add(add(p, Nn, -w / 2), T, 2.2))} ${pt(p)} Q${pt(add(add(p, Nn, w / 2), T, -2.2))} ${pt(add(p, Nn, w))}`,
        tone: 'band',
        width: 1.5,
        opacity: 0.55,
      });
    }
  } else if (kind === 'coin') {
    const c = leaf.hit;
    const R = len(sub(leaf.tip, leaf.hit));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      strokes.push({ d: `M${pt(c)} L${pt(add(c, { x: Math.cos(a), y: Math.sin(a) }, R * 0.78))}`, tone: 'vein', width: 0.7, opacity: 0.85 });
    }
    dots.push({ cx: f1(c.x), cy: f1(c.y), r: 1.4, tone: 'vein', opacity: 1 });
  } else if (kind === 'tip') {
    dots.push({ cx: f1(leaf.tip.x), cy: f1(leaf.tip.y), r: 7, tone: 'vein', opacity: 0.55 });
  } else if (kind === 'serrate') {
    for (let t = 0.15; t < 0.95; t += 0.11) {
      const p = at(q, t);
      const T = tangent(q, t);
      const Nn = normal(q, t);
      for (const side of [1, -1]) {
        strokes.push({ d: `M${pt(add(p, Nn, side * 2.2))} L${pt(add(add(p, Nn, side * 7), T, 2))}`, tone: 'vein', width: 0.9, opacity: 0.8 });
      }
    }
  }

  return { tone: toneIndex(spec.seed, leaf.index), half, strokes, dots, edge: kind === 'bands' };
}
