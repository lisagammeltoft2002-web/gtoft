"use client";

import { useEffect, useRef } from "react";
import { reducedMotion, shadow, sway } from "./wind";

/* White pen-and-ink lilies framing the page, drawn the way an engraver would:
   every petal, bud, leaf and stem is a real 3D surface that is projected and inked.
   - painter's order: the scene is cut into small facets and drawn back to front;
     each facet first erases what is behind it, so lines hide properly
   - contours appear wherever a surface turns away from us (the rolled-back lily tips)
   - fine strokes run along each petal and thicken into hatching where it is in shadow
   - freckles in the throat, long stamens with heavy anthers, three-seamed buds
   Drawn once into a canvas (and again on resize); the CSS drop-shadow lets the
   drawing cast a soft shadow on the green ground. */

type V = [number, number, number];
type P2 = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): V => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const deg = (d: number) => (d * Math.PI) / 180;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R0 = rng(23);
const rand = (a: number, b: number) => a + (b - a) * R0();

/* light from the upper left, a little in front */
const LIGHT = norm([-0.45, 0.65, 0.62]);
/* the drawings are a light sage green, quieter than the white text */
const ink = (a: number) => `rgba(112,146,88,${(a * 0.55).toFixed(3)})`;

/* ---------- frames ---------- */
type Frame = { X: V; Y: V; A: V; o: V; s: number };
function frame(o: V, F: V, spin = 0, s = 1): Frame {
  const A = norm(F);
  const up: V = Math.abs(A[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const X = norm(cross(up, A));
  const Y = cross(A, X);
  const c = Math.cos(spin), sn = Math.sin(spin);
  return { X: add(mul(X, c), mul(Y, sn)), Y: sub(mul(Y, c), mul(X, sn)), A, o, s };
}
const place = (f: Frame, p: V): V => add(f.o, mul(add(add(mul(f.X, p[0]), mul(f.Y, p[1])), mul(f.A, p[2])), f.s));

/* ---------- surfaces ---------- */
type Dot = { fu: number; fv: number; r: number };
type Surf = {
  P: V[][];
  nu: number;
  nv: number;
  closedV?: boolean;
  edgesV?: boolean;
  midrib?: number;
  seams?: number[];
  dots?: Map<number, Dot[]>;
  /* fine pen lines along the surface: across-position (0..1) and start/end along it (0..1) */
  lines?: { v: number; t0: number; t1: number; al: number }[];
  hatch: number;
  tint: number;
  ao?: boolean;
  under?: number;
  width: number;
  off: number; /* first row of this piece within the whole surface */
  N: number; /* rows in the whole surface */
  face: number[][];
  light: number[][];
  pr: P2[][];
};

function surf(P: V[][], o: Partial<Surf> & { hatch: number; tint: number }): Surf {
  const nu = P.length - 1, nv = P[0].length - 1;
  const s: Surf = { width: 1, ...o, P, nu, nv, off: 0, N: nu, face: [], light: [], pr: [] };
  for (let i = 0; i < nu; i++) {
    s.face.push([]);
    s.light.push([]);
    for (let j = 0; j < nv; j++) {
      const a = P[i][j], b = P[i + 1][j + 1], c = P[i][j + 1], d = P[i + 1][j];
      const n = cross(sub(b, a), sub(c, d));
      const fc = n[2] >= 0 ? 1 : -1;
      let L = clamp(dot(norm(fc > 0 ? n : mul(n, -1)), LIGHT), 0, 1);
      L = 0.22 + 0.78 * L;
      if (fc < 0) L *= s.under ?? 0.8;
      if (s.ao) L *= 0.5 + 0.5 * smooth(i / nu / 0.32);
      s.face[i].push(fc);
      s.light[i].push(L);
    }
  }
  return s;
}

/* one lily tepal: a ribbon that rises from the throat, flares and rolls back at the tip */
function tepal(f: Frame, phi: number, o: { L: number; W: number; th0: number; th1: number; cup: number; twist: number; base: number; back?: boolean }) {
  const nu = 30, nv = 12;
  const R: V = [Math.cos(phi), Math.sin(phi), 0], A: V = [0, 0, 1], Tn: V = [-Math.sin(phi), Math.cos(phi), 0];
  let sp: V = add(mul(R, o.base), [0, 0, o.back ? -1.5 : 0]);
  const phase = rand(0, 6);
  const P: V[][] = [];
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const th = o.th0 + (o.th1 - o.th0) * smooth(t / 0.75) + deg(58) * smooth((t - 0.56) / 0.44);
    const T = add(mul(R, Math.sin(th)), mul(A, Math.cos(th)));
    const N = add(mul(R, -Math.cos(th)), mul(A, Math.sin(th)));
    if (i > 0) sp = add(sp, mul(T, o.L / nu));
    const w = o.W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.6) * (1 - 0.35 * t ** 5) + o.W * 0.1 * (1 - t);
    const tw = o.twist * t * t;
    const lat = add(mul(Tn, Math.cos(tw)), mul(N, Math.sin(tw)));
    const nrm = sub(mul(N, Math.cos(tw)), mul(Tn, Math.sin(tw)));
    const row: V[] = [];
    for (let j = 0; j <= nv; j++) {
      const v = -1 + (2 * j) / nv;
      const h =
        o.cup * w * v * v * (0.25 + 0.75 * t) * 0.34 +
        w * 0.045 * Math.sin(t * 13 + phase + v * 2.5) * Math.pow(Math.abs(v), 3) * t -
        0.04 * w * Math.exp((-v * v) / 0.015);
      row.push(place(f, add(sp, add(mul(lat, (v * w) / 2), mul(nrm, h)))));
    }
    P.push(row);
  }
  const lines: { v: number; t0: number; t1: number; al: number }[] = [];
  const nl = o.back ? 11 : 15;
  for (let k = 0; k < nl; k++) {
    const v = 0.08 + (0.84 * (k + rand(0.2, 0.8))) / nl;
    if (Math.abs(v - 0.5) < 0.05) continue;
    const edge = Math.abs(v - 0.5) * 2;
    lines.push({ v, t0: rand(0.12, 0.2), t1: rand(0.45, 0.78) * (1 - 0.2 * edge), al: rand(0.62, 0.82) });
  }
  /* a few strokes on the rolled-back tip */
  for (let k = 0; k < 5; k++) lines.push({ v: rand(0.2, 0.8), t0: rand(0.74, 0.8), t1: rand(0.88, 0.95), al: 0.5 });
  let dots: Map<number, Dot[]> | undefined;
  {
    dots = new Map();
    for (let k = 0; k < (o.back ? 10 : 30); k++) {
      const t = rand(0.06, 0.46), v = rand(-0.6, 0.6) * (1 - t);
      const u = t * nu, q = ((v + 1) / 2) * nv;
      const i = Math.floor(u), j = Math.floor(q);
      const key = i * 1000 + j;
      if (!dots.has(key)) dots.set(key, []);
      dots.get(key)!.push({ fu: u - i, fv: q - j, r: rand(0.5, 1.1) });
    }
  }
  return surf(P, { edgesV: true, midrib: nv / 2, hatch: 1, tint: 1, ao: true, under: 0.72, dots, lines });
}

/* a bud: a spindle with three seams, slightly bent */
function bud(f: Frame, o: { H: number; R: number; bend: number }) {
  const nu = 28, nv = 36;
  const P: V[][] = [];
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const r = Math.max(o.R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.74)), 0.68), 3 * (1 - t));
    const row: V[] = [];
    for (let j = 0; j <= nv; j++) {
      const ph = (-2 * Math.PI * j) / nv;
      const rr = r * (1 + 0.07 * Math.cos(3 * ph));
      row.push(place(f, [Math.cos(ph) * rr + o.bend * o.H * t * t, Math.sin(ph) * rr, o.H * t]));
    }
    P.push(row);
  }
  const lines = [2, 4, 8, 10, 14, 16, 20, 22, 26, 28, 32, 34].map((j) => ({ v: j / nv, t0: rand(0.05, 0.15), t1: rand(0.55, 0.85), al: 0.4 }));
  return surf(P, { closedV: true, seams: [6, 18, 30], hatch: 1.05, tint: 0.9, lines });
}

/* a tube along a quadratic curve: stems and flower stalks */
function tube(a: V, c: V, b: V, r0: number, r1: number) {
  const nu = 40, nv = 10;
  const at = (t: number): V => add(add(mul(a, (1 - t) ** 2), mul(c, 2 * (1 - t) * t)), mul(b, t * t));
  const tan = (t: number): V => norm(add(mul(sub(c, a), 2 * (1 - t)), mul(sub(b, c), 2 * t)));
  const P: V[][] = [];
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const T = tan(t), p = at(t);
    const e1 = norm(cross(T, [0, 0, 1]));
    const e2 = cross(T, e1);
    const r = r0 + (r1 - r0) * t;
    const row: V[] = [];
    for (let j = 0; j <= nv; j++) {
      const ph = (-2 * Math.PI * j) / nv;
      row.push(add(p, add(mul(e1, Math.cos(ph) * r), mul(e2, Math.sin(ph) * r))));
    }
    P.push(row);
  }
  return { s: surf(P, { closedV: true, hatch: 0.85, tint: 0.7, width: 0.95 }), at, tan };
}

/* a lily leaf: long, pointed, folded along the midrib, twisting as it arches */
function leaf(p0: V, up: V, side: number, yaw: number, o: { L: number; W: number; a0: number; a1: number; tw0: number; tw1: number }) {
  const nu = 26, nv = 8;
  const U = norm(up);
  const S0 = mul(norm(cross(U, [0, 0, 1])), side);
  const S = norm(add(mul(S0, Math.cos(yaw)), mul(cross(U, S0), Math.sin(yaw))));
  const Out = cross(S, U);
  let sp = p0;
  const P: V[][] = [];
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const a = o.a0 + (o.a1 - o.a0) * Math.pow(t, 1.3);
    const T = add(mul(U, Math.cos(a)), mul(S, Math.sin(a)));
    const Pn = add(mul(U, -Math.sin(a)), mul(S, Math.cos(a)));
    if (i > 0) sp = add(sp, mul(T, o.L / nu));
    const tw = o.tw0 + (o.tw1 - o.tw0) * t;
    const lat = add(mul(Pn, Math.cos(tw)), mul(Out, Math.sin(tw)));
    const nrm = cross(T, lat);
    const w = Math.max(o.W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.85) * (1 - 0.25 * t), 1.5 * (1 - t));
    const row: V[] = [];
    for (let j = 0; j <= nv; j++) {
      const v = -1 + (2 * j) / nv;
      row.push(add(sp, add(mul(lat, (v * w) / 2), mul(nrm, 0.24 * w * Math.abs(v)))));
    }
    P.push(row);
  }
  const lines = [0.18, 0.3, 0.38, 0.62, 0.7, 0.82].map((v) => ({ v, t0: rand(0.04, 0.12), t1: rand(0.6, 0.85), al: 0.4 }));
  return surf(P, { edgesV: true, midrib: nv / 2, hatch: 1.15, tint: 0.75, width: 0.95, lines });
}

/* ---------- scene items ---------- */
type Seg = { kind: "seg"; z: number; a: V; b: V; w: number; al: number };
type Anther = { kind: "anther"; z: number; p: V; from: V; size: number };
type Stigma = { kind: "stigma"; z: number; p: V; size: number };
type Quad = { kind: "quad"; z: number; s: Surf };
type Item = Seg | Anther | Stigma | Quad;
type Scene = { items: Item[]; surfs: Surf[]; minX: number; maxX: number; maxY: number; minY: number };

/* each surface is one drawing unit, ordered by its average depth */
function quads(s: Surf, sc: Scene) {
  sc.surfs.push(s);
  let z = 0, n = 0;
  for (const row of s.P)
    for (const q of row) {
      z += q[2];
      n++;
    }
  sc.items.push({ kind: "quad", z: z / n, s });
}

function polyline(pts: V[], w: number, al: number, sc: Scene, lift = 0) {
  for (let k = 0; k < pts.length - 1; k++) sc.items.push({ kind: "seg", z: (pts[k][2] + pts[k + 1][2]) / 2 + lift, a: pts[k], b: pts[k + 1], w, al });
}

/* an open lily (open ≈ 118°) or a trumpet seen from the side (open ≈ 96°) */
function lily(f: Frame, open: number, sc: Scene) {
  const turn = rand(0, 60);
  for (let k = 0; k < 3; k++) {
    quads(
      tepal(f, deg(turn + 60 + k * 120 + rand(-8, 8)), {
        L: 94 * rand(0.94, 1.04), W: 44, th0: deg(10), th1: deg(open - 25 + rand(-6, 6)), cup: 0.8, twist: rand(-0.1, 0.1), base: 3, back: true,
      }),
      sc,
    );
  }
  for (let k = 0; k < 3; k++) {
    quads(
      tepal(f, deg(turn + k * 120 + rand(-8, 8)), {
        L: 102 * rand(0.95, 1.04), W: 62, th0: deg(13), th1: deg(open - 18 + rand(-6, 6)), cup: 1.0, twist: rand(-0.1, 0.1), base: 2,
      }),
      sc,
    );
  }
  /* stamens */
  const reach = 74 * Math.pow(open / 118, 0.4);
  for (let k = 0; k < 6; k++) {
    const a = deg(turn + 30 + k * 60 + rand(-14, 14));
    const spread = deg(rand(12, 22));
    const Ls = reach * rand(0.88, 1.02);
    const pts: V[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(place(f, [Math.cos(a) * Math.sin(spread) * Ls * Math.pow(t, 1.5), Math.sin(a) * Math.sin(spread) * Ls * Math.pow(t, 1.5) - 4 * t * t, Ls * Math.cos(spread) * t + 3]));
    }
    polyline(pts, 0.75, 0.9, sc, 60 * f.s);
    const p = pts[pts.length - 1];
    sc.items.push({ kind: "anther", z: p[2] + 60 * f.s + 1, p, from: pts[pts.length - 2], size: f.s });
  }
  /* pistil */
  const pts: V[] = [];
  const bend = rand(-8, 8);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(place(f, [bend * t * t, -5 * t * t, (reach + 14) * t + 3]));
  }
  polyline(pts, 0.95, 0.9, sc, 60 * f.s);
  const tip = pts[pts.length - 1];
  sc.items.push({ kind: "stigma", z: tip[2] + 60 * f.s + 1, p: tip, size: f.s });
}

/* ---------- plants ---------- */
type Head = { kind: "open" | "side" | "bud"; pos: V; F: V; spin?: number; s: number; from: number };
type Plant = { a: V; c: V; b: V; leaves: number; leafL: number; heads: Head[]; r?: number };

function plant(p: Plant, sc: Scene) {
  const r = p.r ?? 4.4;
  const stem = tube(p.a, p.c, p.b, r, r * 0.72);
  quads(stem.s, sc);
  for (let li = 0; li < p.leaves; li++) {
    const t = 0.42 + (li * 0.45) / p.leaves + rand(-0.03, 0.03);
    const a0 = rand(0.22, 0.42);
    quads(
      leaf(stem.at(t), stem.tan(t), li % 2 ? 1 : -1, rand(-0.8, 0.8), {
        L: p.leafL * rand(0.82, 1.1) * (1 - 0.35 * t), W: rand(24, 32) * (1 - 0.25 * t), a0, a1: a0 + rand(0.5, 1.25), tw0: rand(-0.4, 0.4), tw1: rand(-1.1, 1.1),
      }),
      sc,
    );
  }
  for (const h of p.heads) {
    const st = stem.at(h.from);
    const end = h.pos;
    /* stalks arch up and out of the stem instead of running straight */
    const d = Math.hypot(end[0] - st[0], end[1] - st[1]);
    const ctrl: V = [st[0] * 0.55 + end[0] * 0.45, Math.max(st[1], end[1]) + d * 0.22, (st[2] + end[2]) / 2];
    quads(tube(st, ctrl, end, r * 0.62, r * 0.5).s, sc);
    const f = frame(h.pos, h.F, h.spin ?? 0, h.s);
    if (h.kind === "bud") quads(bud(f, { H: 112, R: 17, bend: rand(-0.05, 0.05) }), sc);
    else lily(f, 118, sc);
  }
}

/* hand-placed corner compositions on a 1440 x 900 desktop canvas (y up from the bottom).
   Flowers are big and allowed to run off the edges; the centre stays empty for text. */
type Cluster = { plants: Plant[]; anchor: "top" | "bottom" };
const TOP_LEFT: Cluster = {
  anchor: "top",
  plants: [
    {
      a: [-160, 1020, 0], c: [10, 960, 0], b: [130, 850, 0], leaves: 2, leafL: 200,
      heads: [
        { kind: "bud", pos: [400, 880, -30], F: [0.9, -0.35, 0.2], s: 1.6, from: 0.78 },
        { kind: "open", pos: [400, 700, -15], F: [0.2, -0.3, 0.93], spin: 0.9, s: 1.7, from: 0.92 },
        { kind: "open", pos: [140, 790, 30], F: [0.15, -0.4, 0.9], spin: 0.1, s: 2.8, from: 1 },
      ],
    },
  ],
};
const BOTTOM_LEFT: Cluster = {
  anchor: "bottom",
  plants: [
    {
      a: [100, -320, 0], c: [115, 0, 0], b: [175, 170, 0], leaves: 3, leafL: 230,
      heads: [
        { kind: "bud", pos: [370, 300, -30], F: [0.4, 1, 0.1], s: 1.7, from: 0.85 },
        { kind: "open", pos: [420, 70, -15], F: [0.25, 0.35, 0.9], spin: 0.5, s: 1.8, from: 0.72 },
        { kind: "open", pos: [185, 210, 30], F: [0.22, 0.45, 0.86], spin: 0.3, s: 2.9, from: 1 },
      ],
    },
  ],
};
const BOTTOM_RIGHT: Cluster = {
  anchor: "bottom",
  plants: [
    {
      a: [1350, -320, 0], c: [1335, 0, 0], b: [1260, 200, 0], leaves: 3, leafL: 230,
      heads: [
        { kind: "bud", pos: [1060, 350, -30], F: [-0.4, 1, 0.1], s: 1.7, from: 0.85 },
        { kind: "open", pos: [1020, 90, -15], F: [-0.2, 0.35, 0.91], spin: -0.2, s: 1.8, from: 0.72 },
        { kind: "open", pos: [1250, 240, 30], F: [-0.22, 0.45, 0.86], spin: -0.4, s: 2.9, from: 1 },
      ],
    },
  ],
};
const LAB: Cluster = {
  anchor: "bottom",
  plants: [
    { a: [250, -300, 0], c: [250, 0, 0], b: [250, 300, 0], leaves: 0, leafL: 0, heads: [{ kind: "open", pos: [250, 560, 0], F: [0.22, 0.45, 0.86], spin: 0.3, s: 2.2, from: 1 }] },
    { a: [700, -300, 0], c: [700, 0, 0], b: [700, 300, 0], leaves: 0, leafL: 0, heads: [{ kind: "open", pos: [700, 560, 0], F: [0.15, -0.4, 0.9], spin: 0.1, s: 2.2, from: 1 }] },
    { a: [1150, -300, 0], c: [1150, 0, 0], b: [1150, 300, 0], leaves: 0, leafL: 0, heads: [{ kind: "open", pos: [1150, 560, 0], F: [-0.22, 0.45, 0.86], spin: -0.4, s: 2.2, from: 1 }] },
    { a: [450, -300, 0], c: [450, 0, 0], b: [450, 120, 0], leaves: 2, leafL: 220, heads: [{ kind: "bud", pos: [450, 140, 0], F: [0.2, 1, 0.15], s: 1.8, from: 1 }] },
  ],
};
const CLUSTERS = [TOP_LEFT, BOTTOM_LEFT, BOTTOM_RIGHT];

const scenes = new Map<Cluster, Scene>();
function scene(c: Cluster) {
  let sc = scenes.get(c);
  if (!sc) {
    sc = { items: [], surfs: [], minX: Infinity, maxX: -Infinity, maxY: -Infinity, minY: Infinity };
    for (const p of c.plants) plant(p, sc);
    sc.items.sort((a, b) => a.z - b.z);
    /* the real drawn extent, so placement never cuts a flower */
    const grow = (q: V) => {
      sc!.minX = Math.min(sc!.minX, q[0]);
      sc!.maxX = Math.max(sc!.maxX, q[0]);
      sc!.maxY = Math.max(sc!.maxY, q[1]);
      sc!.minY = Math.min(sc!.minY, q[1]);
    };
    for (const sf of sc.surfs) for (const row of sf.P) for (const q of row) grow(q);
    for (const it of sc.items) if (it.kind !== "quad") grow("p" in it ? it.p : it.b);
    scenes.set(c, sc);
  }
  return sc;
}

/* ---------- inking ---------- */
function drawCluster(ctx: CanvasRenderingContext2D, c: Cluster, ox: number, oy: number, k: number, dpr: number) {
  const sc = scene(c);
  const pj = (p: V): P2 => [(ox + p[0] * k) * dpr, (oy - p[1] * k) * dpr];
  for (const s of sc.surfs) s.pr = s.P.map((row) => row.map(pj));
  const lw = dpr * 1.1;
  const PEN = dpr;
  const grow = 0.8 * dpr;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const line = (a: P2, b: P2, w: number, al: number) => {
    ctx.strokeStyle = ink(al);
    ctx.lineWidth = PEN; /* one line weight everywhere, like the frame rules */
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  for (const it of sc.items) {
    const fade = 1;
    ctx.globalAlpha = fade;
    if (it.kind === "seg") {
      line(pj(it.a), pj(it.b), lw * it.w, it.al);
      continue;
    }
    if (it.kind === "anther") {
      const p = pj(it.p), q = pj(it.from);
      const ang = Math.atan2(p[1] - q[1], p[0] - q[0]) + deg((Math.abs(it.p[0] * 7.3 + it.p[1] * 3.1) % 50) - 25);
      const ra = 6 * k * it.size * dpr, rb = 1.9 * k * it.size * dpr;
      ctx.fillStyle = ink(0.9);
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], ra, rb, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,50,20,0.55)";
      ctx.lineWidth = PEN; /* one line weight everywhere, like the frame rules */
      ctx.beginPath();
      ctx.moveTo(p[0] - Math.cos(ang) * ra * 0.75, p[1] - Math.sin(ang) * ra * 0.75);
      ctx.lineTo(p[0] + Math.cos(ang) * ra * 0.75, p[1] + Math.sin(ang) * ra * 0.75);
      ctx.stroke();
      continue;
    }
    if (it.kind === "stigma") {
      const p = pj(it.p);
      const r = 2.2 * k * it.size * dpr;
      ctx.strokeStyle = ink(0.95);
      ctx.lineWidth = PEN; /* one line weight everywhere, like the frame rules */
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.arc(p[0] + Math.cos(deg(a * 120 - 90)) * r, p[1] + Math.sin(deg(a * 120 - 90)) * r, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      continue;
    }

    const s = it.s;
    const pr = s.pr;
    /* 1. hide everything behind this surface */
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    for (let i = 0; i < s.nu; i++)
      for (let j = 0; j < s.nv; j++) {
        ctx.moveTo(pr[i][j][0], pr[i][j][1]);
        ctx.lineTo(pr[i + 1][j][0], pr[i + 1][j][1]);
        ctx.lineTo(pr[i + 1][j + 1][0], pr[i + 1][j + 1][1]);
        ctx.lineTo(pr[i][j + 1][0], pr[i][j + 1][1]);
        ctx.closePath();
      }
    ctx.fill("nonzero");
    ctx.lineWidth = grow * 0.9;
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    /* 2. ink it with continuous lines */
    const stroke = (pts: P2[], w: number, al: number) => {
      if (pts.length < 2) return;
      ctx.strokeStyle = ink(al);
      ctx.lineWidth = PEN; /* one line weight everywhere, like the frame rules */
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let q = 1; q < pts.length - 1; q++) {
        const mx = (pts[q][0] + pts[q + 1][0]) / 2, my = (pts[q][1] + pts[q + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[q][0], pts[q][1], mx, my);
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.stroke();
    };
    const col = (j: number, i0: number, i1: number) => {
      const out: P2[] = [];
      for (let i = i0; i <= i1; i++) out.push(pr[i][j]);
      return out;
    };
    const cw = lw * 1.45 * s.width;
    /* side outlines */
    if (s.edgesV) {
      const i0 = s.dots ? Math.round(s.nu * 0.1) : 0;
      stroke(col(0, i0, s.nu), cw, 0.95);
      stroke(col(s.nv, i0, s.nu), cw, 0.95);
    }
    /* fold contours: where the surface turns from facing us to facing away */
    const fc = s.face;
    const wrap = (j: number) => (s.closedV ? (j + s.nv) % s.nv : j);
    ctx.strokeStyle = ink(0.95);
    ctx.lineWidth = PEN; /* one line weight everywhere, like the frame rules */
    ctx.beginPath();
    if (!s.edgesV) {
      for (let i = 0; i < s.nu; i++)
        for (let j = 0; j < s.nv; j++) {
          const jr = wrap(j + 1);
          if (jr < s.nv && jr >= 0 && (s.closedV || j + 1 < s.nv) && fc[i][j] !== fc[i][jr]) {
            ctx.moveTo(pr[i][j + 1][0], pr[i][j + 1][1]);
            ctx.lineTo(pr[i + 1][j + 1][0], pr[i + 1][j + 1][1]);
          }
        }
      ctx.stroke();
    } else {
      /* where a tip rolls over: one smooth line across the petal, through the row where
         each column flips from front to back, joining the outline on both sides */
      const fold: P2[] = [];
      for (let j = 0; j <= s.nv; j++) {
        const jj = Math.min(j, s.nv - 1);
        let hit = -1;
        for (let i = Math.round(s.nu * 0.5); i < s.nu - 1; i++) if (fc[i][jj] !== fc[i + 1][jj]) {
          hit = i + 1;
          break;
        }
        if (hit < 0) {
          fold.length = 0;
          break;
        }
        fold.push(pr[hit][j]);
      }
      if (fold.length > 2) stroke(fold, cw, 0.95);
    }
    /* midrib and fine veins on the side facing us */
    const facing = (i: number, j: number) => fc[Math.min(i, s.nu - 1)][Math.min(j, s.nv - 1)] > 0;
    const run = (j: number, reach: number, w: number, al: number) => {
      const end = Math.min(s.nu, Math.round(s.N * reach) - s.off);
      if (end < 1) return;
      let seg: P2[] = [];
      for (let i = 0; i <= end; i++) {
        if (facing(i, j)) seg.push(pr[i][j]);
        else {
          stroke(seg, w, al);
          seg = [];
        }
      }
      stroke(seg, w, al);
    };
    if (s.midrib !== undefined) run(s.midrib, s.dots ? 0.66 : 0.88, lw * 0.85, 0.85);
    /* fine pen lines; they fade over their last third, like a pen lifting */
    if (s.lines) {
      const at = (i: number, v: number): P2 => {
        const c = v * s.nv, j0 = Math.min(s.nv - 1, Math.floor(c));
        return mix(pr[i][j0], pr[i][j0 + 1], c - j0);
      };
      for (const l of s.lines) {
        const a = Math.max(0, Math.round(s.N * l.t0) - s.off), b = Math.min(s.nu, Math.round(s.N * l.t1) - s.off);
        if (b - a < 1) continue;
        const fadeFrom = Math.round(s.N * (l.t0 + (l.t1 - l.t0) * 0.62)) - s.off;
        const solid: P2[] = [], soft: P2[] = [];
        for (let i = a; i <= b; i++) {
          if (i <= fadeFrom) solid.push(at(i, l.v));
          if (i >= fadeFrom) soft.push(at(i, l.v));
        }
        /* on a petal seen edge-on the line gets squashed into a tick; leave those out */
        let len = 0;
        for (let q = 1; q < solid.length; q++) len += Math.hypot(solid[q][0] - solid[q - 1][0], solid[q][1] - solid[q - 1][1]);
        if (len < 14 * lw) continue;
        stroke(solid, lw * 0.55, l.al);
        stroke(soft, lw * 0.45, l.al * 0.5);
      }
    }
    if (s.seams) for (const j of s.seams) run(j, 0.97, lw * 0.9, 0.85);
    /* freckles in the throat */
    if (s.dots) {
      ctx.fillStyle = ink(0.92);
      for (const [key, list] of s.dots) {
        const i = Math.floor(key / 1000) - s.off, j = key % 1000;
        if (i < 0 || i >= s.nu || !facing(i, j)) continue;
        for (const d of list) {
          const p = mix(mix(pr[i][j], pr[i][j + 1], d.fv), mix(pr[i + 1][j], pr[i + 1][j + 1], d.fv), d.fu);
          ctx.beginPath();
          ctx.arc(p[0], p[1], d.r * lw * 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/* a tile of clumpy grain in CSS pixels: mostly light nibbles, some deep pits */
let noiseTile: HTMLCanvasElement | null = null;
function noise() {
  if (noiseTile) return noiseTile;
  const n = 256;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  const img = g.createImageData(n, n);
  const R = rng(91);
  const cell = new Float32Array(n * n).map(() => R());
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      /* blend each pixel with its neighbours so grains clump to 1-3px, like sand */
      const at = (dx: number, dy: number) => cell[((y + dy + n) % n) * n + ((x + dx + n) % n)];
      const v = 0.5 * at(0, 0) + 0.125 * (at(1, 0) + at(-1, 0) + at(0, 1) + at(0, -1));
      const a = v > 0.64 ? 0.75 : v > 0.52 ? 0.32 : v < 0.3 ? 0 : 0.08;
      img.data[(y * n + x) * 4 + 3] = Math.round(a * 255);
    }
  g.putImageData(img, 0, 0);
  return (noiseTile = c);
}

/* the solid outline of a cluster, for its cast shadow */
function drawSilhouette(ctx: CanvasRenderingContext2D, c: Cluster, ox: number, oy: number, k: number, dpr: number) {
  const pj = (p: V): P2 => [(ox + p[0] * k) * dpr, (oy - p[1] * k) * dpr];
  ctx.fillStyle = "#000";
  ctx.beginPath();
  for (const s of scene(c).surfs) {
    const pr = s.P.map((row) => row.map(pj));
    for (let i = 0; i < s.nu; i++)
      for (let j = 0; j < s.nv; j++) {
        ctx.moveTo(pr[i][j][0], pr[i][j][1]);
        ctx.lineTo(pr[i + 1][j][0], pr[i + 1][j][1]);
        ctx.lineTo(pr[i + 1][j + 1][0], pr[i + 1][j + 1][1]);
        ctx.lineTo(pr[i][j + 1][0], pr[i][j + 1][1]);
        ctx.closePath();
      }
  }
  ctx.fill("nonzero");
}

const SH = 0.25; /* the shadow map is a quarter of the screen resolution; it is soft anyway */

type Layer = { ink: HTMLCanvasElement; sil: HTMLCanvasElement; bx: number; by: number; px: number; py: number; phase: number };

export function Lilies() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const shadowCanvas = document.createElement("canvas");
    const sctx = shadowCanvas.getContext("2d")!;
    shadow.canvas = shadowCanvas;
    let layers: Layer[] = [];
    let W = 0, H = 0, k = 1, dpr = 1;

    /* draw each cluster once into its own image (ink + silhouette); frames only move them */
    const build = () => {
      const vw = canvas.clientWidth || window.innerWidth, vh = canvas.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.round(vw * dpr);
      H = canvas.height = Math.round(vh * dpr);
      shadowCanvas.width = Math.ceil(W * SH);
      shadowCanvas.height = Math.ceil(H * SH);
      /* desktop: the 1440 x 900 design scales with the width; corners stay anchored */
      k = vw / 1440;
      const grain = ctx.createPattern(noise(), "repeat");
      const list = location.search.includes("lab") ? [LAB] : CLUSTERS;
      layers = list.map((c, n) => {
        const ox = 0, oy = c.anchor === "top" ? 900 * k : vh;
        const sc = scene(c);
        const m = 60 * dpr;
        const bx = Math.max(-m, Math.floor((ox + sc.minX * k) * dpr - m));
        const by = Math.max(-m, Math.floor((oy - sc.maxY * k) * dpr - m));
        const bw = Math.min(W + m, Math.ceil((ox + sc.maxX * k) * dpr + m)) - bx;
        const bh = Math.min(H + m, Math.ceil((oy - sc.minY * k) * dpr + m)) - by;

        const ink = document.createElement("canvas");
        ink.width = bw;
        ink.height = bh;
        const ic = ink.getContext("2d")!;
        ic.setTransform(1, 0, 0, 1, -bx, -by);
        drawCluster(ic, c, ox, oy, k, dpr);
        /* sand grain, like the background: speckle eats into the ink so the lines look printed */
        if (grain) {
          ic.setTransform(1, 0, 0, 1, 0, 0);
          ic.globalAlpha = 1;
          ic.globalCompositeOperation = "destination-out";
          grain.setTransform(new DOMMatrix().scale(dpr));
          ic.fillStyle = grain;
          ic.fillRect(0, 0, bw, bh);
          ic.globalCompositeOperation = "source-over";
        }

        const sil = document.createElement("canvas");
        sil.width = Math.ceil(bw * SH);
        sil.height = Math.ceil(bh * SH);
        const sc2 = sil.getContext("2d")!;
        sc2.setTransform(SH, 0, 0, SH, -bx * SH, -by * SH);
        drawSilhouette(sc2, c, ox, oy, k, dpr);

        /* it sways around where its stem comes in from the edge of the screen */
        const a = c.plants[0].a;
        return { ink, sil, bx, by, px: (ox + a[0] * k) * dpr, py: (oy - a[1] * k) * dpr, phase: n * 1.9 };
      });
    };

    const frame = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
      sctx.filter = `blur(${(3 * k).toFixed(1)}px)`;
      for (const L of layers) {
        const ang = sway(t, L.phase);
        /* mirrored: the full flower corners sit on the right, leaving the left for the text people read first */
        ctx.setTransform(-1, 0, 0, 1, W, 0);
        ctx.translate(L.px, L.py);
        ctx.rotate(ang);
        ctx.translate(-L.px, -L.py);
        ctx.drawImage(L.ink, L.bx, L.by);

        /* the shadow on the ground: same sway, a little larger and shifted down-left, as if
           the sun stands high behind the right shoulder */
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.translate(-70 * k * dpr * SH, 46 * k * dpr * SH);
        sctx.scale(SH, SH);
        sctx.transform(-1, 0, 0, 1, W, 0);
        sctx.translate(L.px, L.py);
        sctx.rotate(ang * 1.25);
        sctx.scale(1.12, 1.12);
        sctx.translate(-L.px, -L.py);
        sctx.drawImage(L.sil, L.bx, L.by, L.sil.width / SH, L.sil.height / SH);
      }
      sctx.filter = "none";
    };

    const still = reducedMotion();
    const start = performance.now();
    let raf = 0;
    const loop = () => {
      frame(still ? 12 : 12 + (performance.now() - start) / 1000);
      if (!still) raf = requestAnimationFrame(loop);
    };
    build();
    loop();
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        build();
        if (still) loop();
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      window.removeEventListener("resize", onResize);
      if (shadow.canvas === shadowCanvas) shadow.canvas = null;
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full" />;
}
