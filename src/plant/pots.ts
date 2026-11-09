/**
 * Matte, rimless, lightly speckled planters ("soft botanical" design).
 * Drawn directly in plant-canvas units: the pot top sits on the soil line (SOIL_Y).
 */
import { createRng } from '../lib/random';
import type { PotColor } from '../lib/types';
import { SOIL_Y, type PotShape } from './generatePlant';

export interface PotPalette {
  base: string;
  shade: string;
  speck: string;
}

export const POT_PALETTE: Record<PotColor, PotPalette> = {
  terracotta: { base: '#d3a287', shade: '#b98568', speck: '#a8755a' },
  dustyPink: { base: '#e8c8c0', shade: '#d2aaa1', speck: '#c39890' },
  mustard: { base: '#e2cc95', shade: '#cbb176', speck: '#b39a62' },
  softBlue: { base: '#bccbd1', shade: '#9fb2ba', speck: '#8ea2aa' },
  sage: { base: '#a9bb98', shade: '#8ea47d', speck: '#7f956f' },
  cream: { base: '#f2ede1', shade: '#ddd4c1', speck: '#c2b79f' },
};

const Y = SOIL_Y;

export interface PotGeometry {
  body: string;
  soilRx: number;
}

export const POT_GEOMETRY: Record<PotShape, PotGeometry> = {
  classic: {
    body: `M68 ${Y - 2} L132 ${Y - 2} L127.5 ${Y + 50} Q126.5 ${Y + 58} 118 ${Y + 58} L82 ${Y + 58} Q73.5 ${Y + 58} 72.5 ${Y + 50} Z`,
    soilRx: 30,
  },
  bowl: {
    body: `M61 ${Y - 2} L139 ${Y - 2} C138 ${Y + 30} 124 ${Y + 46} 100 ${Y + 46} C76 ${Y + 46} 62 ${Y + 30} 61 ${Y - 2} Z M88 ${Y + 44} L112 ${Y + 44} L110 ${Y + 52} L90 ${Y + 52} Z`,
    soilRx: 37,
  },
  cylinder: {
    body: `M71 ${Y - 3} L129 ${Y - 3} L129 ${Y + 51} Q129 ${Y + 58} 121 ${Y + 58} L79 ${Y + 58} Q71 ${Y + 58} 71 ${Y + 51} Z`,
    soilRx: 27,
  },
};

export const POT_SHADOW = { cx: 100, cy: Y + 59, rx: 44, ry: 3.6 };
export const SOIL = { cx: 100, cy: Y - 1.5, ry: 3.2 };

export interface Speck {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}

/** Deterministic speckle texture for a plant's pot. */
export function potSpecks(seed: number): Speck[] {
  const r = createRng(seed ^ 0xabc);
  const f1 = (n: number) => Math.round(n * 10) / 10;
  return Array.from({ length: 46 }, () => ({
    cx: f1(60 + r() * 80),
    cy: f1(Y + r() * 58),
    r: f1(0.45 + r() * 0.7),
    opacity: f1(0.35 + r() * 0.4),
  }));
}
