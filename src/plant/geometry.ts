/** Low-level SVG geometry helpers for the plant generator. */

export interface Point {
  x: number;
  y: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export const fmt = (p: Point) => `${r1(p.x)} ${r1(p.y)}`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Smooth open path through points (Catmull–Rom converted to cubic Béziers). No leading "M". */
export function splineSegments(pts: Point[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d;
}

export function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

export function quadPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

export function quadTangentAngle(p0: Point, p1: Point, p2: Point, t: number): number {
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  return Math.atan2(dy, dx);
}

/** Leaf outline shapes. `w` is the half-width (0…1) at position t along the leaf; `back` pulls the outline behind the base (heart lobes). */
export type LeafProfile = 'lanceolate' | 'ovate' | 'succulent' | 'blade' | 'round' | 'heart';

function profileAt(profile: LeafProfile, t: number): { w: number; back: number } {
  switch (profile) {
    case 'lanceolate':
      return { w: Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - 0.18 * t), back: 0 };
    case 'ovate':
      return { w: Math.sin(Math.PI * Math.pow(t, 0.72)), back: 0 };
    case 'succulent':
      return { w: Math.min(1, 0.55 + t * 1.8) * Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 0.62), back: 0 };
    case 'blade':
      return { w: Math.min(1, 0.6 + t * 3) * Math.pow(Math.max(0, 1 - Math.pow(t, 3.2)), 0.5), back: 0 };
    case 'round':
      return { w: Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2))), back: 0 };
    case 'heart':
      return {
        w: Math.sin(Math.PI * Math.pow(t, 0.62)) * (1 - 0.12 * t),
        back: t < 0.3 ? 0.17 * Math.sin((Math.PI * t) / 0.3) : 0,
      };
  }
}

export interface LeafParams {
  base: Point;
  /** Direction from base to tip, radians (SVG: 0 = right, −π/2 = up). */
  angle: number;
  length: number;
  /** Maximum half-width. */
  width: number;
  profile: LeafProfile;
  /** Sideways curve of the midrib, as a fraction of length (positive = towards the leaf's local +y). */
  bend: number;
  /** Where along the leaf (0…1) the touch centre sits. */
  hitT: number;
}

export interface LeafGeometry {
  d: string;
  vein: string;
  hit: Point;
  tip: Point;
  /** Smallest y of the outline (top edge of the leaf). */
  top: number;
}

export function buildLeaf(p: LeafParams): LeafGeometry {
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  const toGlobal = (lx: number, ly: number): Point => ({
    x: p.base.x + lx * cos - ly * sin,
    y: p.base.y + lx * sin + ly * cos,
  });
  const center = (t: number) => ({ x: p.length * t, y: p.bend * p.length * t * t });

  const steps = 16;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (1 - Math.cos((Math.PI * i) / steps)) / 2; // denser near base and tip
    const { w, back } = profileAt(p.profile, t);
    const c = center(t);
    const tx = 1;
    const ty = 2 * p.bend * t;
    const len = Math.hypot(tx, ty);
    const nx = -ty / len;
    const ny = tx / len;
    const hw = w * p.width;
    const bx = c.x - back * p.length;
    left.push(toGlobal(bx + nx * hw, c.y + ny * hw));
    right.push(toGlobal(bx - nx * hw, c.y - ny * hw));
  }
  const d = `M${fmt(left[0])}${splineSegments(left)}${splineSegments([...right].reverse())}Z`;

  const veinStart = p.profile === 'round' ? 0.12 : 0.02;
  const a = center(veinStart);
  const b = center(p.profile === 'round' ? 0.78 : 0.86);
  const m = center((veinStart + 0.86) / 2);
  const ctrl = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
  const vein = `M${fmt(toGlobal(a.x, a.y))} Q${fmt(toGlobal(ctrl.x, ctrl.y))} ${fmt(toGlobal(b.x, b.y))}`;

  const h = center(p.hitT);
  const tipC = center(1);
  const top = Math.min(...left.map((q) => q.y), ...right.map((q) => q.y));
  return { d, vein, hit: toGlobal(h.x, h.y), tip: toGlobal(tipC.x, tipC.y), top };
}
