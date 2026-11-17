/* Shared helpers for the sand flow (flow.ts): the ball's ink, the hash and noise the shaders
   mirror, a seeded random, and the dunes mirrored from DUNE_GLSL (dune-glsl.ts) so the grains
   know where the dunes are. */

export const DUNE_TOP = 0.3; /* the dunes are drawn in the band from 30% of the screen height down (mirrors the paper shader) */
export const KEEP = 0.65; /* the share of grains that travel all the way to the dunes (seed < KEEP); the rest is dust that thins out on the way */

export type Disc = { cx: number; cy: number; r: number };

/* the same integer hash as the shaders (GLSL uint maths), so JS and GPU agree */
export function hash(x: number, y: number) {
  const ux = (x + 65536) >>> 0;
  const uy = (y + 65536) >>> 0;
  let h = (Math.imul(ux, 374761393) + Math.imul(uy, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/* slow value noise on a 110px grid (mirrored in GLSL): where the skin tears a little earlier */
export function vnoise(x: number, y: number) {
  const gx = x / 110, gy = y / 110;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = gx - ix, fy = gy - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* how much ink the disc has at (x, y), before grain (mirrors the paper shader) */
export function ink(d: Disc, H: number, x: number, y: number) {
  const fade = Math.pow(smooth(d.cy - 0.45 * d.r, d.cy + d.r, y), 1.3);
  const feather = 0.035 * H;
  const inside = 1 - smooth(d.r - feather, d.r + feather * 0.6, Math.hypot(x - d.cx, y - d.cy));
  return fade * inside;
}

/* a seeded random, so the sand is the same on every visit */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
}

/* ---- the dunes, mirrored from DUNE_GLSL in dune-glsl.ts (keep them in sync) ---- */
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
export function crest(i: number, x: number) {
  if (i === 0) return 0.575 - 0.012 * Math.sin(x * 9 + 1) - 0.075 * bump(x, 0.33, 0.075) - 0.02 * bump(x, 0.55, 0.12);
  if (i === 1) return 0.6 - 0.018 * Math.sin(x * 7 + 2.2) - 0.03 * bump(x, 0.14, 0.12) - 0.02 * bump(x, 0.7, 0.14);
  if (i === 2) return 0.655 - 0.03 * bump(x, 0.05, 0.16) - 0.02 * Math.sin(x * 5 + 0.4) - 0.025 * bump(x, 0.62, 0.18);
  if (i === 3) return 0.84 - 0.29 * smooth(0.25, 1.05, x) + 0.02 * Math.sin(x * 6);
  return 0.9 - 0.13 * bump(x, 0, 0.32) + 0.04 * smooth(0.4, 1, x);
}
const BASE = [0.24, 0.33, 0.43, 0.56, 0.66];
const SPANS = [0.035, 0.05, 0.08, 0.2, 0.12];
/* which range shows at screen point (x, y), and how much ink it has there (finished dunes) */
function duneAt(x: number, y: number, W: number, H: number) {
  const span = Math.max(W, 1.6 * H);
  const X = (x - 0.5 * W) / span + 0.5;
  const Y = (y / H - DUNE_TOP) / (1 - DUNE_TOP);
  for (let i = 4; i >= 0; i--) {
    const d = Y - crest(i, X);
    if (d <= 0) continue;
    const slope = ((crest(i, X + 0.004) - crest(i, X - 0.004)) / 0.008) * ((H * (1 - DUNE_TOP)) / span);
    const turned = smooth(-0.12, 0.35, -slope);
    const c = BASE[i] * (0.8 + 0.4 * turned) * (0.42 + 0.83 * smooth(0, SPANS[i], d));
    return { range: i, ink: c };
  }
  return null;
}

/* where the falling sand comes to rest: n spots on the finished dunes, more where they are darker */
export function landingSpots(n: number, W: number, H: number, rand: () => number) {
  const xs = new Float32Array(n), ys = new Float32Array(n), depth = new Float32Array(n);
  const top = H * (DUNE_TOP + (1 - DUNE_TOP) * 0.48); /* above the highest crest */
  let k = 0;
  for (let tries = 0; k < n && tries < n * 40; tries++) {
    const x = rand() * W, y = top + rand() * (H - top);
    const at = duneAt(x, y, W, H);
    if (!at || rand() > at.ink * 1.3) continue;
    xs[k] = x;
    ys[k] = y;
    depth[k] = at.range / 4;
    k++;
  }
  return { xs, ys, depth, count: k };
}
