/* The sand flow: the ball's sand carried by the wind, from the ball into the desert.

   Every grain follows ONE shared wind field, so grains that start together stay together and
   the sand travels as streams and ribbons, the way real blown sand does:
   - the wind = a steady breeze to the right, sinking towards the ground later on, plus large slow
     eddies (the curl of a noise field: it swirls without clumping or thinning the sand), and near
     the ground it flattens out and skims along;
   - a grain's flight = its start point in the ball, integrated step by step through that wind up
     to the current progress P. The path depends only on P, so it reverses on scroll up;
   - landing: before anything moves, each grain's natural flight is integrated once here to see
     where the wind takes it; it then gets the dune spot nearest to that (order-preserving), and
     a small, smooth correction steers it there over the last part of the flight;
   - the wind breathes with a slow real clock, so sand in the air never freezes when the scroll
     stops (the ball and the finished desert stay still).

   The same field is mirrored exactly in JS (for the endpoints) and in GLSL (for the drawing). */

import { DUNE_GLSL } from "./dune-glsl";
import { crest, hash, ink, KEEP, landingSpots, rng, vnoise, type Disc } from "./sand";

/* ---------- the timeline, in progress P (0 … 1 over the whole journey) ---------- */

export const PEEL_START = 0.03; /* the wind catches the top of the ball… */
export const PEEL_SPAN = 0.26; /* …and the front has reached its lower rim by about 0.29 */
export const PEEL_RAMP = 0.1; /* each spot thins out over this much progress as its grains leave (no edge) */
export const LAND_FIRST = 0.64; /* the first grains reach the desert… */
export const LAND_SPAN = 0.28; /* …and the last at about 0.92, so the dunes have filled in by about 0.98 */
export const STEPS = 28; /* integration steps per flight (GPU and JS alike) */
export const STRIDE = 12; /* start xy, tS tl, correction xy, target xy, seed size depth kind */

/* the wind's character, in screen heights per unit of P. One big slow clockwise roll carries
   the sand: off the top of the ball to the right, down the right side, and back left low across
   the screen, where it drops out onto the dunes. Eddies ride on top of it. */
export const WIND = {
  EDDY: 1.3 /* how strongly the eddies swirl */,
  BREEZE: 0.5 /* the drift to the right that blows the sand off the ball (it eases in the descent) */,
  FAN: 1.6 /* how much the flow spreads out sideways in the descent (so it covers the width) */,
  FAN_C: 0.7 /* where the fan spreads from, as a share of the width */,
  SINK: 1.3 /* how fast the air sinks in the descent */,
  SINK_AT: [0.2, 0.5] /* the descent starts and reaches full strength over this part of the journey */,
  LIFT: [1.0, 0.8] /* the gust that lifts a grain off the ball: right, up */,
  GUST: 5 /* how quickly that gust dies down (higher = shorter) */,
  SCALE: [2.2, 1.1] /* the sizes of the big and the small eddies, in screen heights */,
  HOME: [0.35, 0.92] /* over this part of its flight a grain gradually settles towards its spot */,
  CALM: 0.3 /* how much the breeze eases in the descent (1 = dies completely) */,
};

/* when a spot of the ball starts to let go: the top first (the palest, so the first streams are
   thin), the windward left a little before the right, along a soft front that follows the ball's
   curve; two octaves of noise so the front frays finely instead of in blocks. Its grains then
   leave over PEEL_RAMP, and the ink thins out at the same pace. Mirrored in PAPER_FS. */
export function releaseAt(d: Disc, H: number, x: number, y: number) {
  const top = Math.max(0, d.cy - 0.45 * d.r), bottom = d.cy + d.r;
  const dx = (x - d.cx) / d.r;
  const u = (y - top) / (bottom - top) + 0.12 * dx - 0.1 * dx * dx;
  const n = 0.65 * vnoise(x, y) + 0.35 * vnoise(2.7 * x + 17, 2.7 * y + 17);
  return PEEL_START + PEEL_SPAN * Math.min(1, Math.max(0, u)) + 0.06 * (n - 0.5);
}

/* the dunes' arrival moment at a screen point (mirrors arrive() in DUNE_GLSL) in the dunes' own
   units (0.36 … 0.95), and that moment as progress P */
function arrNoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + 4000, iy + 4000), b = hash(ix + 4001, iy + 4000), c = hash(ix + 4000, iy + 4001), e = hash(ix + 4001, iy + 4001);
  return (a + (b - a) * ux) * (1 - uy) + (c + (e - c) * ux) * uy;
}
const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function arrive(x: number, y: number, W: number, H: number) {
  const span = Math.max(W, 1.6 * H);
  const X = (x - 0.5 * W) / span + 0.5;
  const Y = (y / H - 0.3) / 0.7;
  let t = 0.92;
  for (let i = 0; i < 5; i++) {
    const dd = Y - crest(i, X);
    const ti = 0.42 + 0.26 * (1 - i / 4) + 0.24 * (1 - sm(0, 0.18, Math.max(dd, 0)));
    t += (ti - t) * sm(-0.06, 0.06, dd);
  }
  return Math.min(0.95, Math.max(0.36, t + 0.06 * (arrNoise(x / 90, y / 90) - 0.5)));
}
export const landP = (a: number) => LAND_FIRST + (LAND_SPAN * (a - 0.36)) / 0.59;
/* and back: the dunes' fill for a progress P */
export const duneFill = (P: number) => 0.36 + ((P - LAND_FIRST) * 0.59) / LAND_SPAN;

/* ---------- the wind field ---------- */

export const FIELD_N = 256;

/* a tileable curl-noise field: the curl of three octaves of smooth periodic noise, scaled so
   its typical speed is 1. Stored as RG (x, y velocity) */
export function buildField() {
  const N = FIELD_N;
  const psi = new Float32Array(N * N);
  const octave = (cells: number, amp: number, salt: number) => {
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i / N) * cells, y = (j / N) * cells;
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const q = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); /* quintic: smooth slopes */
        const ux = q(fx), uy = q(fy);
        const h = (a: number, b: number) => hash(((a % cells) + cells) % cells + salt, ((b % cells) + cells) % cells + salt);
        const v = (h(ix, iy) * (1 - ux) + h(ix + 1, iy) * ux) * (1 - uy) + (h(ix, iy + 1) * (1 - ux) + h(ix + 1, iy + 1) * ux) * uy;
        psi[j * N + i] += amp * v;
      }
  };
  octave(4, 1, 101);
  octave(8, 0.5, 202);
  octave(16, 0.22, 303);
  const out = new Float32Array(N * N * 2);
  let sum = 0;
  const at = (i: number, j: number) => psi[((j + N) % N) * N + ((i + N) % N)];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const vx = (at(i, j + 1) - at(i, j - 1)) / 2; /* curl: (dψ/dy, -dψ/dx) */
      const vy = -(at(i + 1, j) - at(i - 1, j)) / 2;
      out[(j * N + i) * 2] = vx;
      out[(j * N + i) * 2 + 1] = vy;
      sum += vx * vx + vy * vy;
    }
  const k = 1 / Math.sqrt(sum / (N * N));
  for (let i = 0; i < out.length; i++) out[i] *= k;
  return out;
}

/* bilinear, wrapping: exactly what the GPU's LINEAR + REPEAT sampling does */
function sample(f: Float32Array, u: number, v: number, o: [number, number]) {
  const N = FIELD_N;
  const x = u * N - 0.5, y = v * N - 0.5;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const i0 = ((ix % N) + N) % N, i1 = (i0 + 1) % N, j0 = ((iy % N) + N) % N, j1 = (j0 + 1) % N;
  for (let c = 0; c < 2; c++) {
    const a = f[(j0 * N + i0) * 2 + c], b = f[(j0 * N + i1) * 2 + c], d = f[(j1 * N + i0) * 2 + c], e = f[(j1 * N + i1) * 2 + c];
    o[c] = (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
  }
}

/* the wind at u (screen heights, y down) at progress Pk, for a grain f of the way into its flight;
   A = the screen's width / height, bx = the ball's centre x in screen heights */
const s1: [number, number] = [0, 0], s2: [number, number] = [0, 0];
function wind(f: Float32Array, ux: number, uy: number, Pk: number, ff: number, bx: number, A: number, o: [number, number]) {
  sample(f, ux / WIND.SCALE[0] + Pk * 0.11, uy / WIND.SCALE[0] - Pk * 0.05, s1);
  sample(f, ux / WIND.SCALE[1] - Pk * 0.07 + 0.37, uy / WIND.SCALE[1] + Pk * 0.09 + 0.37, s2);
  const gust = Math.exp(-WIND.GUST * ff);
  const descent = sm(WIND.SINK_AT[0], WIND.SINK_AT[1], Pk);
  /* the breeze blows the sand off the ball to the right; in the descent it eases and the flow fans out */
  let vx = WIND.EDDY * (s1[0] + 0.45 * s2[0]) + WIND.BREEZE * (1 - WIND.CALM * descent) + WIND.FAN * descent * (ux - bx) + WIND.LIFT[0] * gust;
  let vy = WIND.EDDY * (s1[1] + 0.45 * s2[1]) + WIND.SINK * descent - WIND.LIFT[1] * gust;
  /* the frame: near the sides the air turns down instead of leaving the screen */
  const wall = vx > 0 ? sm(A - 0.18, A + 0.02, ux) : sm(0.18, -0.02, ux);
  vy += Math.abs(vx) * wall * 0.6;
  vx *= 1 - wall;
  if (vy > 0) vy *= 1 - sm(0.86, 1.0, uy); /* the ground: the air flattens out and skims */
  o[0] = vx;
  o[1] = vy;
}

/* where a grain is after flying q (0 … 1) of the way from tS to tl. With a target (tx, ty) it
   settles towards it over the last part of the flight (HOME), arriving there at the end */
const wv: [number, number] = [0, 0];
export function fly(f: Float32Array, x: number, y: number, W: number, H: number, tS: number, tl: number, q: number, tx = NaN, ty = NaN): [number, number] {
  let ux = x / H, uy = y / H;
  const bx = (WIND.FAN_C * W) / H, A = W / H;
  const home = !Number.isNaN(tx);
  const dt = (q * (tl - tS)) / STEPS;
  for (let k = 0; k < STEPS; k++) {
    const Pk = tS + (k + 0.5) * dt;
    const ff = (Pk - tS) / (tl - tS);
    wind(f, ux, uy, Pk, ff, bx, A, wv);
    if (home) {
      const h = sm(WIND.HOME[0], WIND.HOME[1], ff);
      const left = Math.max(tl - Pk, 0.03 * (tl - tS));
      wv[0] += h * ((tx / H - ux) / left - wv[0]);
      wv[1] += h * ((ty / H - uy) / left - wv[1]);
    }
    ux += wv[0] * dt;
    uy += wv[1] * dt;
  }
  return [ux * H, uy * H];
}

/* the same wind, in GLSL */
const windGlsl = () => `
uniform sampler2D field;
uniform float ballX;   /* where the fan spreads from, in screen heights */
uniform float aspect;  /* the screen's width / height */
vec2 wind(vec2 u, float Pk, float ff) {
  vec2 e = texture(field, u / ${WIND.SCALE[0].toFixed(3)} + Pk * vec2(0.11, -0.05)).xy
         + 0.45 * texture(field, u / ${WIND.SCALE[1].toFixed(3)} + Pk * vec2(-0.07, 0.09) + 0.37).xy;
  float gust = exp(-${WIND.GUST.toFixed(3)} * ff);
  float descent = smoothstep(${WIND.SINK_AT[0].toFixed(3)}, ${WIND.SINK_AT[1].toFixed(3)}, Pk);
  vec2 v = ${WIND.EDDY.toFixed(3)} * e;
  v.x += ${WIND.BREEZE.toFixed(3)} * (1.0 - ${WIND.CALM.toFixed(3)} * descent) + ${WIND.FAN.toFixed(3)} * descent * (u.x - ballX) + ${WIND.LIFT[0].toFixed(3)} * gust;
  v.y += ${WIND.SINK.toFixed(3)} * descent - ${WIND.LIFT[1].toFixed(3)} * gust;
  float wall = v.x > 0.0 ? smoothstep(aspect - 0.18, aspect + 0.02, u.x) : smoothstep(0.18, -0.02, u.x);
  v.y += abs(v.x) * wall * 0.6;
  v.x *= 1.0 - wall;
  if (v.y > 0.0) v.y *= 1.0 - smoothstep(0.86, 1.0, u.y);
  return v;
}`;

/* ---------- the grains ---------- */

export function buildFlow(d: Disc, W: number, H: number, count: number, field: Float32Array, debug = false) {
  const rand = rng(7);
  const x0 = Math.max(0, d.cx - d.r), x1 = Math.min(W, d.cx + d.r);
  const y0 = Math.max(0, d.cy - d.r), y1 = Math.min(H, d.cy + d.r * 1.04);

  /* the grains, sampled from the ball's ink */
  type G = { x: number; y: number; tS: number; tl: number; seed: number; ex: number; ey: number; nx: number; ny: number; tx: number; ty: number; depth: number };
  const gs: G[] = [];
  for (let tries = 0; gs.length < count && tries < count * 60; tries++) {
    const x = x0 + rand() * (x1 - x0);
    const y = y0 + rand() * (y1 - y0);
    if (rand() > ink(d, H, x, y)) continue;
    const tS = Math.max(0.005, releaseAt(d, H, x, y) + PEEL_RAMP * rand());
    gs.push({ x, y, tS, tl: 0, seed: rand(), ex: 0, ey: 0, nx: 0, ny: 0, tx: 0, ty: 0, depth: 1 });
  }

  /* dust (most of the pale ink) is blown off and thins out on the way; the rest travels */
  const travel: number[] = [];
  gs.forEach((g, i) => {
    if (g.seed < KEEP) travel.push(i);
    else {
      g.tl = g.tS + 0.22 + 0.16 * rand();
      [g.ex, g.ey] = fly(field, g.x, g.y, W, H, g.tS, g.tl, 1);
      g.tx = g.ex;
      g.ty = g.ey;
    }
  });

  /* where the wind would take each traveller by a nominal landing time… */
  for (const i of travel) {
    const g = gs[i];
    g.tl = Math.max(g.tS + 0.32, 0.78);
    [g.ex, g.ey] = fly(field, g.x, g.y, W, H, g.tS, g.tl, 1);
  }
  /* …matched to the dune spots, keeping the order: left stays left, and within each slice of
     neighbours, high stays high */
  const spots = landingSpots(travel.length, W, H, rand);
  const byEx = travel.slice().sort((a, b) => gs[a].ex - gs[b].ex);
  const sIdx = Array.from({ length: spots.count }, (_, i) => i).sort((a, b) => spots.xs[a] - spots.xs[b]);
  const CHUNK = 160;
  for (let a = 0; a < Math.min(byEx.length, sIdx.length); a += CHUNK) {
    const g = byEx.slice(a, a + CHUNK).sort((p, q) => gs[p].ey - gs[q].ey);
    const t = sIdx.slice(a, a + CHUNK).sort((p, q) => spots.ys[p] - spots.ys[q]);
    g.forEach((gi, k) => {
      const si = t[Math.min(k, t.length - 1)];
      const G = gs[gi];
      G.tx = spots.xs[si];
      G.ty = spots.ys[si];
      G.depth = spots.depth[si];
      /* it lands when the dune is due there (but always after a decent flight) */
      G.tl = Math.max(G.tS + 0.3, landP(arrive(G.tx, G.ty, W, H)));
      if (debug) [G.nx, G.ny] = fly(field, G.x, G.y, W, H, G.tS, G.tl, 1); /* where the wind alone would take it */
      /* where the homing flight really ends (a few px off, from the integration): corrected in the shader */
      [G.ex, G.ey] = fly(field, G.x, G.y, W, H, G.tS, G.tl, 1, G.tx, G.ty);
    });
  }

  /* how far the landings had to be corrected, in screen heights (for tuning, in the lab) */
  const wisps = buildWisps(W, H, Math.round(WISPS * Math.min(1, Math.max(0.25, (W * H) / (1440 * 900)))), rand);
  if (!debug) return { data: pack(), count: gs.length + wisps.length / STRIDE, stats: null };
  const corr = travel.map((i) => Math.hypot(gs[i].tx - gs[i].nx, gs[i].ty - gs[i].ny) / H).sort((a, b) => a - b);
  const resid = Math.max(...travel.map((i) => Math.hypot(gs[i].tx - gs[i].ex, gs[i].ty - gs[i].ey)));
  const pct = (q: number) => corr[Math.floor(q * (corr.length - 1))]?.toFixed(3);
  const qs = (v: number[], s: number) => { const a = v.slice().sort((p, q) => p - q); return [0.05, 0.5, 0.95].map((x) => (a[Math.floor(x * (a.length - 1))] / s).toFixed(2)).join("/"); };
  /* how far grains travel backwards (against the wind, to the left) because of homing */
  const back = travel.map((i) => Math.max(0, gs[i].nx - gs[i].tx) / W).sort((a, b) => a - b);
  const stats = {
    homingMedian: pct(0.5), homingP90: pct(0.9), residualPx: resid.toFixed(2),
    windEndX: qs(travel.map((i) => gs[i].nx), W), targetX: qs(travel.map((i) => gs[i].tx), W),
    windEndY: qs(travel.map((i) => gs[i].ny), H), targetY: qs(travel.map((i) => gs[i].ty), H),
    backP90: back[Math.floor(0.9 * (back.length - 1))]?.toFixed(3),
  };

  return { data: pack(), count: gs.length + wisps.length / STRIDE, stats };

  function pack() {
    const out = new Float32Array(gs.length * STRIDE + wisps.length);
    out.set(wisps, gs.length * STRIDE);
    gs.forEach((g, i) => {
      const kind = g.seed < KEEP ? 0 : 1;
      const size = kind ? 0.8 + 0.6 * hash(i, 77) : 0.9 + 0.7 * hash(i, 78);
      out.set([g.x, g.y, g.tS, g.tl, g.tx - g.ex, g.ty - g.ey, g.tx, g.ty, g.seed, size, g.depth, kind], i * STRIDE);
    });
    return out;
  }
}

/* ---------- the wisps: sand blowing off the crests once the desert has formed ---------- */

const WISPS = 6000; /* on a 1440×900 screen */
/* the plumes: which range, and where along it (share of the dunes' width), how strong */
const PLUMES: [number, number, number][] = [
  [3, 0.5, 0.6], [3, 0.58, 0.85], [3, 0.66, 1], [3, 0.74, 0.9], [3, 0.82, 1], [3, 0.9, 0.8], [3, 0.97, 0.7],
  [0, 0.3, 0.55], [0, 0.335, 0.7], [0, 0.37, 0.5],
];

/* each wisp grain sits on a crest, belongs to a plume, and loops on the clock with its own phase:
   start xy, phase speed, -, -, plume id, -, seed size depth kind=2 */
function buildWisps(W: number, H: number, n: number, rand: () => number) {
  const span = Math.max(W, 1.6 * H);
  const out = new Float32Array(n * STRIDE);
  const weight = PLUMES.reduce((a, p) => a + p[2], 0);
  for (let i = 0; i < n; i++) {
    let w = rand() * weight, k = 0;
    while (k < PLUMES.length - 1 && (w -= PLUMES[k][2]) > 0) k++;
    const [range, at] = PLUMES[k];
    const X = at + (rand() - 0.5) * (range === 0 ? 0.025 : 0.05);
    const x = (X - 0.5) * span + 0.5 * W;
    const y = H * (0.3 + 0.7 * crest(range, X)) + 1.5;
    const depth = range / 4;
    out.set([x, y, rand(), 0.05 + 0.04 * rand(), 0, 0, k + 0.5, 0, rand(), 0.7 + 0.5 * rand(), depth, 2], i * STRIDE);
  }
  return out;
}

/* ---------- shaders ---------- */

export const QUAD = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

/* each grain: rests in the ball until the wind reaches it, then flies (easing in from rest,
   easing out as it lands) through the wind, breathing with the clock while in the air */
export const grainV = () => `#version 300 es
in vec2 aS;      /* where it starts, in the ball */
in vec2 aT;      /* lets go at, lands at (progress) */
in vec2 aC;      /* the landing correction */
in vec2 aL;      /* where it lands */
in vec4 aK;      /* seed, size, depth (0 far … 1 near), kind (0 travels, 1 dust) */
uniform vec2 res;      /* the screen, CSS px */
uniform float P;       /* progress */
uniform float clock;   /* seconds */
uniform float ground;  /* how far below its final place the ground is right now, px (it rises with the page) */
uniform float dpr;
out float vA;
out float vTone;
out float vPx;
out vec2 vDir;
out float vStretch;
${windGlsl()}

void main() {
  gl_PointSize = 0.0;
  gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
  vA = 0.0;
  float tS = aT.x, tl = aT.y;
  float seed = aK.x, size = aK.y, depth = aK.z, dust = aK.w;

  if (dust > 1.5) {
    /* a wisp: lifts off its crest, blows to the right and a little up, curls in the wind and
       fades; its plume comes and goes in slow gusts. Only once the desert has formed, and never
       with a still clock (reduced motion). */
    float on = smoothstep(0.95, 0.99, P) * step(0.001, clock);
    if (on <= 0.0) return;
    float life = fract(clock * aT.y + aT.x);
    float near = mix(0.4, 1.0, depth);
    float len = res.y * 0.2 * near * (0.6 + 0.8 * fract(seed * 7.3));
    /* it spreads as it goes: each grain drifts its own little way up or down */
    float fan = (fract(seed * 13.1) - 0.5) * len * 0.35 * life;
    vec2 p = aS + vec2(len * life, -len * (0.32 * life - 0.18 * life * life) + fan);
    vec2 sw = texture(field, aS / res.y * 0.9 + vec2(clock * 0.015 - life * 0.2, life * 0.25)).xy;
    p += sw * 14.0 * near * life;
    float gust = smoothstep(0.25, 0.75, texture(field, vec2(aL.x * 0.137, clock * 0.006)).x * 0.5 + 0.5);
    /* invisible on the crest itself (no line), appearing as it lifts and spreads, gone as it thins */
    vA = on * gust * (0.3 + 0.4 * near) * smoothstep(0.12, 0.42, life) * (1.0 - smoothstep(0.5, 1.0, life));
    vTone = fract(seed * 91.0);
    vStretch = 0.5 * (1.0 - life);
    vDir = normalize(vec2(1.0, -0.3));
    vec2 sc = p / res * 2.0 - 1.0;
    gl_Position = vec4(sc.x, -sc.y, 0.0, 1.0);
    vPx = max(1.0, size * near * dpr);
    gl_PointSize = (vPx + 1.0) * (1.0 + vStretch);
    return;
  }

  if (P <= tS) return;
  if (dust > 0.5 && P >= tl) return;
  float H = res.y;

  float k = clamp((P - tS) / (tl - tS), 0.0, 1.0);
  /* the wind takes it at once (so the peel streams off), and it settles gently at the end */
  float q = k + (k * k * (3.0 - 2.0 * k) - k) * smoothstep(0.4, 1.0, k);
  vec2 u = aS / H;
  float dt = q * (tl - tS) / ${STEPS}.0;
  vec2 v = vec2(0.0);
  for (int i = 0; i < ${STEPS}; i++) {
    float Pk = tS + (float(i) + 0.5) * dt;
    float ff = (Pk - tS) / (tl - tS);
    v = wind(u, Pk, ff);
    if (dust < 0.5) {   /* settling towards its spot (mirrors fly) */
      float h = smoothstep(${WIND.HOME[0].toFixed(3)}, ${WIND.HOME[1].toFixed(3)}, ff);
      float left = max(tl - Pk, 0.03 * (tl - tS));
      v += h * (((aL + vec2(0.0, ground)) / H - u) / left - v);
    }
    u += v * dt;
  }
  vec2 p = u * H;

  p += aC * smoothstep(0.5, 1.0, k);   /* the last few pixels of numerical difference */
  if (dust < 0.5) p = mix(p, aL + vec2(0.0, ground), smoothstep(0.96, 1.0, k));

  /* the air breathes: a slow swirl on the clock, only while in flight */
  float air = sin(3.14159 * k);
  vec2 sw = texture(field, u * 1.3 + vec2(clock * 0.012, clock * 0.009)).xy;
  p += sw * 9.0 * air;

  /* how it looks */
  float base = 0.4 + 0.45 * fract(seed * 37.0);
  /* fresh off the ball a grain still carries the ball's weight: larger and darker, thinning out as
     it spreads (so the ball turns into sand instead of evaporating) */
  float fresh = 1.0 - smoothstep(0.0, 0.22, k);
  vA = mix(base, 1.0, fresh) * smoothstep(0.0, 0.015, k);
  size *= 1.0 + 0.4 * fresh;
  if (dust > 0.5) vA *= 0.8 * (1.0 - smoothstep(0.25, 1.0, k));
  else {
    vA *= 1.0 - 0.3 * air;                                       /* airier in flight */
    vA *= mix(1.0, mix(0.6, 1.0, depth), q);                      /* paler towards far ranges */
    size *= mix(1.0, mix(0.6, 1.0, depth), q);
    vA *= 1.0 - smoothstep(tl + 0.004, tl + 0.04, P);             /* becomes part of the dune */
  }
  vTone = fract(seed * 91.0);
  vec2 vel = v * 6.0 * k * (1.0 - k);
  vStretch = clamp(length(vel) * 0.45, 0.0, 1.6) * (1.0 - step(1.0, k));
  vDir = length(vel) > 1e-4 ? normalize(vel) : vec2(1.0, 0.0);

  vec2 sc = p / res * 2.0 - 1.0;
  gl_Position = vec4(sc.x, -sc.y, 0.0, 1.0);
  vPx = max(1.0, size * dpr);
  gl_PointSize = (vPx + 1.0) * (1.0 + vStretch);
}`;

/* a tiny dot of sand, crisp, in a light moss; a fast one stretches a little along its way */
export const GRAIN_F = `#version 300 es
precision mediump float;
in float vA;
in float vTone;
in float vPx;
in vec2 vDir;
in float vStretch;
out vec4 o;
const vec3 LIGHT = vec3(104.0, 132.0, 88.0) / 255.0;
const vec3 GREEN = vec3(74.0, 104.0, 62.0) / 255.0;
void main() {
  vec2 q = (gl_PointCoord * 2.0 - 1.0) * 0.5 * (vPx + 1.0) * (1.0 + vStretch);   /* device px from the centre */
  float along = dot(q, vDir) / (1.0 + vStretch);
  float across = dot(q, vec2(-vDir.y, vDir.x));
  float r = length(vec2(along, across));
  float a = vA * (1.0 - smoothstep(vPx * 0.5 - 0.5, vPx * 0.5 + 0.5, r));
  if (a <= 0.0) discard;
  o = vec4(mix(GREEN, LIGHT, vTone) * a, a);
}`;

/* the paper: the ball (peeled from the top as the wind takes its sand) and the dunes */
export const PAPER_FS = `#version 300 es
precision highp float;
uniform vec2 res;
uniform float dpr;
uniform vec3 disc;
uniform float P;
uniform float fill;    /* the dunes' fill, in their own units */
uniform float ground;  /* how far below its final place the ground is right now, px */
uniform vec2 canvasPx;
out vec4 o;
${DUNE_GLSL}
float vnoise(vec2 p) {
  vec2 g = p / 110.0, i = floor(g), f = g - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, canvasPx.y - gl_FragCoord.y) / dpr;
  float H = res.y;
  vec2 c = disc.xy;
  float r = disc.z;
  float feather = 0.035 * H;
  float fade = pow(smoothstep(c.y - 0.45 * r, c.y + r, px.y), 1.3);
  float dist = length(px - c);
  float inside = 1.0 - smoothstep(r - feather, r + feather * 0.6, dist);
  float rim = 0.7 * smoothstep(r - 0.3 * H, r - feather * 0.5, dist) * inside;
  float cover = fade * inside;
  vec3 ink = mix(GREEN, DEEP, rim * fade);

  /* peeled from the top (mirrors releaseAt): as the wind takes a spot's grains the ink there thins
     out at the same pace, crumbling in the ball's own 1-2px grain, so there is never an edge */
  float top = max(0.0, c.y - 0.45 * r), bottom = c.y + r;
  float dx = (px.x - c.x) / r;
  float uu = (px.y - top) / (bottom - top) + 0.12 * dx - 0.1 * dx * dx;
  float nn = 0.65 * vnoise(px) + 0.35 * vnoise(2.7 * px + 17.0);
  float t0 = ${PEEL_START.toFixed(3)} + ${PEEL_SPAN.toFixed(3)} * clamp(uu, 0.0, 1.0) + 0.06 * (nn - 0.5);
  float gone = clamp((P - t0) / ${PEEL_RAMP.toFixed(3)}, 0.0, 1.0);
  float crumb = hash(floor(px / 1.5) + vec2(31.0, 7.0));
  cover *= (1.0 - gone) * mix(1.0, step(gone, crumb), 0.6);

  /* the dunes, forming where the sand has arrived */
  if (fill > 0.3) {
    vec2 du = dunes(px - vec2(0.0, ground), res, fill, 0.3);
    ink = mix(ink, mix(GREEN, DEEP, smoothstep(0.35, 0.85, du.x)), du.y);
    cover = mix(cover, du.x, du.y);
  }
  o = vec4(paperGrain(px, cover, ink), 1.0);
}`;

/* ---------- a small renderer: paper canvas behind, sand canvas in front ---------- */

export function discAt(W: number, H: number): Disc {
  const r = Math.min(0.46 * W, 0.9 * H);
  return { cx: 0.42 * W, cy: 0.68 * H - r, r };
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    gl.attachShader(prog, s);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));
  return prog;
}

export function createFlow(paperCanvas: HTMLCanvasElement, sandCanvas: HTMLCanvasElement, grains: number, debug = false) {
  const pg = paperCanvas.getContext("webgl2", { antialias: false });
  const gl = sandCanvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true });
  if (!pg || !gl) return null;

  const paper = program(pg, QUAD, PAPER_FS);
  const pvao = pg.createVertexArray();
  pg.bindVertexArray(pvao);
  pg.bindBuffer(pg.ARRAY_BUFFER, pg.createBuffer());
  pg.bufferData(pg.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), pg.STATIC_DRAW);
  pg.enableVertexAttribArray(pg.getAttribLocation(paper, "p"));
  pg.vertexAttribPointer(pg.getAttribLocation(paper, "p"), 2, pg.FLOAT, false, 0, 0);
  const pu = (n: string) => pg.getUniformLocation(paper, n);

  const grain = program(gl, grainV(), GRAIN_F);
  const gvao = gl.createVertexArray();
  gl.bindVertexArray(gvao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  let off = 0;
  for (const [name, size] of [["aS", 2], ["aT", 2], ["aC", 2], ["aL", 2], ["aK", 4]] as const) {
    const loc = gl.getAttribLocation(grain, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
    off += size;
  }
  gl.bindVertexArray(null);
  const gu = (n: string) => gl.getUniformLocation(grain, n);

  /* the wind field, as a texture */
  const field = buildField();
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, FIELD_N, FIELD_N, 0, gl.RG, gl.FLOAT, field);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  let W = 1, H = 1, dpr = 1, count = 0;
  let disc = discAt(1, 1);

  const worker = new Worker(new URL("./flow.worker.ts", import.meta.url), { type: "module" });
  let job = 0;
  let onReady = () => {};
  worker.onmessage = (e: MessageEvent<{ id: number; data: Float32Array; count: number; stats: unknown; ms: number }>) => {
    if (e.data.id !== job) return; /* a newer resize is on its way */
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, e.data.data, gl.STATIC_DRAW);
    count = e.data.count;
    if (debug) console.info("flow", JSON.stringify({ grains: count, buildMs: e.data.ms, correction: e.data.stats }));
    onReady();
  };

  return {
    resize(w: number, h: number, ratio: number) {
      W = w;
      H = h;
      dpr = ratio;
      for (const c of [paperCanvas, sandCanvas]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      disc = discAt(W, H);
      /* the grains are computed in a worker; until they arrive (or after a resize) no sand is drawn */
      const n = Math.round(grains * Math.min(1, Math.max(0.2, (W * H) / (1440 * 900))));
      count = 0;
      worker.postMessage({ id: ++job, W, H, n, debug });
    },
    /* called when the grains have arrived from the worker */
    set onReady(f: () => void) {
      onReady = f;
    },
    get ready() {
      return count > 0;
    },
    dispose() {
      worker.terminate();
    },
    /* drift: the ball's drift towards the cursor (only before it lets go) */
    render(P: number, clock: number, drift = { x: 0, y: 0 }, ground = 0) {
      pg.viewport(0, 0, paperCanvas.width, paperCanvas.height);
      pg.useProgram(paper);
      pg.uniform2f(pu("res"), W, H);
      pg.uniform1f(pu("dpr"), dpr);
      pg.uniform3f(pu("disc"), disc.cx + drift.x, disc.cy + drift.y, disc.r);
      pg.uniform1f(pu("P"), P);
      pg.uniform1f(pu("fill"), duneFill(P));
      pg.uniform1f(pu("ground"), ground);
      pg.uniform2f(pu("canvasPx"), paperCanvas.width, paperCanvas.height);
      pg.bindVertexArray(pvao);
      pg.drawArrays(pg.TRIANGLES, 0, 3);

      gl.viewport(0, 0, sandCanvas.width, sandCanvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (P <= 0 || !count) return;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(grain);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gu("field"), 0);
      gl.uniform2f(gu("res"), W, H);
      gl.uniform1f(gu("P"), P);
      gl.uniform1f(gu("clock"), clock);
      gl.uniform1f(gu("ground"), ground);
      gl.uniform1f(gu("dpr"), dpr);
      gl.uniform1f(gu("ballX"), (WIND.FAN_C * W) / H);
      gl.uniform1f(gu("aspect"), W / H);
      gl.bindVertexArray(gvao);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disable(gl.BLEND);
    },
  };
}
