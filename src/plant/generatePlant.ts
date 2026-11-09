/**
 * Procedural plant generator.
 *
 * generatePlant(leafCount, seed, style?) returns stems + EXACTLY `leafCount` leaves.
 * Leaves are the only leaf-like shapes in the output; stems are plain strokes.
 * leaves[i] is day i + 1. The same (leafCount, seed, style) always gives the same plant.
 *
 * Canvas: 200 × 279 units. The soil line is at y = SOIL_Y, the pot sits below it.
 *
 * Chronological order (day 1 → day N) per style:
 * - upright:  along the single stem from the base to the top, alternating left/right.
 * - rosette:  outermost ring first (oldest, longest leaves), left → right, then inner rings;
 *             the newest leaves sit in the centre, as in a real rosette.
 * - fern:     frond by frond from left to right; on each frond from the base to the tip.
 * - bushy:    inner (lowest) ring first, then outer rings; each ring left → right.
 * - slender:  blades left → right.
 * - tropical: inner ring first, then outer rings; each ring left → right.
 *
 * Touch: every leaf exposes a `hit` point. The renderer selects the nearest hit point
 * to a tap (within HIT_RADIUS), and the layouts keep hit points ≥ MIN_HIT_SPACING apart.
 */
import { createRng, range, pick, type Rng } from '../lib/random';
import { PLANT_STYLES, type PlantStyle } from '../lib/types';
import { buildLeaf, clamp, cubicPoint, fmt, lerp, quadPoint, quadTangentAngle, type LeafParams, type Point } from './geometry';

export const PLANT_WIDTH = 200;
/** Bottom of the pot (pots are drawn at 80%: SOIL_Y + 72 × 0.8 ≈ 274) plus its shadow. */
export const PLANT_HEIGHT = 279;
export const SOIL_Y = 216;
export const MIN_HIT_SPACING = 22;
export const HIT_RADIUS = 30;

export type PotShape = 'classic' | 'bowl' | 'cylinder';

export interface PlantLeaf {
  index: number;
  d: string;
  vein: string;
  hit: Point;
  tip: Point;
  top: number;
}

export interface PlantStem {
  d: string;
  width: number;
}

export interface PlantSpec {
  style: PlantStyle;
  seed: number;
  leafCount: number;
  stems: PlantStem[];
  /** Exactly leafCount leaves; leaves[i].index === i. */
  leaves: PlantLeaf[];
  /** Paint order (indices into leaves), back to front. */
  drawOrder: number[];
  pot: PotShape;
  /** Highest point of the foliage (smallest y), for cropping empty space above small plants. */
  top: number;
}

const POT_FOR_STYLE: Record<PlantStyle, PotShape> = {
  upright: 'classic',
  rosette: 'bowl',
  fern: 'classic',
  bushy: 'bowl',
  slender: 'cylinder',
  tropical: 'classic',
};

export function styleFromSeed(seed: number): PlantStyle {
  return PLANT_STYLES[seed % PLANT_STYLES.length];
}

interface Layout {
  stems: PlantStem[];
  leaves: LeafParams[];
  drawOrder?: number[];
}

// ---------------------------------------------------------------------------
// Ring slots: evenly spaced points on concentric arcs above a base point.
// Neighbouring rings are `spacing` apart and points on a ring are ≥ `spacing` apart,
// so every pair of slots is at least `spacing` apart.
// ---------------------------------------------------------------------------
interface Slot {
  ring: number;
  angle: number;
  radius: number;
  point: Point;
}

function ringSlots(
  n: number,
  opts: { base: Point; spacing: number; r0: number; a0: number; a1: number; rng: Rng; jitter: number },
): Slot[] {
  const { base, spacing, r0, a0, a1, rng } = opts;
  // Rings are jittered by ±jitter, so keep them 2·jitter further apart to preserve spacing.
  const gap = spacing + 2 * opts.jitter;
  const span = a1 - a0;
  const caps: number[] = [];
  let total = 0;
  for (let k = 0; total < n; k++) {
    const r = r0 + gap * k;
    const cap = Math.max(1, Math.floor((span * r) / spacing) + 1);
    caps.push(cap);
    total += cap;
  }
  // Share leaves between rings in proportion to their capacity (largest remainder).
  const raw = caps.map((c) => (n * c) / total);
  const counts = raw.map((v, i) => Math.min(caps[i], Math.max(1, Math.floor(v))));
  let left = n - counts.reduce((a, b) => a + b, 0);
  const byRemainder = raw.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem);
  while (left > 0) {
    for (const { i } of byRemainder) {
      if (left > 0 && counts[i] < caps[i]) {
        counts[i]++;
        left--;
      }
    }
  }
  while (left < 0) {
    const i = counts.findIndex((c) => c > 1);
    counts[i]--;
    left++;
  }

  const slots: Slot[] = [];
  counts.forEach((count, k) => {
    const r = r0 + gap * k + range(rng, -opts.jitter, opts.jitter);
    const cap = caps[k];
    const mid = (a0 + a1) / 2;
    const used = count === 1 ? 0 : Math.min(span, (span * (count - 1)) / Math.max(1, cap - 1) * 1.12);
    const shift = count === 1 ? range(rng, -0.25, 0.25) : 0;
    for (let j = 0; j < count; j++) {
      const angle = mid + shift + (count === 1 ? 0 : -used / 2 + (used * j) / (count - 1));
      slots.push({
        ring: k,
        angle,
        radius: r,
        point: { x: base.x + r * Math.cos(angle), y: base.y + r * Math.sin(angle) },
      });
    }
  });
  return slots;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** Single stem with alternating leaves, base → top. */
function upright(n: number, rng: Rng): Layout {
  const lBase = clamp(56 - 1.3 * n, 37, 51) * range(rng, 0.96, 1.06);
  // Leave room above the stem tip for the top leaf.
  const H = Math.min(clamp(70 + 9 * n, 100, 200), SOIL_Y - 4 - lBase * 0.62);
  const sway = range(rng, -16, 16);
  const b = { x: 100, y: SOIL_Y };
  // Control points at 1/3 and 2/3 height keep the stem's height linear in t, so leaves are evenly spaced.
  const c1 = { x: 100 + sway * 0.25, y: SOIL_Y - H / 3 };
  const c2 = { x: 100 + sway, y: SOIL_Y - (H * 2) / 3 };
  const top = { x: 100 + sway * 0.55, y: SOIL_Y - H };
  const widthRatio = range(rng, 0.3, 0.38);
  const profile = pick(rng, ['lanceolate', 'ovate'] as const);
  const firstSide = rng() < 0.5 ? -1 : 1;
  const leaves: LeafParams[] = [];
  for (let i = 0; i < n; i++) {
    const isTop = i === n - 1;
    // Side leaves sit on t ∈ [0.08, 0.9]; the top leaf crowns the stem tip.
    const t = isTop ? 1 : 0.08 + (0.82 * i) / Math.max(1, n - 2);
    const at = cubicPoint(b, c1, c2, top, t);
    const L = lBase * (1 - 0.25 * t) * range(rng, 0.95, 1.05);
    const side = i % 2 === 0 ? firstSide : -firstSide;
    const e = 0.28 + 0.3 * t + range(rng, -0.04, 0.04);
    const angle = isTop ? -Math.PI / 2 + side * 0.22 : side > 0 ? -e : -Math.PI + e;
    leaves.push({
      base: at,
      angle,
      length: isTop ? L * 0.82 : L,
      width: L * widthRatio,
      profile,
      bend: isTop ? 0 : side > 0 ? 0.1 : -0.1,
      hitT: 0.62,
    });
  }
  return { stems: [{ d: `M${fmt(b)} C${fmt(c1)} ${fmt(c2)} ${fmt(top)}`, width: 3.4 }], leaves };
}

/** Succulent rosette: leaves radiate from one centre; outer = oldest. */
function rosette(n: number, rng: Rng): Layout {
  const spacing = clamp(30 - 0.5 * n, 23, 28);
  const base = { x: 100 + range(rng, -4, 4), y: SOIL_Y - 2 };
  const slots = ringSlots(n, {
    base,
    spacing,
    r0: spacing * 1.15,
    a0: -Math.PI + 0.32,
    a1: -0.32,
    rng,
    jitter: 1.5,
  });
  // Outer rings first (oldest), each ring left → right.
  slots.sort((a, b) => b.ring - a.ring || a.angle - b.angle);
  const thick = range(rng, 0.24, 0.3);
  const leaves = slots.map((s) => {
    const hitT = 0.78;
    const L = s.radius / hitT;
    return {
      base,
      angle: s.angle,
      length: L,
      width: Math.min(L * thick, 15),
      profile: 'succulent' as const,
      bend: 0,
      hitT,
    };
  });
  return { stems: [], leaves };
}

/** Arching fronds carrying alternating leaflets. */
function fern(n: number, rng: Rng): Layout {
  const fronds = clamp(Math.round(n / 3.5), 2, 4);
  const per = Array.from({ length: fronds }, (_, f) => Math.floor(n / fronds) + (f < n % fronds ? 1 : 0));
  // Put the larger fronds in the middle for a balanced silhouette.
  per.sort((a, b) => b - a);
  const order = Array.from({ length: fronds }, (_, i) => i).sort(
    (a, b) => Math.abs(a - (fronds - 1) / 2) - Math.abs(b - (fronds - 1) / 2),
  );
  const counts: number[] = new Array(fronds);
  order.forEach((slot, i) => (counts[slot] = per[i]));

  const lean = range(rng, -0.06, 0.06);
  const leafLen = clamp(45 - n * 0.9, 31, 41) * range(rng, 0.95, 1.05);
  const stems: PlantStem[] = [];
  const leaves: LeafParams[] = [];
  const b = { x: 100, y: SOIL_Y };
  const spread = 0.75 + 0.25 * fronds;
  for (let f = 0; f < fronds; f++) {
    const k = counts[f];
    const u = fronds === 1 ? 0.5 : f / (fronds - 1);
    const theta = -Math.PI / 2 + lean + lerp(-spread / 2, spread / 2, u);
    // Outer fronds are shorter so the silhouette stays inside the canvas.
    const FL = clamp(64 + 17 * k, 96, 136) * (1 - 0.2 * Math.abs(u - 0.5) * 2) * range(rng, 0.96, 1.03);
    const droop = 0.14 * Math.cos(theta);
    const ctrl = {
      x: b.x + Math.cos(theta) * FL * 0.55,
      y: b.y + Math.sin(theta) * FL * 0.55 - FL * 0.22,
    };
    const end = { x: b.x + Math.cos(theta + droop) * FL, y: b.y + Math.sin(theta + droop) * FL - FL * 0.12 };
    stems.push({ d: `M${fmt(b)} Q${fmt(ctrl)} ${fmt(end)}`, width: 2.2 });
    const firstSide = Math.cos(theta) < 0 ? -1 : 1;
    // Arc-length table so leaflets are evenly spaced along the curved frond.
    const samples = 40;
    const cum = [0];
    for (let q = 1; q <= samples; q++) {
      const a = quadPoint(b, ctrl, end, (q - 1) / samples);
      const c = quadPoint(b, ctrl, end, q / samples);
      cum.push(cum[q - 1] + Math.hypot(c.x - a.x, c.y - a.y));
    }
    const tAtFraction = (frac: number) => {
      const target = frac * cum[samples];
      let q = 1;
      while (q < samples && cum[q] < target) q++;
      const seg = cum[q] - cum[q - 1] || 1;
      return (q - 1 + (target - cum[q - 1]) / seg) / samples;
    };
    for (let j = 0; j < k; j++) {
      const s = tAtFraction(k === 1 ? 0.66 : lerp(0.44, 0.96, j / (k - 1)));
      const at = quadPoint(b, ctrl, end, s);
      const tangent = quadTangentAngle(b, ctrl, end, s);
      const side = j % 2 === 0 ? firstSide : -firstSide;
      const L = leafLen * (1 - 0.3 * s);
      leaves.push({
        base: at,
        angle: tangent + side * 0.72,
        length: L,
        width: L * 0.27,
        profile: 'lanceolate',
        bend: side * 0.06,
        hitT: 0.52,
      });
    }
  }
  return { stems, leaves };
}

/** Round coin leaves on their own short stems, forming a dome. */
function bushy(n: number, rng: Rng): Layout {
  const spacing = clamp(32 - 0.6 * n, 23, 30);
  const base = { x: 100, y: SOIL_Y };
  const slots = ringSlots(n, {
    base,
    spacing,
    r0: spacing * 1.45,
    a0: -Math.PI + 0.28,
    a1: -0.28,
    rng,
    jitter: 1.5,
  });
  slots.sort((a, b) => a.ring - b.ring || a.angle - b.angle);
  const discR = spacing * 0.56;
  const stems: PlantStem[] = [];
  const leaves = slots.map((s) => {
    // Tilt the disc a little; the join is computed from the tilted angle so the disc centre stays on the slot.
    const angle = s.angle + range(rng, -0.15, 0.15);
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const join = { x: s.point.x - dir.x * discR, y: s.point.y - dir.y * discR };
    const from = { x: base.x + Math.cos(s.angle) * 5, y: base.y };
    const bow = range(rng, -8, 8);
    const ctrl = { x: (from.x + join.x) / 2 - dir.y * bow, y: (from.y + join.y) / 2 + dir.x * bow };
    stems.push({ d: `M${fmt(from)} Q${fmt(ctrl)} ${fmt(join)}`, width: 1.7 });
    return {
      base: join,
      angle,
      length: discR * 2,
      width: discR * range(rng, 0.92, 1),
      profile: 'round' as const,
      bend: 0,
      hitT: 0.5,
    };
  });
  return { stems, leaves };
}

/** Long slender blades fanning from the base, in staggered heights. */
function slender(n: number, rng: Rng): Layout {
  // Four height tiers in the pattern 0,2,1,3: neighbouring blades always differ in height,
  // and blades of the same height are four positions apart.
  const tiers = [0, 2, 1, 3];
  const tierOffset = Math.floor(rng() * 4);
  const spread = clamp(0.62 + 0.03 * n, 0.7, 1.0);
  const baseSpread = clamp(12 + 2 * n, 18, 38);
  const lMin = 62;
  const step = 28;
  const bendDir = rng() < 0.5 ? 1 : -1;
  const leaves: LeafParams[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const angle = -Math.PI / 2 + (u - 0.5) * spread + range(rng, -0.015, 0.015);
    const base = { x: 100 + (u - 0.5) * baseSpread, y: SOIL_Y + 1 };
    const L = lMin + tiers[(i + tierOffset) % 4] * step + range(rng, -1.5, 1.5);
    const outward = Math.sign(u - 0.5) || bendDir;
    leaves.push({
      base,
      angle,
      length: L,
      width: range(rng, 5.2, 6.4),
      profile: 'blade',
      bend: outward * 0.04, // arch outward, away from the centre
      hitT: 0.87,
    });
  }
  // Draw the tallest blades first so shorter ones stay visible in front.
  const drawOrder = leaves.map((_, i) => i).sort((a, b) => leaves[b].length - leaves[a].length);
  return { stems: [], leaves, drawOrder };
}

/** Heart-shaped leaves on long stalks, leaning to one side. */
function tropical(n: number, rng: Rng): Layout {
  const spacing = clamp(36 - 0.8 * n, 26, 33);
  const lean = (rng() < 0.5 ? -1 : 1) * range(rng, 0.12, 0.3);
  const base = { x: 100 - lean * 25, y: SOIL_Y };
  const slots = ringSlots(n, {
    base,
    spacing,
    r0: spacing * 1.5,
    a0: Math.max(-Math.PI + 0.44, -Math.PI + 0.46 + lean),
    a1: Math.min(-0.44, -0.46 + lean),
    rng,
    jitter: 2,
  });
  slots.sort((a, b) => a.ring - b.ring || a.angle - b.angle);
  const bladeL = spacing * 1.12;
  const stems: PlantStem[] = [];
  const leaves = slots.map((s) => {
    const c = Math.cos(s.angle);
    const droop = (c < 0 ? -1 : 1) * Math.min(1, Math.abs(c) * 2 + 0.3) * 0.55;
    const dir = s.angle + droop;
    const join = { x: s.point.x - Math.cos(dir) * bladeL * 0.5, y: s.point.y - Math.sin(dir) * bladeL * 0.5 };
    const ctrl = { x: base.x + (join.x - base.x) * 0.25, y: join.y + (base.y - join.y) * 0.35 };
    stems.push({ d: `M${fmt(base)} Q${fmt(ctrl)} ${fmt(join)}`, width: 1.8 });
    return {
      base: join,
      angle: dir,
      length: bladeL,
      width: bladeL * range(rng, 0.38, 0.44),
      profile: 'heart' as const,
      bend: (c < 0 ? -1 : 1) * 0.05,
      hitT: 0.5,
    };
  });
  return { stems, leaves };
}

const LAYOUTS: Record<PlantStyle, (n: number, rng: Rng) => Layout> = {
  upright,
  rosette,
  fern,
  bushy,
  slender,
  tropical,
};

export function generatePlant(leafCount: number, seed: number, style: PlantStyle = styleFromSeed(seed)): PlantSpec {
  if (!Number.isInteger(leafCount) || leafCount < 1) throw new Error('leafCount must be a positive integer');
  const rng = createRng(seed);
  const layout = LAYOUTS[style](leafCount, rng);
  const leaves: PlantLeaf[] = layout.leaves.map((p, index) => ({ index, ...buildLeaf(p) }));
  return {
    style,
    seed,
    leafCount,
    stems: layout.stems,
    leaves,
    drawOrder: layout.drawOrder ?? leaves.map((l) => l.index),
    pot: POT_FOR_STYLE[style],
    top: Math.min(SOIL_Y - 20, ...leaves.map((l) => l.top)),
  };
}

/** Index of the leaf whose touch centre is nearest to the point, or null if none is close enough. */
export function nearestLeaf(spec: PlantSpec, p: Point, maxDistance = HIT_RADIUS): number | null {
  let best: number | null = null;
  let bestD = maxDistance;
  for (const leaf of spec.leaves) {
    const d = Math.hypot(leaf.hit.x - p.x, leaf.hit.y - p.y);
    if (d <= bestD) {
      bestD = d;
      best = leaf.index;
    }
  }
  return best;
}
