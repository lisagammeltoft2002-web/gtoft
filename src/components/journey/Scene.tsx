"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { setJourney, useJourney } from "@/lib/journey";
import { caseStudies } from "@/content/site";

/* ==================================================================
   One place, filmed with one camera. A wildflower meadow on a cliff top;
   across the bay a chalk headland with fields, hedgerows and a tower.
   Five old prints lie in the grass, one per case study.
     open    — far back, everything at once
     hero    — a few steps closer, the prints in the grass
     work    — down over the prints; each rises toward you in turn
     map     — the camera cranes up into the sky; one bird, far off,
               flies its route while the journey is written in the sky
     bring   — it follows the bird out over the sea as the day turns gold
     valley  — back down by the prints at sunset (contact)
   Everything is lit by one sun and one sky, seen through one atmosphere,
   rendered to HDR and finished like a photograph (lens blur, tone curve).
   ================================================================== */

type V3 = [number, number, number];
type Pose = { pos: V3; look: V3; fov: number; sx: number; sy: number; fd: number; ap: number };

/* ---------------- light: day and golden hour ---------------- */
const C = (h: string) => new THREE.Color(h);
const DAY = {
  zenith: C("#4b7cc6"),
  horizon: C("#dfe4ea"),
  ground: C("#56633a"),
  sun: C("#fff1de"),
  sunI: 3.4,
  amb: 0.95,
  sea: C("#1d5288"),
  exposure: 0.95,
};
const DUSK = {
  zenith: C("#3f5c9e"),
  horizon: C("#f4c07a"),
  ground: C("#4a3f2c"),
  sun: C("#ffa45c"),
  sunI: 2.6,
  amb: 0.78,
  sea: C("#26375f"),
  exposure: 1.1,
};
const SUN_DAY = new THREE.Vector3(0.48, 0.6, 0.64).normalize();
const SUN_DUSK = new THREE.Vector3(0.3, 0.055, -1).normalize();

const MEADOW = {
  a: C("#4f6a2c"),
  b: C("#6c7a37"),
  straw: C("#a9965a"),
  olive: C("#45552a"),
  pink: C("#a8746e"),
  rock: C("#cdbfa3"),
  rockDark: C("#958a76"),
};

/* ---------------- the prints in the grass ---------------- */
const PW = 0.36;
const PH = 0.27;
const LIFT = 0.28; // how far the print in focus rises from the grass
const SHEETS: { x: number; z: number; r: number }[] = [
  { x: -0.5, z: 0.1, r: 0.2 },
  { x: 0.08, z: -0.26, r: -0.1 },
  { x: 0.62, z: 0.08, r: 0.12 },
];
/** is (x,z) under a print (plus a margin)? */
const underSheet = (x: number, z: number, m = 0.03) =>
  SHEETS.some((s) => {
    const dx = x - s.x;
    const dz = z - s.z;
    const c = Math.cos(s.r);
    const sn = Math.sin(s.r);
    const u = dx * c - dz * sn;
    const v = dx * sn + dz * c;
    return Math.abs(u) < PW / 2 + m && Math.abs(v) < PH / 2 + m;
  });
const inPatch = (x: number, z: number, s = 1) => (x - 0.07) ** 2 / (1.25 * s) ** 2 + (z - 0.08) ** 2 / (0.95 * s) ** 2 < 1;

/* ---------------- land ---------------- */
const SEA_Y = -26;
const CLOUD_H = 1100;
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * 0.5 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.3 + vnoise(x * 4.3 + 11.7, y * 4.3 + 7.1) * 0.2;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const edgeZ = (x: number) => -14 + 1.3 * Math.sin(x * 0.15) + 0.6 * Math.sin(x * 0.41 + 1) + Math.max(0, Math.abs(x) - 16) * 0.85;
function landH(x: number, z: number) {
  const roll = 0.45 * Math.sin(x * 0.21 + 0.6) * Math.cos(z * 0.17) + 0.3 * Math.sin(x * 0.07 - z * 0.11) + 0.12 * (fbm(x * 0.5, z * 0.5) - 0.5);
  const f = Math.min(1, Math.hypot(x, z * 1.2) / 3.2); // a level patch where the prints lie
  const u = Math.min(1, Math.max(0, (edgeZ(x) - z) / 4.5));
  const cliff = (-SEA_Y + 3) * (u * u * (3 - 2 * u));
  const crag = u > 0 && u < 1 ? (fbm(x * 0.8, z * 0.8) - 0.5) * 2.2 * Math.sin(u * Math.PI) : 0;
  return roll * f * f - 0.02 * Math.max(0, -z) - cliff + crag;
}
const poppyField = (x: number, z: number) => fbm(x * 0.2 + 100, z * 0.2 + 40);
const pinkField = (x: number, z: number) => fbm(x * 0.17 - 60, z * 0.17 + 9);
const laceField = (x: number, z: number) => fbm(x * 0.23 + 31, z * 0.23 - 77);
const yellowField = (x: number, z: number) => fbm(x * 0.21 - 13, z * 0.21 + 51);
function meadowColor(x: number, z: number, out: THREE.Color) {
  const n = fbm(x * 0.11, z * 0.11);
  const m = fbm(x * 0.32 + 20, z * 0.32 - 4);
  out.copy(MEADOW.a).lerp(MEADOW.b, smooth(0.3, 0.7, n));
  out.lerp(MEADOW.straw, smooth(0.5, 0.78, m) * 0.5);
  out.lerp(MEADOW.olive, smooth(0.55, 0.8, 1 - n) * 0.4);
  out.lerp(MEADOW.pink, smooth(0.62, 0.84, pinkField(x, z)) * 0.18);
  return out;
}

/* ---------------- the far shore ---------------- */
const coastR = (zz: number) => 300 - (zz - 220) * 0.38 + 25 * Math.sin(zz * 0.02) + 12 * Math.sin(zz * 0.07 + 1);
function farH(x: number, z: number) {
  const zz = -z;
  // coves and points along the cliff line, not one straight wall
  const d = x - coastR(zz) + 18 * (fbm(zz * 0.012, 3.1) - 0.5) + 7 * (fbm(zz * 0.05, 9.7) - 0.5);
  const cliffH = 17 + 7 * Math.sin(zz * 0.013) + 6 * fbm(zz * 0.03, 1.7);
  const roll = 10 * fbm(x * 0.006, z * 0.006) + 5 * Math.sin(x * 0.01 + z * 0.008);
  // a steep face that rounds over into the fields at the brow
  const face = smooth(-6, 4, d) * 0.82 + smooth(4, 26, d) * 0.18;
  const right = zz > 160 ? SEA_Y - 5 + face * (cliffH + roll * smooth(0, 140, d)) : SEA_Y - 8;
  const coast2 = -230 - (zz - 900) * 0.2 + 30 * Math.sin(zz * 0.015);
  const d2 = coast2 - x;
  const left = zz > 850 ? SEA_Y - 3 + smooth(-10, 90, d2) * (14 + 10 * fbm(x * 0.01, z * 0.01)) : SEA_Y - 8;
  return Math.max(right, left);
}

/* ---------------- the bird's route ---------------- */
const SKY: V3[] = [
  [-36, 13, -64],
  [-24, 18, -56],
  [-13, 15, -51],
  [-5, 21, -48],
  [3, 17.5, -46],
  [11, 22, -50],
  [21, 26, -58],
  [30, 24, -66],
];
const SEA: V3[] = [
  [30, 24, -66],
  [36, 20, -104],
  [48, 15, -170],
  [66, 11, -255],
  [92, 9, -350],
];
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function spline(P: V3[], t: number): V3 {
  const n = P.length - 1;
  const s = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(s);
  const u = s - i;
  const p = (k: number) => P[Math.max(0, Math.min(n, k))];
  return [0, 1, 2].map((a) => cr(p(i - 1)[a], p(i)[a], p(i + 1)[a], p(i + 2)[a], u)) as V3;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* ==================================================================
   GLSL shared by every surface: noise, sky, clouds, atmosphere, light
   ================================================================== */
const COMMON = /* glsl */ `
uniform float uTime, uDusk, uSunI, uAmb, uCover;
uniform vec3 uSun, uSunCol, uZenith, uHorizon, uGround;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n21(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm4(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * n21(p); p = p * 2.02 + 7.1; a *= 0.5; } return s; }
float fbm6(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 5; k++) { s += a * n21(p); p = p * 2.03 + 3.7; a *= 0.5; } return s; }

/* the same shadow, cheaply, for millions of blades */
float cloudShadowLo(vec3 wp) {
  vec3 s = normalize(vec3(uSun.x, max(uSun.y, 0.25), uSun.z));
  vec2 q = (wp.xz + s.xz / s.y * (${CLOUD_H.toFixed(1)} - wp.y)) / 1700.0 + vec2(uTime * 0.0035, uTime * 0.0012);
  float v = n21(q) * 0.55 + n21(q * 2.03 + 3.7) * 0.3 + n21(q * 4.1 + 1.3) * 0.15;
  return smoothstep(0.05, 0.6, smoothstep(uCover, uCover + 0.22, v));
}
/* the clear sky: Rayleigh blue overhead, milky toward the horizon, Mie glow round the sun */
vec3 skyBase(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.62, e), mix(0.5, 0.8, uDusk)));
  c = mix(c, uHorizon * 1.04, (1.0 - smoothstep(0.0, 0.05, e)) * 0.5);
  float s = max(dot(d, uSun), 0.0);
  c += uSunCol * (pow(s, 5.0) * (0.12 + 0.45 * uDusk) + pow(s, 48.0) * 0.5);
  if (d.y < 0.0) c = mix(c, uHorizon * 0.9, smoothstep(0.0, -0.2, d.y));
  return c;
}
/* cumulus on a high ceiling: domain-warped noise, drifting */
float cloudDens(vec2 p) {
  vec2 q = p / 1700.0 + vec2(uTime * 0.0035, uTime * 0.0012);
  vec2 w = vec2(fbm4(q * 0.8 + 3.1), fbm4(q * 0.8 - 1.7));
  float v = fbm6(q + w * 0.55);
  return smoothstep(uCover, uCover + 0.22, v);
}
vec3 skyFull(vec3 d, vec3 ro) {
  vec3 c = skyBase(d);
  float s = max(dot(d, uSun), 0.0);
  c = mix(c, uSunCol * 22.0, smoothstep(0.99965, 0.9998, s)); // the disc
  if (d.y > 0.004) {
    float t = (${CLOUD_H.toFixed(1)} - ro.y) / d.y;
    vec2 p = ro.xz + d.xz * t;
    float dens = cloudDens(p);
    if (dens > 0.001) {
      // self-shadow: how much cloud lies between here and the sun
      vec2 toSun = normalize(uSun.xz + 1e-4) * 260.0;
      float occ = cloudDens(p + toSun * 1.4);
      float lit = exp(-occ * 2.4);
      vec3 amb = mix(uZenith, uHorizon, 0.45 + 0.3 * uDusk) * 0.85;
      vec3 col = amb * (0.75 + 0.25 * dens) + uSunCol * uSunI * 0.34 * lit;
      col += uSunCol * pow(s, 7.0) * (1.0 - dens) * 1.4; // silver lining
      float fade = 1.0 - smoothstep(9000.0, 26000.0, t);
      // distant clouds sink into the haze
      col = mix(col, skyBase(vec3(d.x, d.y * 0.4, d.z)), smoothstep(3000.0, 22000.0, t) * 0.7);
      c = mix(c, col, dens * fade);
    }
  }
  return c;
}
vec3 skyRefl(vec3 d, vec3 ro) {
  vec3 c = skyBase(d);
  if (d.y > 0.004) {
    float t = (${CLOUD_H.toFixed(1)} - ro.y) / d.y;
    vec2 q = (ro.xz + d.xz * t) / 1700.0 + vec2(uTime * 0.0035, uTime * 0.0012);
    float v = fbm4(q + 0.3);
    float dens = smoothstep(uCover, uCover + 0.22, v) * (1.0 - smoothstep(9000.0, 26000.0, t));
    c = mix(c, mix(uZenith, uHorizon, 0.45) * 0.85 + uSunCol * uSunI * 0.25, dens * 0.85);
  }
  return c;
}
/* how much a point on the ground is shaded by the clouds overhead */
float cloudShadow(vec3 wp) {
  vec3 s = normalize(vec3(uSun.x, max(uSun.y, 0.25), uSun.z));
  vec2 p = wp.xz + s.xz / s.y * (${CLOUD_H.toFixed(1)} - wp.y);
  return smoothstep(0.05, 0.6, cloudDens(p));
}
/* aerial perspective: distance turns everything into sky */
vec3 atmo(vec3 c, vec3 wp) {
  vec3 v = wp - cameraPosition;
  float d = length(v);
  vec3 dir = v / max(d, 1e-3);
  float k = 1.0 - exp(-d * 0.00042);
  vec3 scat = skyBase(normalize(vec3(dir.x, max(dir.y, 0.0) * 0.25 + 0.015, dir.z)));
  return mix(c, scat, k);
}
vec3 ambient(vec3 n) {
  vec3 skyC = mix(uHorizon, uZenith, 0.55);
  return mix(uGround, skyC, n.y * 0.5 + 0.5) * uAmb;
}
`;

/* wind: gust patches roll across the meadow, small waves ride on them */
const WIND = /* glsl */ `
const vec2 WD = vec2(0.94, -0.34);
float wind(vec2 p, out float gust) {
  float along = dot(p, WD);
  float across = dot(p, vec2(-WD.y, WD.x));
  gust = smoothstep(0.35, 0.85, n21(vec2(along * 0.16 - uTime * 0.7, across * 0.1)));
  return 0.16 + gust * 0.8 + sin(along * 1.7 - uTime * 2.6 + p.y * 0.7) * 0.1 + sin(along * 4.1 - uTime * 4.3) * 0.04;
}
`;

/* the same vegetation light for blades, stems and petals */
const FOLIAGE = /* glsl */ `
vec3 foliage(vec3 base, vec3 n, vec3 wp, float h, float trans, float sheen, float cs) {
  h = clamp(h, 0.0, 1.0);
  vec3 V = normalize(cameraPosition - wp);
  if (dot(n, V) < 0.0) n = -n;
  float sh = 1.0 - 0.6 * cs;
  float ndl = dot(n, uSun);
  float diff = max(ndl * 0.65 + 0.35, 0.0) * mix(0.55, 1.0, h); // wrapped: thin leaves
  float back = pow(max(dot(-V, uSun), 0.0), 3.0) * trans;   // light through the blade
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(n, H), 0.0), 24.0) * sheen * h;
  float far = smoothstep(1.5, 7.0, length(cameraPosition - wp));
  float ao = mix(mix(0.28, 1.0, pow(h, 0.65)), 0.72, far);
  spec *= 1.0 - far;
  vec3 c = base * (ambient(n) * ao + uSunCol * uSunI * sh * (diff * 0.55 + back * vec3(1.0, 1.05, 0.6) * 0.9)) + uSunCol * uSunI * sh * spec * 0.12;
  return atmo(c, wp);
}
`;

/* ------------------------------------------------------------------ */
/* flowers, built from petals                                          */
/* ------------------------------------------------------------------ */
class Geo {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  head: number[] = [];
  idx: number[] = [];
  v(p: V3, n: V3, c: THREE.Color, head: number) {
    this.pos.push(...p);
    this.nor.push(...n);
    this.col.push(c.r, c.g, c.b);
    this.head.push(head);
    return this.pos.length / 3 - 1;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("aHead", new THREE.Float32BufferAttribute(this.head, 1));
    g.setIndex(this.idx);
    return g;
  }
}
/** one petal: a strip from base to tip, cupped up or drooping, coloured base→tip */
function petal(g: Geo, a: number, o: { r0: number; len: number; wid: number; cup: number; y0: number; c0: THREE.Color; c1: THREE.Color; segs?: number; tip?: number; head?: number }) {
  const S = o.segs ?? 4;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  let prev: [number, number] | null = null;
  for (let i = 0; i <= S; i++) {
    const t = i / S;
    const r = o.r0 + o.len * t;
    const y = o.y0 + o.cup * o.len * t * t;
    const w = (o.wid / 2) * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t * (o.tip ?? 0.92))), 0.7);
    const slope = 2 * o.cup * t;
    const n = new THREE.Vector3(-ca * slope, 1, -sa * slope).normalize();
    const col = o.c0.clone().lerp(o.c1, Math.min(1, t * 1.6));
    const L = g.v([ca * r - sa * w, y, sa * r + ca * w], [n.x, n.y, n.z], col, o.head ?? 1);
    const R = g.v([ca * r + sa * w, y, sa * r - ca * w], [n.x, n.y, n.z], col, o.head ?? 1);
    if (prev) g.idx.push(prev[0], prev[1], L, prev[1], R, L);
    prev = [L, R];
  }
}
/** a small dome (flower centres, buds, florets) */
function dome(g: Geo, c: V3, r: number, ry: number, col: THREE.Color, col2?: THREE.Color, seg = 7, rows = 3) {
  const base = g.pos.length / 3;
  for (let j = 0; j <= rows; j++) {
    const ph = (j / rows) * (Math.PI / 2);
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      const n: V3 = [Math.cos(th) * Math.cos(ph), Math.sin(ph), Math.sin(th) * Math.cos(ph)];
      g.v([c[0] + n[0] * r, c[1] + n[1] * r * ry, c[2] + n[2] * r], n, col2 ? col.clone().lerp(col2, j / rows) : col, 1);
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < seg; i++) {
      const a = base + j * seg + i;
      const b = base + j * seg + ((i + 1) % seg);
      g.idx.push(a, a + seg, b, b, a + seg, b + seg);
    }
}
/** the stem: two crossed ribbons along a gentle curve, head at y = 1 */
function stem(g: Geo, col: THREE.Color, w = 0.006, bend = 0.04, top = 1) {
  for (const k of [0, 1]) {
    const ax: V3 = k ? [0, 0, 1] : [1, 0, 0];
    let prev: [number, number] | null = null;
    for (let i = 0; i <= 6; i++) {
      const t = (i / 6) * top;
      const x = bend * t * t;
      const ww = w * (1 - 0.35 * t);
      const L = g.v([x - ax[0] * ww, t, -ax[2] * ww], [ax[2], 0, ax[0]], col, 0);
      const R = g.v([x + ax[0] * ww, t, ax[2] * ww], [ax[2], 0, ax[0]], col, 0);
      if (prev) g.idx.push(prev[0], prev[1], L, prev[1], R, L);
      prev = [L, R];
    }
  }
}
function leaf(g: Geo, y: number, a: number, len: number, col: THREE.Color) {
  petal(g, a, { r0: 0.004, len, wid: len * 0.22, cup: 0.35, y0: y, c0: col.clone().multiplyScalar(0.8), c1: col, segs: 4, head: 0 });
}

const KINDS = ["daisy", "poppy", "cosmos", "cornflower", "buttercup", "lace", "tansy", "oat", "clover"] as const;
type Kind = (typeof KINDS)[number];
function flowerGeo(kind: Kind) {
  const g = new Geo();
  const green = C("#4f6d2b");
  const r = (k: number) => hash(k * 3.1, k * 7.7);
  switch (kind) {
    case "daisy": {
      stem(g, green);
      leaf(g, 0.18, 0.4, 0.09, C("#58772f"));
      for (let k = 0; k < 21; k++)
        petal(g, (k / 21) * Math.PI * 2 + r(k) * 0.12, { r0: 0.018, len: 0.06 + r(k + 5) * 0.008, wid: 0.013, cup: -0.18, y0: 1, c0: C("#e9e6dc"), c1: C("#fbfaf6") });
      dome(g, [0, 1.002, 0], 0.02, 0.55, C("#d99a12"), C("#f2c23a"));
      break;
    }
    case "poppy": {
      stem(g, C("#5a7a33"), 0.005, 0.07);
      for (let k = 0; k < 4; k++)
        petal(g, (k / 4) * Math.PI * 2 + 0.3, { r0: 0.004, len: 0.052, wid: 0.06, cup: 0.85, y0: 0.995 + (k % 2) * 0.004, c0: C("#1d1414"), c1: C("#d4301a"), segs: 5, tip: 0.85 });
      dome(g, [0, 1.004, 0], 0.011, 1.0, C("#4c5a35"), C("#2a2a26"));
      break;
    }
    case "cosmos": {
      stem(g, green, 0.005, 0.05);
      leaf(g, 0.3, 2.4, 0.07, C("#5d7c33"));
      for (let k = 0; k < 8; k++)
        petal(g, (k / 8) * Math.PI * 2 + r(k) * 0.1, { r0: 0.008, len: 0.036, wid: 0.02, cup: 0.12, y0: 1, c0: C("#c24f80"), c1: C("#ef93b6"), tip: 0.98 });
      dome(g, [0, 1.004, 0], 0.011, 0.6, C("#e0a521"));
      break;
    }
    case "cornflower": {
      stem(g, C("#6b8459"), 0.004, 0.03);
      for (let k = 0; k < 13; k++) {
        const a = (k / 13) * Math.PI * 2;
        petal(g, a, { r0: 0.006, len: 0.03, wid: 0.011, cup: 0.6, y0: 1.004, c0: C("#3a3fa0"), c1: C("#5b7ae0"), segs: 3 });
      }
      dome(g, [0, 1.002, 0], 0.01, 1.0, C("#3a2f74"));
      break;
    }
    case "buttercup": {
      stem(g, green, 0.0035, 0.05);
      for (let k = 0; k < 5; k++)
        petal(g, (k / 5) * Math.PI * 2, { r0: 0.002, len: 0.017, wid: 0.017, cup: 0.9, y0: 1, c0: C("#d79d10"), c1: C("#f6cf2e"), segs: 3, tip: 0.8 });
      dome(g, [0, 1.004, 0], 0.005, 0.8, C("#c58c18"));
      break;
    }
    case "lace": {
      stem(g, C("#6a8240"), 0.005, 0.02);
      leaf(g, 0.25, 1.1, 0.1, C("#5f7d36"));
      // a flat umbel of many tiny florets on spokes
      for (let k = 0; k < 48; k++) {
        const a = r(k) * Math.PI * 2;
        const d = Math.sqrt(r(k + 90)) * 0.05;
        dome(g, [Math.cos(a) * d, 1.012 - d * d * 2, Math.sin(a) * d], 0.0042, 0.5, C("#dcdccf"), C("#fbfbf6"), 5, 1);
      }
      break;
    }
    case "tansy": {
      stem(g, green, 0.005, 0.02);
      leaf(g, 0.35, 0.6, 0.08, C("#56742d"));
      for (let k = 0; k < 14; k++) {
        const a = r(k) * Math.PI * 2;
        const d = Math.sqrt(r(k + 9)) * 0.036;
        dome(g, [Math.cos(a) * d, 1.005 - d * 0.4, Math.sin(a) * d], 0.0085, 0.7, C("#c58e10"), C("#eabd2a"), 6, 2);
      }
      break;
    }
    case "oat": {
      stem(g, C("#a49a62"), 0.003, 0.12);
      for (let k = 0; k < 16; k++) {
        const t = 0.72 + (k / 16) * 0.28;
        const a = (k % 2 ? 1 : -1) * 0.7 + r(k) * 0.3;
        petal(g, a + (k % 2 ? 0 : Math.PI), { r0: 0.002, len: 0.03, wid: 0.008, cup: -1.2, y0: t, c0: C("#a69a5e"), c1: C("#d8cf9a"), segs: 3, head: 1 });
      }
      break;
    }
    case "clover": {
      stem(g, green, 0.004, 0.03);
      for (let k = 0; k < 18; k++) {
        const a = r(k) * Math.PI * 2;
        const e = r(k + 3) * 1.2;
        dome(g, [Math.cos(a) * Math.cos(e) * 0.012, 1.012 + Math.sin(e) * 0.012, Math.sin(a) * Math.cos(e) * 0.012], 0.006, 0.8, C("#a0577e"), C("#d58fb3"), 5, 2);
      }
      break;
    }
  }
  return g.build();
}

/* ---------------- canvas helpers ---------------- */
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

/** An old print: foxed paper, a crisp photograph of the work, a title set in Bodoni, a postmark. */
function drawSheet(g: CanvasRenderingContext2D, W: number, H: number, i: number, img: HTMLImageElement, serif: string) {
  const cs = caseStudies[i];
  let seed = 31 + i * 101;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // paper
  g.fillStyle = "#eee3cb";
  g.fillRect(0, 0, W, H);
  for (let k = 0; k < 7; k++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 60 + r() * 220;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(176,136,78,${0.05 + r() * 0.07})`);
    grd.addColorStop(0.7, `rgba(176,136,78,${0.02 + r() * 0.03})`);
    grd.addColorStop(1, "rgba(176,136,78,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
  }
  for (let k = 0; k < 2600; k++) {
    g.fillStyle = `rgba(${90 + r() * 60},${70 + r() * 40},${40 + r() * 30},${0.04 + r() * 0.1})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  // darker, sun-worn edges
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const grd = g.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0, "rgba(150,108,58,0.28)");
    grd.addColorStop(1, "rgba(150,108,58,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
  };
  edge(0, 0, 70, 0);
  edge(W, 0, W - 70, 0);
  edge(0, 0, 0, 70);
  edge(0, H, 0, H - 70);
  // the photograph of the work, kept true to colour, with a fine plate line around it
  const m = 70;
  const ph = H * 0.64;
  g.save();
  if (img.complete && img.naturalWidth) {
    const s = Math.max((W - 2 * m) / img.naturalWidth, ph / img.naturalHeight);
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    g.beginPath();
    g.rect(m, m, W - 2 * m, ph);
    g.clip();
    g.drawImage(img, m + (W - 2 * m - iw) / 2, m + (ph - ih) * 0.45, iw, ih);
  } else {
    g.fillStyle = "#c9c2a6";
    g.fillRect(m, m, W - 2 * m, ph);
  }
  g.restore();
  g.strokeStyle = "rgba(43,42,58,0.55)";
  g.lineWidth = 2;
  g.strokeRect(m - 12, m - 12, W - 2 * m + 24, ph + 24);
  // caption
  const ink = "#2a2b3d";
  g.fillStyle = ink;
  g.textBaseline = "alphabetic";
  g.font = `italic 30px ${serif}`;
  g.fillText(`Plate ${["I", "II", "III", "IV", "V"][i]}.`, m - 12, m + ph + 80);
  g.font = `68px ${serif}`;
  g.fillText(cs.title, m - 12, m + ph + 160);
  g.font = `26px "Courier New", monospace`;
  g.fillStyle = "rgba(42,43,61,0.75)";
  g.fillText(`${cs.kind}, ${cs.year}`, m - 10, m + ph + 205);
  // a faded postmark
  g.save();
  g.translate(W - 190, H - 140);
  g.rotate(-0.22);
  g.strokeStyle = "rgba(43,58,107,0.5)";
  g.fillStyle = "rgba(43,58,107,0.5)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 72, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 60, 0, Math.PI * 2);
  g.stroke();
  g.font = `600 20px "Courier New", monospace`;
  g.textAlign = "center";
  g.fillText("STOCKHOLM", 0, -14);
  g.font = `600 30px "Courier New", monospace`;
  g.fillText(cs.year, 0, 24);
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.moveTo(84, -24 + k * 16);
    g.bezierCurveTo(130, -40 + k * 16, 170, -8 + k * 16, 220, -24 + k * 16);
    g.stroke();
  }
  g.restore();
}

/* ================================================================== */

export function Scene() {
  const host = useRef<HTMLDivElement>(null);
  const ready = useJourney((s) => s.ready);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      document.documentElement.dataset.nowebgl = "";
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const DPR = Math.min(window.devicePixelRatio, small ? 1.25 : 1.75);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 6000);

    // one sun, one sky: every material reads these
    const U = {
      uTime: { value: 0 },
      uDusk: { value: 0 },
      uSun: { value: SUN_DAY.clone() },
      uSunCol: { value: DAY.sun.clone() },
      uSunI: { value: DAY.sunI },
      uAmb: { value: DAY.amb },
      uZenith: { value: DAY.zenith.clone() },
      uHorizon: { value: DAY.horizon.clone() },
      uGround: { value: DAY.ground.clone() },
      uSea: { value: DAY.sea.clone() },
      uCover: { value: 0.5 },
    };

    /** a plain lit surface (vertex colours, instance colours or one colour), with an optional map */
    const lit = (o: { color?: THREE.Color; vertexColors?: boolean; map?: THREE.Texture; detail?: number; side?: THREE.Side; transparent?: boolean } = {}) =>
      new THREE.ShaderMaterial({
        vertexColors: !!o.vertexColors,
        side: o.side ?? THREE.FrontSide,
        uniforms: { ...U, uColor: { value: o.color ?? C("#ffffff") }, uMap: { value: o.map ?? null }, uDetail: { value: o.detail ?? 0 } },
        defines: o.map ? { USE_UVMAP: "" } : {},
        vertexShader: /* glsl */ `
          varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv2;
          void main() {
            vec4 lp = vec4(position, 1.0); vec3 n = normal; vC = vec3(1.0);
            #ifdef USE_INSTANCING
              lp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;
            #endif
            #ifdef USE_INSTANCING_COLOR
              vC *= instanceColor;
            #endif
            #ifdef USE_COLOR
              vC *= color;
            #endif
            vec4 wp = modelMatrix * lp;
            vW = wp.xyz; vN = normalize(mat3(modelMatrix) * n); vUv2 = uv;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uDetail;
          #ifdef USE_UVMAP
            uniform sampler2D uMap;
          #endif
          ${COMMON}
          varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv2;
          void main() {
            vec3 base = uColor * vC;
            #ifdef USE_UVMAP
              base *= texture2D(uMap, vUv2).rgb;
            #endif
            base *= 1.0 + uDetail * (fbm4(vW.xz * 0.9 + vW.y * 0.3) - 0.5);
            float near = 1.0 - smoothstep(0.6, 2.8, length(vW - cameraPosition));
            if (uDetail > 0.3) base = mix(base, base * vec3(0.8, 0.74, 0.6) * (0.85 + 0.3 * fbm4(vW.xz * 3.0)), near * 0.5);
            vec3 n = normalize(vN);
            if (!gl_FrontFacing) n = -n;
            float sh = 1.0 - 0.6 * cloudShadowLo(vW);
            vec3 c = base * (ambient(n) + uSunCol * uSunI * max(dot(n, uSun), 0.0) * sh * 0.6);
            gl_FragColor = vec4(atmo(c, vW), 1.0);
          }`,
      });

    /* ---------------- sky ---------------- */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: U,
        vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          ${COMMON}
          varying vec3 vDir;
          void main() { gl_FragColor = vec4(skyFull(normalize(vDir), cameraPosition), 1.0); }`,
      }),
    );
    sky.renderOrder = -1;
    scene.add(sky);

    /* ---------------- the near land ---------------- */
    const tmp = new THREE.Color();
    {
      const lg = new THREE.PlaneGeometry(180, 80, 300, 150);
      lg.rotateX(-Math.PI / 2);
      lg.translate(0, 0, -20);
      const lp = lg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < lp.count; i++) lp.setY(i, landH(lp.getX(i), lp.getZ(i)));
      lg.computeVertexNormals();
      const ln = lg.attributes.normal as THREE.BufferAttribute;
      const cols = new Float32Array(lp.count * 3);
      for (let i = 0; i < lp.count; i++) {
        const x = lp.getX(i);
        const z = lp.getZ(i);
        const y = lp.getY(i);
        meadowColor(x, z, tmp);
        tmp.lerp(C("#4a5f2c"), 0.2); // the ground between the stems
        const steep = smooth(0.82, 0.55, ln.getY(i));
        tmp.lerp(MEADOW.rock.clone().lerp(MEADOW.rockDark, fbm(x * 0.6, y * 0.4)), steep);
        if (y < SEA_Y + 1.5) tmp.lerp(C("#d3c6a6"), 0.75);
        tmp.toArray(cols, i * 3);
      }
      lg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
      scene.add(new THREE.Mesh(lg, lit({ vertexColors: true, detail: 0.45 })));
    }

    /* ---------------- the far shore: fields, hedgerows, chalk ---------------- */
    {
      const fg = new THREE.PlaneGeometry(1500, 1400, 300, 280);
      fg.rotateX(-Math.PI / 2);
      fg.translate(0, 0, -870);
      const fp = fg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fp.count; i++) fp.setY(i, farH(fp.getX(i), fp.getZ(i)));
      fg.computeVertexNormals();
      scene.add(
        new THREE.Mesh(
          fg,
          new THREE.ShaderMaterial({
            uniforms: U,
            vertexShader: /* glsl */ `
              varying vec3 vW; varying vec3 vN;
              void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * wp; }`,
            fragmentShader: /* glsl */ `
              ${COMMON}
              varying vec3 vW; varying vec3 vN;
              vec3 field(float id) {
                vec3 a = vec3(0.30, 0.36, 0.13), b = vec3(0.52, 0.47, 0.22), c = vec3(0.22, 0.31, 0.11), d = vec3(0.6, 0.53, 0.3), e = vec3(0.42, 0.42, 0.2);
                return id < 0.2 ? a : id < 0.4 ? b : id < 0.6 ? c : id < 0.8 ? d : e;
              }
              void main() {
                vec3 n = normalize(vN);
                float u = (vW.x * 0.8 + vW.z * 0.6) / 48.0;
                float v = (-vW.x * 0.6 + vW.z * 0.8) / 34.0 + 0.35 * sin(u * 1.7);
                float id = h21(floor(vec2(u, v)));
                vec3 base = field(id) * (0.85 + 0.3 * fbm4(vW.xz * 0.05));
                // furrows and mowing lines
                base *= 1.0 + 0.06 * sin((fract(u) + fract(v) * (id > 0.5 ? 1.0 : 0.0)) * 120.0);
                float e = min(min(fract(u), 1.0 - fract(u)), min(fract(v), 1.0 - fract(v)));
                float hedge = 1.0 - smoothstep(0.012, 0.035, e + (n21(vW.xz * 0.4) - 0.5) * 0.02);
                base = mix(base, vec3(0.1, 0.16, 0.06), hedge * 0.9);
                // chalk on the steep faces, banded and streaked
                float steep = smoothstep(0.8, 0.45, n.y);
                float gully = n21(vec2((vW.x + vW.z) * 0.18, vW.y * 0.08));
                vec3 chalk = vec3(0.84, 0.81, 0.74) * (0.7 + 0.3 * gully) * (0.88 + 0.12 * n21(vec2(vW.x * 1.3 + vW.z, vW.y * 1.4)));
                chalk *= mix(0.62, 1.0, smoothstep(${(SEA_Y - 2).toFixed(1)}, ${(SEA_Y + 9).toFixed(1)}, vW.y)); // wet, darker at the foot
                chalk = mix(chalk, vec3(0.42, 0.45, 0.3), smoothstep(0.55, 0.8, n.y) * 0.6); // grass creeping over the brow
                base = mix(base, chalk, steep);
                if (vW.y < ${(SEA_Y + 2).toFixed(1)}) base = vec3(0.72, 0.66, 0.52);
                float sh = 1.0 - 0.6 * cloudShadowLo(vW);
                vec3 c = base * (ambient(n) + uSunCol * uSunI * max(dot(n, uSun), 0.0) * sh * 0.6);
                gl_FragColor = vec4(atmo(c, vW), 1.0);
              }`,
          }),
        ),
      );

      // trees along the hedgerows, and woods: each a few overlapping crowns
      const treeGeo = new THREE.IcosahedronGeometry(1, 3);
      { // lumpy crowns, so no two read as balls
        const tp = treeGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < tp.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(tp, i);
          const k = 0.8 + 0.4 * fbm(v.x * 2 + 3, v.z * 2 + v.y * 1.7);
          v.multiplyScalar(k);
          if (v.y < -0.2) v.y = -0.2 + (v.y + 0.2) * 0.4; // flat-bottomed, like real canopies
          tp.setXYZ(i, v.x, v.y, v.z);
        }
        treeGeo.computeVertexNormals();
      }
      const trees = new THREE.InstancedMesh(treeGeo, lit({ color: C("#ffffff") }), 2400);
      const M = new THREE.Matrix4();
      const Q = new THREE.Quaternion();
      const S = new THREE.Vector3();
      const P = new THREE.Vector3();
      let n = 0;
      let s = 5;
      const rr = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const cellOf = (x: number, z: number) => {
        const u = (x * 0.8 + z * 0.6) / 48;
        const v = (-x * 0.6 + z * 0.8) / 34 + 0.35 * Math.sin(u * 1.7);
        return Math.min(u - Math.floor(u), Math.ceil(u) - u, v - Math.floor(v), Math.ceil(v) - v);
      };
      for (let k = 0; k < 60000 && n < 2380; k++) {
        const x = -600 + rr() * 1300;
        const z = -180 - rr() * 1100;
        const y = farH(x, z);
        if (y < SEA_Y + 6) continue;
        const onHedge = cellOf(x, z) < 0.02 && rr() < 0.55;
        const wood = fbm(x * 0.012, z * 0.012) > 0.67;
        if (!onHedge && !wood) continue;
        if (farH(x + 6, z) < y - 4 || farH(x - 6, z) < y - 4) continue;
        const sc = 2.4 + rr() * 3.4;
        for (let j = 0; j < 3; j++) {
          P.set(x + (rr() - 0.5) * sc * 1.2, y + sc * (0.7 + rr() * 0.6), z + (rr() - 0.5) * sc * 1.2);
          const ss = sc * (0.45 + rr() * 0.4);
          S.set(ss, ss * (0.8 + rr() * 0.3), ss);
          trees.setMatrixAt(n, M.compose(P, Q, S));
          tmp.setRGB(0.12 + rr() * 0.05, 0.19 + rr() * 0.06, 0.07 + rr() * 0.03);
          trees.setColorAt(n, tmp);
          n++;
        }
      }
      trees.count = n;
      scene.add(trees);

      // a ruined tower on the point, a few white houses with red roofs
      const zP = -1000;
      const xP = coastR(1000) + 30;
      const stone = lit({ color: C("#9d968a"), detail: 0.6 });
      for (const [w, h, d, dx, dz] of [
        [9, 22, 9, 0, 0],
        [6, 13, 6, 8, 1],
        [3, 8, 10, -6, 3],
      ]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
        b.position.set(xP + dx, farH(xP, zP) - 1 + h / 2, zP + dz);
        scene.add(b);
      }
      const houseM = lit({ color: C("#efe9df") });
      const roofM = lit({ color: C("#a8634f") });
      for (let k = 0; k < 11; k++) {
        const z = -430 - k * 9 - rr() * 10;
        const x = coastR(-z) + 70 + rr() * 60;
        const y = farH(x, z);
        const b = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 6), houseM);
        b.position.set(x, y + 2.3, z);
        b.rotation.y = rr() * 0.6;
        scene.add(b);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 4), roofM);
        roof.position.set(x, y + 6.2, z);
        roof.rotation.y = b.rotation.y + Math.PI / 4;
        scene.add(roof);
      }
    }

    /* ---------------- the sea ---------------- */
    {
      const seaG = new THREE.PlaneGeometry(9000, 6000, 1, 1);
      seaG.rotateX(-Math.PI / 2);
      const sea = new THREE.Mesh(
        seaG,
        new THREE.ShaderMaterial({
          uniforms: U,
          vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uSea;
            ${COMMON}
            varying vec3 vW;
            vec2 waves(vec2 p, float lod) {
              vec2 g = vec2(0.0);
              float a = 0.32, k = 0.09;
              for (int i = 0; i < 7; i++) {
                float an = -1.2 + float(i) * 0.43 + sin(float(i) * 12.9) * 0.35;
                vec2 D = vec2(cos(an), sin(an));
                float ph = dot(D, p) * k - uTime * sqrt(9.8 * k) * 0.85 + float(i) * 1.7;
                g += D * k * a * cos(ph) * (1.0 - lod * float(i) / 7.0);
                a *= 0.62; k *= 1.72;
              }
              vec2 q = p * 0.6 + vec2(uTime * 0.35, -uTime * 0.22);
              g += (vec2(n21(q), n21(q + 17.3)) - 0.5) * 0.2 * (1.0 - lod);
              vec2 q3 = p * 0.07 + vec2(uTime * 0.03, uTime * 0.02);
              g += (vec2(fbm4(q3), fbm4(q3 + 9.1)) - 0.5) * 0.12;
              vec2 q2 = p * 2.2 + vec2(-uTime * 0.9, uTime * 0.6);
              g += (vec2(n21(q2), n21(q2 + 5.1)) - 0.5) * 0.07 * (1.0 - smoothstep(0.0, 0.25, lod));
              return g;
            }
            float edgeZ(float x) { return -14.0 + 1.3 * sin(x * 0.15) + 0.6 * sin(x * 0.41 + 1.0) + max(0.0, abs(x) - 16.0) * 0.85; }
            void main() {
              vec3 v = vW - cameraPosition;
              float d = length(v);
              vec3 vd = v / d;
              float lod = smoothstep(25.0, 500.0, d);
              vec2 g = waves(vW.xz, lod);
              // calm lanes and wind-ruffled patches, as on a real bay
              float ruffle = smoothstep(0.3, 0.7, fbm4(vW.xz * 0.004 + vec2(uTime * 0.004, 0.0)));
              g *= mix(0.45, 1.15, ruffle);
              vec3 nn = normalize(vec3(-g.x, 1.0, -g.y));
              vec3 r = reflect(vd, nn);
              r.y = abs(r.y);
              vec3 refl = skyRefl(r, vW);
              float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-vd, nn), 0.0), 5.0);
              // the body of the water: deep blue, greener where the light passes through a crest
              vec3 body = uSea * (ambient(vec3(0.0, 1.0, 0.0)) * 0.9 + uSunCol * uSunI * 0.08);
              float through = pow(max(dot(vd, uSun) * -1.0 + 0.2, 0.0), 2.0) * max(g.x + g.y, 0.0) * 6.0;
              body += vec3(0.05, 0.22, 0.22) * through * uSunI * 0.2;
              // shallows and foam at the foot of the cliff
              float base = edgeZ(vW.x) - 4.6;
              float shore = 1.0 - smoothstep(0.0, 14.0, base - vW.z);
              shore *= step(vW.z, base + 0.4);
              body = mix(body, vec3(0.12, 0.38, 0.38) * uSunI * 0.35, shore * 0.7);
              vec3 c = mix(body, refl * 0.82, clamp(fres, 0.0, 0.92));
              vec3 H = normalize(uSun - vd);
              float spec = pow(max(dot(nn, H), 0.0), mix(900.0, 260.0, lod));
              c += uSunCol * uSunI * spec * mix(5.0, 1.5, lod) * (1.0 - 0.7 * cloudShadowLo(vW));
              float foamBand = (1.0 - smoothstep(0.0, 3.0 + 1.5 * sin(uTime * 0.8 + vW.x * 0.3), base - vW.z)) * step(vW.z, base + 0.2);
              float foam = foamBand * smoothstep(0.4, 0.75, n21(vW.xz * 0.9 + vec2(uTime * 0.4, 0.0)) * 0.7 + n21(vW.xz * 3.0 - uTime) * 0.4);
              c = mix(c, vec3(0.92, 0.93, 0.92) * (ambient(vec3(0, 1, 0)) + uSunCol * uSunI * 0.5) * 0.8, foam * (1.0 - lod));
              gl_FragColor = vec4(atmo(c, vW), 1.0);
            }`,
        }),
      );
      sea.position.set(0, SEA_Y, -2800);
      scene.add(sea);
    }

    /* ---------------- grass ---------------- */
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    {
      const N = small ? 50000 : 120000;
      const blade = new THREE.InstancedBufferGeometry();
      const bp: number[] = [];
      const seg = 5;
      for (let k = 0; k < seg; k++) bp.push(-0.5, k / seg, 0, 0.5, k / seg, 0);
      bp.push(0, 1, 0);
      const idx: number[] = [];
      for (let k = 0; k < seg - 1; k++) {
        const a = k * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      idx.push((seg - 1) * 2, (seg - 1) * 2 + 1, seg * 2);
      blade.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
      blade.setIndex(idx);
      const off = new Float32Array(N * 4);
      const par = new Float32Array(N * 4);
      const col = new Float32Array(N * 3);
      const dry = C("#a89a5b");
      let n = 0;
      for (let tries = 0; n < N && tries < N * 3; tries++) {
        let x: number;
        let z: number;
        const close = tries % 3 === 0;
        if (close) {
          // denser where the camera comes close, falling off softly (gaussian, no edge)
          const a = rnd() * Math.PI * 2;
          const rr = Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)) * 0.65;
          x = 0.07 + Math.cos(a) * rr * 1.3;
          z = 0.08 + Math.sin(a) * rr;
        } else if (tries % 2) {
          const a = rnd() * Math.PI * 2;
          const d = Math.pow(rnd(), 1.1) * 7;
          x = Math.cos(a) * d * 1.4;
          z = Math.sin(a) * d + 1;
        } else {
          x = (rnd() - 0.5) * 44;
          z = 10 - rnd() * 26;
        }
        if (z < edgeZ(x) + 0.3) continue;
        if (underSheet(x, z, -0.035)) continue; // blades reach in under the paper edges
        // clumps: tall tussocks, shorter between
        const clump = smooth(0.35, 0.8, fbm(x * 1.6, z * 1.6));
        let hgt = (0.16 + rnd() * 0.3) * (0.7 + 0.6 * clump) + smooth(0.45, 0.8, fbm(x * 0.3, z * 0.3)) * 0.25;
        hgt *= 0.8 + 0.2 * smooth(0.4, 2.5, Math.hypot((x - 0.07) / 1.25, (z - 0.08) / 0.95));
        // close-only blades (negative height) grow in as the camera comes down to the prints
        off.set([x, landH(x, z) - 0.02, z, close ? -hgt : hgt], n * 4);
        const wfar = 1 + smooth(2, 10, Math.hypot(x, z - 1)) * 1.4;
        par.set([rnd() * Math.PI * 2, (rnd() - 0.5) * 0.7, rnd(), (rnd() < 0.15 ? 0.01 + rnd() * 0.006 : 0.0035 + rnd() * 0.004) * wfar], n * 4);
        meadowColor(x, z, tmp);
        if (rnd() < 0.24) tmp.lerp(dry, 0.5 + rnd() * 0.5); // some blades already dry
        else if (rnd() < 0.3) tmp.lerp(C("#3d5a35"), 0.5); // and some cool, blue-green
        tmp.offsetHSL((rnd() - 0.5) * 0.04, -0.08 + (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.1);
        tmp.toArray(col, n * 3);
        n++;
      }
      blade.instanceCount = n;
      blade.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
      blade.setAttribute("aPar", new THREE.InstancedBufferAttribute(par, 4));
      blade.setAttribute("aCol", new THREE.InstancedBufferAttribute(col, 3));
      const grass = new THREE.Mesh(
        blade,
        new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          uniforms: U,
          vertexShader: /* glsl */ `
            attribute vec4 aOff; attribute vec4 aPar; attribute vec3 aCol;
            ${COMMON}
            ${WIND}
            varying float vH; varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vCs; varying float vX;
            void main() {
              vCs = cloudShadowLo(aOff.xyz);
              vX = position.x;
              float t = position.y;
              float h = abs(aOff.w);
              if (aOff.w < 0.0) h *= 1.0 - smoothstep(2.0, 2.8, distance(cameraPosition, aOff.xyz));
              float w = aPar.w * (1.0 - t * 0.9) * step(0.001, h);
              float ca = cos(aPar.x), sa = sin(aPar.x);
              vec3 T = vec3(ca, 0.0, sa);
              vec3 F = vec3(-sa, 0.0, ca);
              // each blade arcs under its own weight, then the wind lays it over
              float gust;
              float k = wind(aOff.xz, gust);
              vec2 lean = F.xz * aPar.y * 0.6 + WD * (k + aPar.y * 0.2);
              float b = t * t * h;
              vec3 p = aOff.xyz + T * position.x * w + vec3(0.0, t * h, 0.0);
              p.xz += lean * b * 0.85;
              p.y -= dot(lean, lean) * b * t * 0.35;
              vec3 nrm = normalize(F + vec3(0.0, 0.35 + 0.4 * t, 0.0) - vec3(lean.x, 0.0, lean.y) * t * 0.5);
              vH = t; vCol = aCol * (0.9 + 0.25 * gust * t); vW = p; vN = nrm;
              gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
            }`,
          fragmentShader: /* glsl */ `
            ${COMMON}
            ${FOLIAGE}
            varying float vH; varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vCs; varying float vX;
            void main() {
              float hh = clamp(vH, 0.0, 1.0);
              float rib = 0.82 + 0.3 * (1.0 - abs(vX * 2.0)); // the midrib catches the light, the edges fall off
              float farB = smoothstep(1.5, 7.0, length(cameraPosition - vW));
              vec3 base = mix(mix(vCol * 0.7, vCol * 1.12 + vec3(0.03, 0.03, 0.0), hh), vCol * 0.95, farB);
              gl_FragColor = vec4(foliage(base * rib, normalize(vN), vW, vH, 0.9, 0.6, vCs), 1.0);
            }`,
        }),
      );
      grass.frustumCulled = false;
      scene.add(grass);
    }

    /* ---------------- flowers ---------------- */
    {
      const counts: Record<Kind, number> = { daisy: 0, poppy: 0, cosmos: 0, cornflower: 0, buttercup: 0, lace: 0, tansy: 0, oat: 0, clover: 0 };
      const items: Record<Kind, number[]> = { daisy: [], poppy: [], cosmos: [], cornflower: [], buttercup: [], lace: [], tansy: [], oat: [], clover: [] };
      const N = small ? 5000 : 10000;
      let n = 0;
      for (let tries = 0; n < N && tries < N * 6; tries++) {
        let x: number;
        let z: number;
        if (tries % 4 === 0) {
          const a = rnd() * Math.PI * 2;
          const d = 0.5 + Math.pow(rnd(), 0.8) * 4;
          x = Math.cos(a) * d * 1.4;
          z = Math.sin(a) * d * 0.9 + 0.3;
        } else {
          x = (rnd() - 0.5) * 34;
          z = 9 - Math.pow(rnd(), 1.4) * 22;
        }
        if (z < edgeZ(x) + 0.5 || underSheet(x, z, 0.06) || inPatch(x, z, 1.15) || (inPatch(x, z, 1.6) && rnd() < 0.6)) continue;
        if (fbm(x * 0.6 + 7, z * 0.6 - 3) < 0.4 && rnd() < 0.75) continue;
        const r = rnd();
        let kind: Kind;
        if (pinkField(x, z) > 0.62 && r < 0.35) kind = "cosmos";
        else if (laceField(x, z) > 0.6 && r < 0.45) kind = "lace";
        else if (yellowField(x, z) > 0.62 && r < 0.4) kind = "tansy";
        else if (poppyField(x, z) > 0.64 && r < 0.35) kind = "poppy";
        else if (r < 0.42) kind = "daisy";
        else if (r < 0.5) kind = "buttercup";
        else if (r < 0.57) kind = "oat";
        else if (r < 0.61) kind = "clover";
        else if (r < 0.63) kind = "cornflower";
        else continue;
        const tall = kind === "oat" || kind === "lace" ? 1.35 : kind === "buttercup" || kind === "clover" ? 0.65 : 1;
        const size = (0.26 + rnd() * 0.3) * tall;
        items[kind].push(x, landH(x, z) - 0.01, z, size, rnd() * Math.PI * 2, 0.15 + rnd() * 0.5, rnd());
        counts[kind]++;
        n++;
      }
      const mat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        vertexColors: true,
        uniforms: U,
        vertexShader: /* glsl */ `
          attribute float aHead; attribute vec4 aOff; attribute vec3 aRot;
          ${COMMON}
          ${WIND}
          varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vH; varying float vPetal; varying float vCs;
          mat3 rx(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
          mat3 ry(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
          void main() {
            vec3 p = position; vec3 n = normal;
            if (aHead > 0.5) { p = rx(aRot.y) * (p - vec3(0.0, 1.0, 0.0)) + vec3(0.0, 1.0, 0.0); n = rx(aRot.y) * n; }
            p = ry(aRot.x) * p; n = ry(aRot.x) * n;
            p *= aOff.w;
            float gust;
            float k = wind(aOff.xz, gust) + (aRot.z - 0.5) * 0.3;
            float y = clamp(position.y, 0.0, 1.3);
            float b = k * y * y * aOff.w * 0.38;
            p.xz += WD * b;
            p.y -= b * b / aOff.w * 0.5;
            vec3 wp = aOff.xyz + p;
            vCol = color; vW = wp; vN = n; vH = y; vPetal = aHead; vCs = cloudShadowLo(aOff.xyz);
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          ${COMMON}
          ${FOLIAGE}
          varying vec3 vCol; varying vec3 vW; varying vec3 vN; varying float vH; varying float vPetal; varying float vCs;
          void main() {
            vec3 c = foliage(vCol, normalize(vN), vW, max(vH, 0.35), mix(0.7, 1.4, vPetal), mix(0.4, 0.9, vPetal), vCs);
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      for (const kind of KINDS) {
        const cnt = counts[kind];
        if (!cnt) continue;
        const base = flowerGeo(kind);
        const ig = new THREE.InstancedBufferGeometry();
        for (const a of ["position", "normal", "color", "aHead"]) ig.setAttribute(a, base.getAttribute(a));
        ig.setIndex(base.getIndex());
        const off = new Float32Array(cnt * 4);
        const rot = new Float32Array(cnt * 3);
        const it = items[kind];
        for (let i = 0; i < cnt; i++) {
          off.set(it.slice(i * 7, i * 7 + 4), i * 4);
          rot.set(it.slice(i * 7 + 4, i * 7 + 7), i * 3);
        }
        ig.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
        ig.setAttribute("aRot", new THREE.InstancedBufferAttribute(rot, 3));
        ig.instanceCount = cnt;
        const m = new THREE.Mesh(ig, mat);
        m.frustumCulled = false;
        scene.add(m);
      }
    }

    /* ---------------- pollen, drifting in the light ---------------- */
    {
      const M = 260;
      const pts = new Float32Array(M * 3);
      const ph = new Float32Array(M);
      for (let i = 0; i < M; i++) {
        pts.set([(rnd() - 0.5) * 5, 0.05 + rnd() * 1.4, (rnd() - 0.5) * 4 + 0.5], i * 3);
        ph[i] = rnd() * 100;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
      g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
      const motes = new THREE.Points(
        g,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { ...U, uScale: { value: 1 } },
          vertexShader: /* glsl */ `
            attribute float aPh; uniform float uScale;
            ${COMMON}
            varying float vA;
            void main() {
              vec3 p = position;
              float t = uTime * 0.12 + aPh;
              p += vec3(sin(t * 1.3) * 0.25 + uTime * 0.03, sin(t * 0.9) * 0.12, cos(t * 1.1) * 0.2);
              p.x = mod(p.x + 2.5, 5.0) - 2.5;
              vec4 mv = viewMatrix * vec4(p, 1.0);
              vec3 V = normalize(p - cameraPosition);
              vA = (0.25 + 1.4 * pow(max(dot(V, uSun), 0.0), 4.0)) * (0.6 + 0.4 * sin(t * 7.0 + aPh));
              gl_PointSize = uScale * 2.2 / max(-mv.z, 0.2);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            ${COMMON}
            varying float vA;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              float a = smoothstep(0.5, 0.0, d) * vA;
              gl_FragColor = vec4(uSunCol * a * 0.6, 1.0);
            }`,
        }),
      );
      motes.frustumCulled = false;
      scene.add(motes);
    }

    /* ---------------- the prints, lying in the grass ---------------- */
    const serif = () => `${getComputedStyle(document.body).getPropertyValue("--font-bodoni").trim() || "Didot"}, serif`;
    const shadowTex = (() => {
      const { c, g } = canvas(256, 192);
      g.filter = "blur(10px)";
      g.fillStyle = "rgba(20,26,10,0.7)";
      g.fillRect(36, 30, 184, 132);
      return new THREE.CanvasTexture(c);
    })();
    const shadowM = (m: THREE.Mesh) => m.material as THREE.MeshBasicMaterial;
    const sheets = caseStudies.slice(0, SHEETS.length).map((cs, i) => {
      const at = SHEETS[i];
      const { c, g } = canvas(1200, 900);
      const img = new Image();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const draw = () => {
        drawSheet(g, 1200, 900, i, img, serif());
        tex.needsUpdate = true;
      };
      img.onload = draw;
      img.src = cs.image.src;
      draw();
      const geo = new THREE.PlaneGeometry(PW, PH, 18, 14);
      geo.rotateX(-Math.PI / 2);
      const base = Float32Array.from(geo.attributes.position.array as Float32Array);
      const m = new THREE.Mesh(geo, lit({ map: tex, side: THREE.DoubleSide, color: C("#ffffff").multiplyScalar(1.05) }));
      const y = 0.03 + i * 0.002;
      m.position.set(at.x, y, at.z);
      m.rotation.order = "YXZ";
      m.rotation.y = at.r;
      scene.add(m);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.25, PH * 1.25), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      sh.rotation.set(-Math.PI / 2, 0, at.r);
      sh.position.set(at.x + 0.012, 0.012, at.z + 0.01);
      scene.add(sh);
      return { m, sh, base, draw, y, at, focus: 0 };
    });
    const flutter = (time: number) => {
      sheets.forEach(({ m, base, focus }, i) => {
        const pos = m.geometry.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < pos.count; k++) {
          const x = base[k * 3] / (PW / 2);
          const z = base[k * 3 + 2] / (PH / 2);
          const curl = 0.006 * Math.pow(Math.abs(x), 3) + 0.004 * Math.pow(Math.max(0, z), 3);
          const lift = Math.max(0, x * (i % 2 ? -1 : 1)) ** 2 * (0.003 + 0.003 * Math.sin(time * 1.6 + i * 1.7 + z * 1.5)) * (1 - focus * 0.7);
          pos.setY(k, curl + lift);
        }
        pos.needsUpdate = true;
        m.geometry.computeVertexNormals();
      });
    };

    /* ---------------- birds ---------------- */
    const birdM = new THREE.MeshBasicMaterial({ color: C("#1e2230"), side: THREE.DoubleSide });
    const tri = (pts: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return g;
    };
    const makeBird = () => {
      const root = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), birdM);
      body.scale.set(0.1, 0.09, 0.5);
      root.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), birdM);
      head.position.set(0, 0.02, 0.26);
      root.add(head);
      root.add(new THREE.Mesh(tri([0, 0, -0.18, 0.11, 0, -0.4, -0.11, 0, -0.4]), birdM));
      const wings: { inner: THREE.Group; outer: THREE.Group }[] = [];
      for (const side of [1, -1]) {
        const mirror = new THREE.Group();
        mirror.scale.x = side;
        root.add(mirror);
        const inner = new THREE.Group();
        inner.position.x = 0.04;
        mirror.add(inner);
        inner.add(new THREE.Mesh(tri([0, 0, 0.12, 0.34, 0, 0.08, 0.34, 0, -0.12, 0, 0, 0.12, 0.34, 0, -0.12, 0, 0, -0.1]), birdM));
        const outer = new THREE.Group();
        outer.position.x = 0.34;
        inner.add(outer);
        // swept, tapering hand feathers
        outer.add(new THREE.Mesh(tri([0, 0, 0.08, 0.3, 0, 0.0, 0.46, 0, -0.1, 0, 0, 0.08, 0.46, 0, -0.1, 0.22, 0, -0.12, 0, 0, 0.08, 0.22, 0, -0.12, 0, 0, -0.12]), birdM));
        wings.push({ inner, outer });
      }
      scene.add(root);
      return { root, wings };
    };
    const flapBird = (b: ReturnType<typeof makeBird>, t: number, glide: number) => {
      const s = Math.sin(t);
      const a = lerp(0.1 + s * 0.6, 0.06 + Math.sin(t * 0.3) * 0.04, glide);
      const o = lerp(Math.sin(t - 0.7) * 0.5, 0.04, glide);
      for (const w of b.wings) {
        w.inner.rotation.z = a;
        w.outer.rotation.z = o;
      }
    };
    const bird = makeBird();
    bird.root.scale.setScalar(1.9);
    const flock = Array.from({ length: 6 }, (_, i) => ({ b: makeBird(), ph: i * 1.1, r: 18 + i * 3 }));

    /* ---------------- the lens: depth of field, tone curve, grain ---------------- */
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    rt.depthTexture = new THREE.DepthTexture(1, 1);
    const post = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tColor: { value: rt.texture },
          tDepth: { value: rt.depthTexture },
          uTexel: { value: new THREE.Vector2() },
          uNear: { value: camera.near },
          uFar: { value: camera.far },
          uFocus: { value: 5 },
          uAperture: { value: 0 },
          uExposure: { value: DAY.exposure },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          #include <packing>
          uniform sampler2D tColor, tDepth; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uAperture, uExposure, uTime;
          varying vec2 vUv;
          float zAt(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
          float coc(float z) { return min(uAperture * abs(z - uFocus) / max(z, 1e-3), 14.0); }
          vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
          float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec3 col = texture2D(tColor, vUv).rgb;
            float z0 = zAt(vUv);
            float c0 = coc(z0);
            if (uAperture > 0.01 && c0 > 0.6) {
              // gather on a golden-angle disc, rotated per pixel. Samples behind this pixel always count;
              // samples in front count only as far as their own blur reaches (so sharp things don't smear).
              vec3 acc = col; float wsum = 1.0;
              float rot = h(gl_FragCoord.xy) * 6.2832;
              for (int i = 1; i < 32; i++) {
                float fi = float(i);
                float r = sqrt(fi / 32.0) * c0;
                float a = fi * 2.39996 + rot;
                vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
                float zs = zAt(uv);
                float w = zs >= z0 * 0.98 ? 1.0 : smoothstep(r - 1.0, r + 1.0, coc(zs));
                vec3 sc = texture2D(tColor, uv).rgb;
                acc += sc / (1.0 + max(max(sc.r, sc.g), sc.b) * 0.15) * w; // tame single hot pixels
                wsum += w;
              }
              col = acc / wsum;
            }
            // a little bloom from the brightest highlights (sun on water, the sun)
            vec3 glow = vec3(0.0);
            for (int i = 0; i < 8; i++) {
              float a = float(i) * 0.785;
              vec2 o = vec2(cos(a), sin(a)) * uTexel * 9.0;
              vec2 o2 = vec2(cos(a + 0.39), sin(a + 0.39)) * uTexel * 23.0;
              glow += max(texture2D(tColor, vUv + o).rgb - 2.2, 0.0) + max(texture2D(tColor, vUv + o2).rgb - 2.2, 0.0) * 0.6;
            }
            col += glow * 0.05;
            col = aces(col * uExposure);
            // film: a gentle warm lift in the shadows, vignette, grain
            col = col * 0.97 + vec3(0.012, 0.01, 0.006);
            vec2 q = vUv - 0.5;
            col *= 1.0 - dot(q, q) * 0.28;
            col += (h(vUv * 1000.0 + fract(uTime) * 37.0) - 0.5) * 0.018;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    const postScene = new THREE.Scene();
    postScene.add(post);
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postU = (post.material as THREE.ShaderMaterial).uniforms;

    /* ------------------------------------------------------------------ */
    /* scroll → camera                                                     */
    /* ------------------------------------------------------------------ */
    let keys = { b: 1, c: 2, d: 3, e: 4, f: 5, g0: 4, g1: 5, vh: 1 };
    let W = 1;
    let H = 1;
    let POSES: Record<string, Pose> = {};
    let PRINTS: Pose[] = [];
    const buildPoses = () => {
      const aspect = W / H;
      const wide = window.innerWidth >= 768;
      const side = wide ? 0.13 : 0;
      const fovP = 32;
      const tanH = Math.tan(THREE.MathUtils.degToRad(fovP / 2));
      const card = wide ? Math.min(window.innerWidth * 0.36, 30 * 16 + 24) : 0;
      const room = W - card;
      const fill = wide ? Math.min(0.68 * room, W * 0.46) / W : 0.8;
      const elev = THREE.MathUtils.degToRad(70);
      let D = PW / (fill * 2 * tanH * aspect);
      D = Math.max(D, (PH * Math.sin(elev)) / (0.62 * 2 * tanH));
      const sx = wide ? (card + room / 2 - W / 2) / W : 0;
      const sy = wide ? 0 : -0.3;
      PRINTS = SHEETS.map((s) => ({
        pos: [s.x + 0.02, LIFT + Math.sin(elev) * D, s.z + Math.cos(elev) * D],
        look: [s.x, LIFT, s.z],
        fov: fovP,
        sx,
        sy,
        fd: D,
        ap: 7,
      }));
      POSES = {
        open: { pos: [-0.9, 2.5, 7.4], look: [0.2, -1.8, -30], fov: 40, sx: 0, sy: 0, fd: 9, ap: 1.4 },
        hero: { pos: [-0.45, 1.35, 3.0], look: [0.15, 0.05, -4], fov: 38, sx: side, sy: wide ? 0 : -0.12, fd: 3.3, ap: 2.6 },
        over: { pos: [0.08, 1.55, 1.25], look: [0.08, 0.05, 0.02], fov: 40, sx, sy, fd: 1.9, ap: 4 },
        sky: { pos: [0.2, 1.5, 2.8], look: [-6, 17.5, -46], fov: 50, sx: 0, sy: 0, fd: 50, ap: 0 },
        sky2: { pos: [0.5, 1.7, 2.4], look: [9, 19.5, -48], fov: 50, sx: 0, sy: 0, fd: 50, ap: 0 },
        sea1: { pos: [0.6, 2.1, 1.6], look: [30, 12, -110], fov: 46, sx: side * 0.6, sy: 0, fd: 60, ap: 0.6 },
        sea2: { pos: [1.0, 2.7, -2.5], look: [70, 2, -260], fov: 42, sx: side * 0.6, sy: 0, fd: 80, ap: 0.6 },
        end: { pos: [1.0, 1.45, 3.6], look: [-0.3, -0.1, -6], fov: 38, sx: side, sy: wide ? 0 : -0.14, fd: 4.2, ap: 2 },
      };
    };
    const measure = () => {
      const vh = window.innerHeight;
      const top = (id: string) => document.getElementById(id);
      const w = top("work");
      const p = top("process");
      const gg = top("bring");
      const f = top("contact");
      if (!w || !p || !gg || !f) return;
      keys = {
        vh,
        b: w.offsetTop,
        c: w.offsetTop + w.offsetHeight - vh,
        d: p.offsetTop + vh * 0.35,
        e: p.offsetTop + p.offsetHeight - vh,
        g0: gg.offsetTop,
        g1: gg.offsetTop + gg.offsetHeight - vh,
        f: f.offsetTop + f.offsetHeight - vh,
      };
    };

    const track = (): [number, Pose][] => {
      const { b, c, d, e, g0, g1, f, vh } = keys;
      const gs = g1 - g0;
      const P = POSES;
      const n = PRINTS.length;
      const prints: [number, Pose][] = [];
      PRINTS.forEach((pp, k) => {
        prints.push([b + ((c - b) * (k + 0.25)) / n, pp], [b + ((c - b) * (k + 0.75)) / n, pp]);
      });
      return [
        [0, P.open],
        [vh * 0.12, P.open],
        [b * 0.6, P.hero],
        [b - vh * 0.95, P.hero],
        [b - vh * 0.1, P.over],
        ...prints,
        [d, P.sky],
        [e, P.sky2],
        [g0 + gs * 0.35, P.sea1],
        [g1, P.sea2],
        [f - vh * 0.1, P.end],
        [f + vh, P.end],
      ];
    };
    const poseAt = (y: number): Pose => {
      const k = track();
      let i = 0;
      while (i < k.length - 2 && y > k[i + 1][0]) i++;
      const [y0, A] = k[i];
      const [y1, B] = k[i + 1];
      if (A === B) return A;
      const raw = clamp01((y - y0) / (y1 - y0 || 1));
      const t = reduce ? (raw < 0.5 ? 0 : 1) : ease(raw);
      return {
        pos: lerp3(A.pos, B.pos, t),
        look: lerp3(A.look, B.look, t),
        fov: lerp(A.fov, B.fov, t),
        sx: lerp(A.sx, B.sx, t),
        sy: lerp(A.sy, B.sy, t),
        fd: lerp(A.fd, B.fd, t),
        ap: lerp(A.ap, B.ap, t),
      };
    };

    const html = document.documentElement;
    const look = new THREE.Vector3();
    const tA = new THREE.Vector3();
    const tB = new THREE.Vector3();
    let lastSky = -1;
    const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40, sx: 0, sy: 0, fd: 5, ap: 0, init: false };
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    const onPointer = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    let lastT = 0;
    const intro = { t: reduce ? 1 : 0 };
    function apply(y: number, time: number) {
      const { b, c, d, e, f, g0, g1, vh } = keys;
      const target = poseAt(y);
      const dt = Math.min(0.05, Math.max(0, time - lastT));
      lastT = time;
      // the camera follows its mark on a soft spring, and leans a touch toward the cursor
      const k = reduce || !cam.init ? 1 : 1 - Math.exp(-dt * 7);
      cam.init = true;
      cam.pos.lerp(tA.set(...target.pos), k);
      cam.look.lerp(tB.set(...target.look), k);
      cam.fov = lerp(cam.fov, target.fov, k);
      cam.sx = lerp(cam.sx, target.sx, k);
      cam.sy = lerp(cam.sy, target.sy, k);
      cam.fd = lerp(cam.fd, target.fd, k);
      cam.ap = lerp(cam.ap, target.ap, k);
      const kp = reduce ? 0 : 1 - Math.exp(-dt * 2.5);
      ptr.sx = lerp(ptr.sx, ptr.x, kp);
      ptr.sy = lerp(ptr.sy, ptr.y, kp);
      const reading = smooth(b - vh * 0.4, b + vh * 0.1, y) * (1 - smooth(c + vh * 0.1, c + vh * 0.6, y));
      const breath = reduce ? 0 : 1 - reading;
      const reach = Math.min(1, cam.pos.distanceTo(cam.look) / 6);
      intro.t = Math.min(1, intro.t + dt / 3.2);
      const settle = 1 - ease(intro.t); // a slow descent onto the meadow
      camera.position.set(
        cam.pos.x + Math.sin(time * 0.21) * 0.05 * breath + ptr.sx * 0.12 * reach,
        cam.pos.y + Math.sin(time * 0.33) * 0.025 * breath - ptr.sy * 0.05 * reach + settle * 1.6,
        cam.pos.z + settle * 2.4,
      );
      look.copy(cam.look);
      camera.lookAt(look);
      camera.fov = cam.fov;
      camera.setViewOffset(W, H, -cam.sx * W, -cam.sy * H, W, H);
      camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      postU.uFocus.value = cam.fd;
      postU.uAperture.value = cam.ap * (H / 800);

      // the day turns gold as the bird flies on
      const dusk = reduce ? (y > g0 ? 1 : 0) : smooth(d + (e - d) * 0.35, f - vh * 0.3, y);
      U.uDusk.value = dusk;
      U.uSun.value.copy(SUN_DAY).lerp(SUN_DUSK, dusk).normalize();
      U.uSunCol.value.copy(DAY.sun).lerp(DUSK.sun, dusk);
      U.uSunI.value = lerp(DAY.sunI, DUSK.sunI, dusk);
      U.uAmb.value = lerp(DAY.amb, DUSK.amb, dusk);
      U.uZenith.value.copy(DAY.zenith).lerp(DUSK.zenith, dusk);
      U.uHorizon.value.copy(DAY.horizon).lerp(DUSK.horizon, dusk);
      U.uGround.value.copy(DAY.ground).lerp(DUSK.ground, dusk);
      U.uSea.value.copy(DAY.sea).lerp(DUSK.sea, dusk);
      postU.uExposure.value = lerp(DAY.exposure, DUSK.exposure, dusk);

      // the bird
      const skyT = clamp01((y - d) / (e - d || 1));
      const seaT = clamp01((y - e) / (g1 - e || 1));
      const route = (u: number, s: number) => (s > 0 ? spline(SEA, s) : spline(SKY, u));
      const p = route(skyT, seaT);
      const q = route(Math.min(1, skyT + 0.01), seaT > 0 ? Math.min(1, seaT + 0.01) : 0);
      const drift = reduce ? 0 : 1;
      tA.set(p[0] + Math.sin(time * 0.5) * 1.2 * drift, p[1] + Math.sin(time * 0.8) * 0.6 * drift, p[2]);
      tB.set(q[0], q[1], q[2]);
      if (seaT === 0 && skyT === 1) tB.set(p[0] + 1, p[1], p[2] - 0.5);
      bird.root.position.copy(tA);
      bird.root.lookAt(tB.x + Math.cos(time * 0.5) * 1.2 * drift, tB.y + Math.cos(time * 0.8) * 0.5 * drift, tB.z);
      bird.root.rotateZ(Math.sin(time * 0.5) * -0.25 * drift);
      bird.root.visible = y > d - vh * 1.2 && y < f - vh * 0.4;
      const glide = reduce ? 1 : smooth(0.3, 0.75, Math.sin(time * 0.45) * 0.5 + 0.5);
      flapBird(bird, time * 8.5, glide);
      flock.forEach(({ b: fb, ph, r }, i) => {
        const a = time * 0.06 + ph;
        fb.root.position.set(-60 + Math.cos(a) * r + i * 8, 12 + Math.sin(a * 2) * 2 + i, -230 + Math.sin(a) * r * 0.5);
        fb.root.lookAt(-60 + Math.cos(a + 0.05) * r + i * 8, 12, -230 + Math.sin(a + 0.05) * r * 0.5);
        flapBird(fb, time * 7 + ph * 3, smooth(0.2, 0.8, Math.sin(time * 0.3 + ph) * 0.5 + 0.5));
      });

      // the journey is written as you scroll: Layers reads this one number
      const skyW = clamp01((y - (d - vh * 0.15)) / (e - d + vh * 0.15 || 1));
      if (Math.abs(skyW - lastSky) > 1e-4) {
        lastSky = skyW;
        html.style.setProperty("--sky", skyW.toFixed(4));
      }

      const wi = Math.min(caseStudies.length - 1, Math.floor(clamp01((y - b) / (c - b || 1)) * caseStudies.length));
      // the print being read rises gently out of the grass and turns toward you
      const inWork = y > b - vh * 0.3 && y < c + vh * 0.4;
      sheets.forEach((sh, i) => {
        const goal = inWork && i === wi ? 1 : 0;
        sh.focus += (goal - sh.focus) * (reduce ? 1 : 1 - Math.exp(-dt * 4));
        const f2 = ease(sh.focus);
        sh.m.position.y = sh.y + (LIFT - 0.03) * f2;
        sh.m.rotation.set(0.2 * f2, sh.at.r * (1 - 0.55 * f2), 0);
        sh.sh.scale.setScalar(1 + 0.35 * f2);
        shadowM(sh.sh).opacity = 1 - 0.55 * f2;
      });
      const bi = Math.min(2, Math.floor(clamp01((y - g0) / (g1 - g0 || 1)) * 3));
      const s = y < b * 0.3 ? "open" : y < b - vh * 0.5 ? "hero" : y < c + vh * 0.5 ? "work" : y < e + vh * 0.35 ? "map" : y < f - vh * 0.6 ? "bring" : "valley";
      setJourney({ workIndex: wi, step: Math.min(4, Math.floor(skyW * 5)), section: s, bringIndex: bi });
    }

    let pr = Math.min(DPR, 1.25);
    const setRes = () => {
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H);
      rt.setSize(Math.round(W * pr), Math.round(H * pr));
      postU.uTexel.value.set(1 / (W * pr), 1 / (H * pr));
    };
    const resize = () => {
      W = el.clientWidth || 1;
      H = el.clientHeight || 1;
      setRes();
      camera.aspect = W / H;
      measure();
      buildPoses();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("resize", resize);
    document.fonts?.ready.then(() => sheets.forEach((s) => s.draw()));

    let raf = 0;
    let first = true;
    const clock = new THREE.Clock();
    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);
    let frames = 0;
    let acc = 0;
    let prev = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        prev = performance.now();
        return;
      }
      const now = performance.now();
      acc += now - prev;
      prev = now;
      if (++frames === 40) {
        const ms = acc / frames;
        const next = ms > 21 ? Math.max(1, pr - 0.15) : ms < 15 ? Math.min(DPR, pr + 0.1) : pr;
        if (Math.abs(next - pr) > 0.01) {
          pr = next;
          setRes();
        }
        frames = 0;
        acc = 0;
      }
      const time = reduce ? 0 : clock.getElapsedTime();
      U.uTime.value = time;
      postU.uTime.value = time;
      apply(window.scrollY, time);
      flutter(time);
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
      if (first) {
        first = false;
        setJourney({ ready: true });
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      rt.dispose();
      renderer.dispose();
      [scene, postScene].forEach((sc) =>
        sc.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const ms = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
          ms.forEach((mm) => {
            (mm as THREE.MeshBasicMaterial).map?.dispose();
            mm.dispose();
          });
        }),
      );
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      {/* one window onto the world, always the same size */}
      <div
        ref={host}
        aria-hidden="true"
        className={`pointer-events-none fixed z-0 overflow-hidden rounded-[1.25rem] bg-paper-deep transition-opacity duration-[1600ms] ease-[var(--ease-paper)] ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ top: "var(--frame-t)", right: "var(--edge)", bottom: "var(--frame-b)", left: "var(--edge)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[1] rounded-[1.25rem] shadow-[inset_0_0_0_1px_rgb(27_32_54/0.14)]"
        style={{ top: "var(--frame-t)", right: "var(--edge)", bottom: "var(--frame-b)", left: "var(--edge)" }}
      />
    </>
  );
}
