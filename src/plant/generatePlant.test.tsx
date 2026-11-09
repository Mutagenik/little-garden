import { render } from '@testing-library/react';
import { PLANT_STYLES, MAX_DURATION_DAYS, MIN_DURATION_DAYS } from '../lib/types';
import { generatePlant, MIN_HIT_SPACING, nearestLeaf, PLANT_WIDTH } from './generatePlant';
import { Plant } from './Plant';

const COUNTS = Array.from({ length: MAX_DURATION_DAYS - MIN_DURATION_DAYS + 1 }, (_, i) => MIN_DURATION_DAYS + i);
const SEEDS = [1, 7, 42, 1234567, 2 ** 31 + 17, 3_999_999_999];

describe('generatePlant', () => {
  it.each(PLANT_STYLES)('style %s returns exactly N leaves for every N from 4 to 15', (style) => {
    for (const n of COUNTS) {
      for (const seed of SEEDS) {
        const plant = generatePlant(n, seed, style);
        expect(plant.leaves).toHaveLength(n);
        expect(plant.leaves.map((l) => l.index)).toEqual([...Array(n).keys()]);
        expect([...plant.drawOrder].sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
      }
    }
  });

  it.each(PLANT_STYLES)('style %s renders exactly N interactive leaf elements', (style) => {
    for (const n of COUNTS) {
      const { container, unmount } = render(
        <Plant leafCount={n} seed={99} style={style} potColor="sage" onLeafSelect={() => {}} leafLabel={(i) => `Day ${i + 1}`} />,
      );
      expect(container.querySelectorAll('[data-leaf-index]')).toHaveLength(n);
      expect(container.querySelectorAll('[role="button"]')).toHaveLength(n);
      // Only leaves carry the leaf-blade class: no decorative leaf-like shapes.
      expect(container.querySelectorAll('.leaf__blade')).toHaveLength(n);
      unmount();
    }
  });

  it('is deterministic: the same seed gives the same plant', () => {
    for (const style of PLANT_STYLES) {
      for (const n of [4, 9, 15]) {
        expect(generatePlant(n, 314159, style)).toEqual(generatePlant(n, 314159, style));
      }
    }
  });

  it('different seeds give different plants', () => {
    const a = generatePlant(8, 1, 'upright');
    const b = generatePlant(8, 2, 'upright');
    expect(a.leaves.map((l) => l.d)).not.toEqual(b.leaves.map((l) => l.d));
  });

  it('keeps leaf touch centres far enough apart for a finger (all styles, sizes, many seeds)', () => {
    for (const style of PLANT_STYLES) {
      for (const n of COUNTS) {
        for (let s = 1; s <= 60; s++) {
          const plant = generatePlant(n, s * 7919, style);
          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              const a = plant.leaves[i].hit;
              const b = plant.leaves[j].hit;
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < MIN_HIT_SPACING) throw new Error(`${style} n=${n} seed=${s * 7919}: leaves ${i} & ${j} are ${d.toFixed(1)} apart`);
            }
          }
        }
      }
    }
  });

  it('keeps touch centres inside the canvas', () => {
    for (const style of PLANT_STYLES) {
      for (const n of COUNTS) {
        for (let s = 1; s <= 30; s++) {
          for (const leaf of generatePlant(n, s * 104729, style).leaves) {
            const where = `${style} n=${n} seed=${s * 104729} leaf ${leaf.index}`;
            expect(leaf.hit.x, where).toBeGreaterThan(0);
            expect(leaf.hit.x, where).toBeLessThan(PLANT_WIDTH);
            expect(leaf.hit.y, where).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('a tap on a leaf touch centre selects that leaf', () => {
    for (const style of PLANT_STYLES) {
      const plant = generatePlant(15, 2024, style);
      for (const leaf of plant.leaves) expect(nearestLeaf(plant, leaf.hit)).toBe(leaf.index);
    }
  });

  it('upright leaves are ordered from the base upward', () => {
    const plant = generatePlant(12, 555, 'upright');
    const ys = plant.leaves.map((l) => l.hit.y);
    for (let i = 2; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 2]);
  });
});
