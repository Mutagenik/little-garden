import type { PotColor } from '../lib/types';
import { SOIL_Y, type PotShape } from './generatePlant';

export interface PotPalette {
  base: string;
  shade: string;
  light: string;
}

export const POT_PALETTE: Record<PotColor, PotPalette> = {
  terracotta: { base: '#c6744f', shade: '#a65b3a', light: '#de9474' },
  dustyPink: { base: '#d8a5a0', shade: '#bd8782', light: '#ebc1bc' },
  mustard: { base: '#d3a634', shade: '#b38a22', light: '#e7c463' },
  softBlue: { base: '#91afc7', shade: '#7392ab', light: '#b2c9db' },
  sage: { base: '#9db08a', shade: '#829670', light: '#bac9a9' },
  cream: { base: '#ece1cb', shade: '#cfc0a2', light: '#f8f1e3' },
};

export interface PotGeometry {
  rim: { x: number; y: number; w: number; h: number; rx: number };
  body: string;
  shade: string;
  highlight: string;
  soil: { cx: number; cy: number; rx: number; ry: number };
  shadow: { cx: number; cy: number; rx: number; ry: number };
}

const Y = SOIL_Y;

/** Pots are drawn at 80% around the centre of the soil line, so the plant reads as the hero. */
export const POT_SCALE = 0.8;
export const POT_TRANSFORM = `translate(100 ${Y}) scale(${POT_SCALE}) translate(-100 ${-Y})`;

export const POT_GEOMETRY: Record<PotShape, PotGeometry> = {
  classic: {
    rim: { x: 58, y: Y - 4, w: 84, h: 16, rx: 5 },
    body: `M64 ${Y + 12} L71 ${Y + 64} Q72 ${Y + 72} 80 ${Y + 72} L120 ${Y + 72} Q128 ${Y + 72} 129 ${Y + 64} L136 ${Y + 12} Z`,
    shade: `M118 ${Y + 12} L136 ${Y + 12} L129 ${Y + 64} Q128 ${Y + 72} 120 ${Y + 72} L112 ${Y + 72} Q122 ${Y + 60} 118 ${Y + 12} Z`,
    highlight: `M73 ${Y + 18} Q75 ${Y + 18} 76 ${Y + 22} L80 ${Y + 58} Q80 ${Y + 62} 78 ${Y + 62} Q76 ${Y + 62} 76 ${Y + 58} L71 ${Y + 22} Q71 ${Y + 18} 73 ${Y + 18} Z`,
    soil: { cx: 100, cy: Y - 1, rx: 36, ry: 4 },
    shadow: { cx: 100, cy: Y + 72, rx: 46, ry: 4.5 },
  },
  bowl: {
    rim: { x: 52, y: Y - 4, w: 96, h: 13, rx: 5 },
    body: `M56 ${Y + 9} C58 ${Y + 46} 76 ${Y + 56} 100 ${Y + 56} C124 ${Y + 56} 142 ${Y + 46} 144 ${Y + 9} Z M84 ${Y + 54} L116 ${Y + 54} L113 ${Y + 64} Q112 ${Y + 66} 109 ${Y + 66} L91 ${Y + 66} Q88 ${Y + 66} 87 ${Y + 64} Z`,
    shade: `M124 ${Y + 9} L144 ${Y + 9} C142 ${Y + 46} 124 ${Y + 56} 106 ${Y + 56} C124 ${Y + 46} 128 ${Y + 30} 124 ${Y + 9} Z`,
    highlight: `M66 ${Y + 16} Q69 ${Y + 15} 70 ${Y + 19} Q73 ${Y + 34} 82 ${Y + 44} Q83 ${Y + 47} 80 ${Y + 47} Q70 ${Y + 40} 66 ${Y + 20} Q65 ${Y + 16} 66 ${Y + 16} Z`,
    soil: { cx: 100, cy: Y - 1, rx: 42, ry: 4 },
    shadow: { cx: 100, cy: Y + 66, rx: 44, ry: 4 },
  },
  cylinder: {
    rim: { x: 64, y: Y - 4, w: 72, h: 14, rx: 4 },
    body: `M67 ${Y + 10} L67 ${Y + 64} Q67 ${Y + 72} 75 ${Y + 72} L125 ${Y + 72} Q133 ${Y + 72} 133 ${Y + 64} L133 ${Y + 10} Z`,
    shade: `M118 ${Y + 10} L133 ${Y + 10} L133 ${Y + 64} Q133 ${Y + 72} 125 ${Y + 72} L114 ${Y + 72} Q121 ${Y + 60} 118 ${Y + 10} Z`,
    highlight: `M74 ${Y + 16} Q77 ${Y + 16} 77 ${Y + 20} L77 ${Y + 60} Q77 ${Y + 63} 74.5 ${Y + 63} Q72 ${Y + 63} 72 ${Y + 60} L72 ${Y + 20} Q72 ${Y + 16} 74 ${Y + 16} Z`,
    soil: { cx: 100, cy: Y - 1, rx: 30, ry: 3.6 },
    shadow: { cx: 100, cy: Y + 72, rx: 40, ry: 4.5 },
  },
};
