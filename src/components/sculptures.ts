/* Lisa's hobbies as 3D dot sculptures that build themselves, live, from start to finished:
     pottery      a puck of clay on the wheel grows up into a vase
     crochet      a hook works round after round of a beanie; the ball of yarn shrinks
     painting     a brush paints a sunflower on the canvas, stroke by stroke
     sewing       the dress is sewn onto the dress form from the shoulders down
     rug tufting  the tufting gun fills in the rug on its frame, row by row
   Each hobby has the same number of dots. update(t) places every dot for build progress
   t (0 → 1) and says how visible it is, so parts appear where they are made.
   Units: about ±10, y up, z toward you, turning around the y axis. */

export type Build = {
  name: string;
  seconds: number; // how long the build takes
  view: number; // how far we look down onto it (radians)
  spin: boolean; // turns all the way round; otherwise it rocks gently, facing you
  update: (t: number, pos: Float32Array, show: Float32Array) => void;
};

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);

/* ------------------------------------------------------------------ helpers */

/* a smooth curve through points (Catmull-Rom), sampled finely */
function smooth(pts: number[][], per = 24) {
  const out: number[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push(
        p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)),
      );
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* pick an index with probability proportional to its weight */
function picker(weights: number[]) {
  const cum: number[] = [];
  let s = 0;
  for (const w of weights) cum.push((s += w));
  return () => {
    const r = Math.random() * s;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
}

/* two directions square to u (and to each other) */
function frame(u: number[]) {
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let p = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
  const pl = Math.hypot(...p);
  p = p.map((v) => v / pl);
  const q = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];
  return [p, q];
}

/* fixed points: n dots from a generator */
type Add = (x: number, y: number, z: number) => void;
function points(n: number, gen: (add: Add, n: number) => void) {
  const pts: number[] = [];
  gen((x, y, z) => pts.push(x, y, z), n);
  while (pts.length < n * 3) {
    const k = ((Math.random() * (pts.length / 3)) | 0) * 3;
    pts.push(pts[k], pts[k + 1], pts[k + 2]);
  }
  return new Float32Array(pts.slice(0, n * 3));
}

/* points around a tube that follows a path */
function tube(add: Add, path: number[][], radius: number, n: number) {
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]));
  const pick = picker(lens);
  for (let k = 0; k < n; k++) {
    const i = pick(), t = Math.random();
    const a = path[i], b = path[i + 1];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d) || 1;
    const [p, q] = frame(d.map((v) => v / len));
    const ang = rand(0, TAU), r = radius * (0.85 + 0.15 * Math.random());
    add(
      a[0] + d[0] * t + (p[0] * Math.cos(ang) + q[0] * Math.sin(ang)) * r,
      a[1] + d[1] * t + (p[1] * Math.cos(ang) + q[1] * Math.sin(ang)) * r,
      a[2] + d[2] * t + (p[2] * Math.cos(ang) + q[2] * Math.sin(ang)) * r,
    );
  }
}

/* a surface of revolution: profile of [y, rx, rz] (an oval in plan) */
function lathe(add: Add, prof: number[][], n: number) {
  const P = smooth(prof);
  const pick = picker(P.slice(1).map((p, i) => Math.hypot(p[0] - P[i][0], p[1] - P[i][1]) * ((p[1] + P[i][1] + p[2] + P[i][2]) / 4 + 0.25)));
  for (let k = 0; k < n; k++) {
    const i = pick(), t = Math.random(), a = rand(0, TAU);
    add(lerp(P[i][1], P[i + 1][1], t) * Math.cos(a), lerp(P[i][0], P[i + 1][0], t), lerp(P[i][2], P[i + 1][2], t) * Math.sin(a));
  }
}

/* where along a round lathe profile [y, r] share u of its surface lies: returns [y, r] */
function profileMap(prof: number[][]) {
  const P = smooth(prof);
  const cum: number[] = [];
  let s = 0;
  P.slice(1).forEach((p, i) => cum.push((s += Math.hypot(p[0] - P[i][0], p[1] - P[i][1]) * ((p[1] + P[i][1]) / 2 + 0.25))));
  return (u: number) => {
    const target = u * s;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const before = lo ? cum[lo - 1] : 0, f = (target - before) / (cum[lo] - before || 1);
    return [lerp(P[lo][0], P[lo + 1][0], f), lerp(P[lo][1], P[lo + 1][1], f)];
  };
}

/* place a shape drawn along +x (with y, z across it) at `at`, pointing along d */
function place(src: Float32Array, i: number, at: number[], d: number[], s: number[], q: number[], pos: Float32Array, o: number) {
  const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2];
  pos[o * 3] = at[0] + d[0] * x + s[0] * y + q[0] * z;
  pos[o * 3 + 1] = at[1] + d[1] * x + s[1] * y + q[1] * z;
  pos[o * 3 + 2] = at[2] + d[2] * x + s[2] * y + q[2] * z;
}

/* ------------------------------------------------------------------ pottery */

function pottery(N: number): Build {
  const WHEEL_Y = -8.4;
  const nWheel = Math.round(N * 0.25), nClay = N - nWheel;
  const wheel = points(nWheel, (add, n) => {
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU);
      if (Math.random() < 0.3) {
        const b = rand(-Math.PI / 2, Math.PI / 2);
        add((7.4 + 0.4 * Math.cos(b)) * Math.cos(a), WHEEL_Y - 0.45 + 0.4 * Math.sin(b), (7.4 + 0.4 * Math.cos(b)) * Math.sin(a));
      } else {
        const r = Math.round(Math.sqrt(Math.random()) * 7.2) + gauss() * 0.07; // fine grooves
        add(r * Math.cos(a), WHEEL_Y - 0.1, r * Math.sin(a));
      }
    }
  });
  // the clay's outline (height above the wheel, radius) as it grows: puck → tall cylinder → vase
  const shapes = [
    [[0, 0], [0, 2.5], [0, 4.3], [0.4, 4.6], [2.2, 4.5], [2.8, 4.1], [2.9, 2.2], [3, 0]],
    [[0, 0], [0, 3.6], [1.4, 3.6], [6.4, 3.4], [10.9, 3.2], [11.6, 3.1], [11.7, 2.7], [10.9, 2.7], [6.4, 2.8], [1.4, 2.9], [0.8, 0]],
    [[0, 0], [0, 3], [0.8, 3.6], [3, 5.2], [5.8, 6], [8.4, 5.6], [10.8, 4.2], [12.6, 2.6], [14, 1.9], [15.4, 2], [16.4, 2.5], [16.8, 2.8], [16.7, 2.4], [15.8, 1.9]],
  ].map(profileMap);
  // every clay dot keeps its share of the surface (u) and its angle, so the clay stretches
  const keys = shapes.map(() => new Float32Array(nClay * 3));
  for (let i = 0; i < nClay; i++) {
    const u = Math.random(), a = rand(0, TAU);
    shapes.forEach((map, k) => {
      const [y, r0] = map(u);
      const r = r0 + 0.12 * Math.sin(y * 5.5); // the throwing ridges
      keys[k].set([r * Math.cos(a), y + WHEEL_Y, r * Math.sin(a)], i * 3);
    });
  }
  return {
    name: "pottery",
    seconds: 8,
    view: 0.38,
    spin: true,
    update(t, pos, show) {
      pos.set(wheel, 0);
      show.fill(1);
      // puck → cylinder, then cylinder → vase, in one smooth growth
      const f = ease(t) * (keys.length - 1), k = Math.min(keys.length - 2, Math.floor(f)), g = f - k;
      const A = keys[k], B = keys[k + 1], o = nWheel * 3;
      for (let j = 0; j < nClay * 3; j++) pos[o + j] = A[j] + (B[j] - A[j]) * g;
    },
  };
}

/* ------------------------------------------------------------------ crochet */

function crochet(N: number): Build {
  const R = 6.4, TOP = 7;
  // the rounds, top to bottom: the crown, the body, then the ribbed brim
  const rows: { y: number; r: number; rib: boolean }[] = [];
  for (let phi = 0.18; phi <= Math.PI / 2 + 1e-6; phi += 0.17) rows.push({ y: TOP - 5.6 * (1 - Math.cos(phi)), r: R * Math.sin(phi), rib: false });
  for (let y = TOP - 6.3; y >= TOP - 10.6; y -= 0.7) rows.push({ y, r: R, rib: false });
  for (let i = 0; i < 4; i++) rows.push({ y: TOP - 11 - i * 0.6, r: R + 0.25, rib: true });

  const nHook = Math.round(N * 0.04), nBall = Math.round(N * 0.16), nPom = Math.round(N * 0.08);
  const nSt = N - nHook - nBall - nPom;
  const ROUNDS_END = 0.88; // share of the build spent on the rounds; then the pompom

  // stitches: each made at its own moment, going round and round
  const st = new Float32Array(nSt * 3), when = new Float32Array(nSt);
  const pickRow = picker(rows.map((r) => r.r + 0.3));
  for (let i = 0; i < nSt; i++) {
    const ri = pickRow(), { y, r, rib } = rows[ri], a = rand(0, TAU);
    const count = Math.max(6, Math.round((TAU * r) / 0.85)), f = ((a / TAU) * count) % 1;
    const dy = rib ? rand(-0.25, 0.25) : (Math.abs(f - 0.5) * 2 - 0.5) * 0.5;
    const rr = r + (rib ? 0.22 * Math.cos(a * count) : 0.1 * Math.sin(f * Math.PI)) + gauss() * 0.04;
    st.set([rr * Math.cos(a), y + dy, rr * Math.sin(a)], i * 3);
    when[i] = ((ri + a / TAU) / rows.length) * ROUNDS_END;
  }
  // the pompom, made last, puffs up from its middle
  const POM_Y = TOP + 1.6;
  const pom = points(nPom, (add, n) => {
    for (let k = 0; k < n; k++) {
      const v = [gauss(), gauss(), gauss()], l = Math.hypot(...v), r = 1.9 * Math.pow(Math.random(), 0.25);
      add((v[0] / l) * r, (v[1] / l) * r, (v[2] / l) * r);
    }
  });
  // the ball of yarn, wound strands round a unit ball; it shrinks as the yarn is used
  const BALL = [3.4, -9, 2.2], BALL_R = 2.8;
  const ball = points(nBall, (add, n) => {
    const wraps = Array.from({ length: 12 }, () => {
      let nn = [gauss(), gauss(), gauss()];
      const l = Math.hypot(...nn);
      nn = nn.map((v) => v / l);
      return frame(nn);
    });
    for (let k = 0; k < n; k++) {
      const [u, v] = wraps[(Math.random() * wraps.length) | 0], a = rand(0, TAU), r = rand(0.94, 1.02);
      add((u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r);
    }
  });
  // the hook, drawn along +x from its tip, with a little barb at the tip
  const hook = points(nHook, (add, n) => {
    tube(add, [[0.15, 0.25, 0], [0, 0, 0], [3.4, 0, 0]], 0.17, Math.round(n * 0.8));
    tube(add, [[1.9, 0, 0], [3.4, 0, 0]], 0.26, n - Math.round(n * 0.8));
  });

  return {
    name: "crochet",
    seconds: 10,
    view: 0.3,
    spin: true,
    update(t, pos, show) {
      let o = 0;
      // stitches appear as the hook reaches them
      pos.set(st, 0);
      for (let i = 0; i < nSt; i++, o++) show[o] = clamp01((t - when[i]) / 0.006);
      // then the pompom puffs up
      const p = clamp01((t - ROUNDS_END) / (1 - ROUNDS_END - 0.02)), ps = 0.2 + 0.8 * ease(p);
      for (let i = 0; i < nPom; i++, o++) {
        pos[o * 3] = pom[i * 3] * ps;
        pos[o * 3 + 1] = POM_Y + pom[i * 3 + 1] * ps;
        pos[o * 3 + 2] = pom[i * 3 + 2] * ps;
        show[o] = clamp01(p * 3);
      }
      // the ball shrinks, staying on the same spot
      const br = BALL_R * Math.cbrt(1 - 0.75 * clamp01(t / ROUNDS_END));
      for (let i = 0; i < nBall; i++, o++) {
        pos[o * 3] = BALL[0] + ball[i * 3] * br;
        pos[o * 3 + 1] = BALL[1] - BALL_R + br + ball[i * 3 + 1] * br;
        pos[o * 3 + 2] = BALL[2] + ball[i * 3 + 2] * br;
        show[o] = 1;
      }
      // the hook: its tip at the stitch being made, the handle pointing out and up
      const rf = Math.min(rows.length - 1e-3, clamp01(t / ROUNDS_END) * rows.length);
      const row = rows[Math.floor(rf)], a = (rf % 1) * TAU;
      const tip = [(row.r + 0.25) * Math.cos(a), row.y, (row.r + 0.25) * Math.sin(a)];
      const dir = [Math.cos(a) * 0.5 - Math.sin(a) * 0.25, 0.83, Math.sin(a) * 0.5 + Math.cos(a) * 0.25];
      const dl = Math.hypot(...dir);
      const d = dir.map((v) => v / dl);
      const [s, q] = frame(d);
      const hookShow = 1 - clamp01((t - ROUNDS_END) / 0.03);
      for (let i = 0; i < nHook; i++, o++) {
        place(hook, i, tip, d, s, q, pos, o);
        show[o] = hookShow;
      }
    },
  };
}

/* ------------------------------------------------------------------ painting */

function painting(N: number): Build {
  const CANVAS = { x0: -5, x1: 5, y0: -2.7, y1: 9.3, z: 0.35 };
  const PAINT_Z = CANVAS.z + 0.12, FLOWER = [0, 5.2];
  const nEasel = Math.round(N * 0.2), nCanvas = Math.round(N * 0.34), nBrush = Math.round(N * 0.04);
  const nPaint = N - nEasel - nCanvas - nBrush;

  const easel = points(nEasel, (add, n) => {
    const legs = [
      [[-3.8, 10.5, 0.9], [-6.2, -10.5, 2.4]],
      [[3.8, 10.5, 0.9], [6.2, -10.5, 2.4]],
      [[0, 10, -0.4], [0, -10.5, -5.6]],
      [[-6, -3.15, 1.15], [6, -3.15, 1.15]], // the ledge the canvas stands on
      [[-1.6, 9.7, 0.65], [1.6, 9.7, 0.65]], // the clamp at the top
    ];
    legs.forEach((l, i) => tube(add, l, i < 3 ? 0.28 : 0.36, Math.round(n / legs.length)));
  });
  const canvas = points(nCanvas, (add, n) => {
    const { x0, x1, y0, y1, z } = CANVAS;
    for (let k = 0; k < n; k++) {
      const r = Math.random();
      if (r < 0.74) add(rand(x0, x1), rand(y0, y1), z);
      else if (r < 0.9) {
        const edge = (Math.random() * 4) | 0, zz = rand(-z, z);
        if (edge === 0) add(rand(x0, x1), y0, zz);
        else if (edge === 1) add(rand(x0, x1), y1, zz);
        else if (edge === 2) add(x0, rand(y0, y1), zz);
        else add(x1, rand(y0, y1), zz);
      } else add(rand(x0, x1), rand(y0, y1), -z);
    }
  });

  /* the strokes, in the order they are painted; at(u) gives a point u of the way along */
  const strokes: { share: number; from: number; to: number; at: (u: number) => number[] }[] = [];
  const stem = smooth([[0.3, -2.5], [-0.1, 0.5], [0.2, 2.6], [0, FLOWER[1] - 1]], 16);
  strokes.push({ share: 0.12, from: 0, to: 0.14, at: (u) => {
    const f = u * (stem.length - 1), i = Math.min(stem.length - 2, Math.floor(f)), g = f - i, a = rand(0, TAU);
    return [lerp(stem[i][0], stem[i + 1][0], g) + Math.cos(a) * 0.17, lerp(stem[i][1], stem[i + 1][1], g), PAINT_Z + Math.sin(a) * 0.05];
  } });
  const leaf = (bx: number, by: number, tx: number, ty: number) => (u: number) => {
    const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy), w = 0.75 * Math.sin(Math.PI * u) * rand(-1, 1);
    return [bx + dx * u - (dy / l) * w, by + dy * u + (dx / l) * w + 0.25 * Math.sin(Math.PI * u), PAINT_Z + 0.05];
  };
  strokes.push({ share: 0.1, from: 0.15, to: 0.24, at: leaf(0, 0.4, -3, 1.9) });
  strokes.push({ share: 0.1, from: 0.25, to: 0.34, at: leaf(0.1, -1, 2.9, 0.1) });
  strokes.push({ share: 0.2, from: 0.36, to: 0.52, at: (u) => {
    // the centre, dabbed in a sunflower spiral from the middle out, domed
    const i = u * 600, r = 1.35 * Math.sqrt(i / 600), a = i * 2.39996;
    return [FLOWER[0] + r * Math.cos(a), FLOWER[1] + r * Math.sin(a), PAINT_Z + 0.35 * (1 - (r / 1.35) ** 2)];
  } });
  for (let j = 0; j < 13; j++) {
    const th = (j / 13) * TAU + 1.2, from = 0.54 + j * 0.034;
    strokes.push({ share: 0.48 / 13, from, to: from + 0.03, at: (u) => {
      const r = 1.45 + u * 2.1, w = 0.55 * Math.pow(Math.sin(Math.PI * u), 0.7) * rand(-1, 1);
      return [FLOWER[0] + Math.cos(th) * r - Math.sin(th) * w, FLOWER[1] + Math.sin(th) * r + Math.cos(th) * w, PAINT_Z + 0.12 * Math.sin(Math.PI * u)];
    } });
  }
  // every paint dot: where it lands and when; sorted by when, so the brush can follow
  const paint: { p: number[]; when: number }[] = [];
  const total = strokes.reduce((s, k) => s + k.share, 0);
  strokes.forEach((k) => {
    const n = Math.round((nPaint * k.share) / total);
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      paint.push({ p: k.at(u), when: lerp(k.from, k.to, u) });
    }
  });
  while (paint.length < nPaint) paint.push(paint[(Math.random() * paint.length) | 0]);
  paint.length = nPaint;
  paint.sort((a, b) => a.when - b.when);
  const paintPos = new Float32Array(paint.flatMap((d) => d.p));
  const paintWhen = paint.map((d) => d.when);

  // the brush, drawn along +x from its tip: bristles, a ferrule and a long handle
  const BD = [0.42, 0.5, 0.76].map((v, _, a) => v / Math.hypot(...a));
  const [bs, bq] = frame(BD);
  const brush = points(nBrush, (add, n) => {
    for (let k = 0; k < n; k++) {
      const x = Math.random() * 7, a = rand(0, TAU);
      const r = x < 1.1 ? 0.12 + 0.28 * (x / 1.1) : x < 1.8 ? 0.36 : 0.24 - 0.1 * ((x - 1.8) / 5.2);
      add(x, Math.cos(a) * r, Math.sin(a) * r);
    }
  });
  const REST = [4.4, -2.75, 1.6]; // the brush ends up laid on the ledge

  return {
    name: "painting",
    seconds: 10,
    view: 0.1,
    spin: false,
    update(t, pos, show) {
      pos.set(easel, 0);
      pos.set(canvas, nEasel * 3);
      let o = nEasel + nCanvas;
      show.fill(1, 0, o);
      // paint appears right where the brush is
      let head = 0;
      for (let i = 0; i < nPaint; i++, o++) {
        pos.set(paintPos.subarray(i * 3, i * 3 + 3), o * 3);
        const v = clamp01((t - paintWhen[i]) / 0.004);
        show[o] = v;
        if (v > 0) head = i;
      }
      // the brush tip sits on the newest paint; when the painting is done it goes to the ledge
      const done = ease(clamp01((t - 0.97) / 0.03));
      const lift = t < paintWhen[0] ? 0.8 : 0.1;
      const tip = [
        lerp(paintPos[head * 3], REST[0], done),
        lerp(paintPos[head * 3 + 1], REST[1], done),
        lerp(paintPos[head * 3 + 2] + lift, REST[2], done),
      ];
      for (let i = 0; i < nBrush; i++, o++) {
        place(brush, i, tip, BD, bs, bq, pos, o);
        show[o] = 1;
      }
    },
  };
}

/* ------------------------------------------------------------------ sewing */

function sewing(N: number): Build {
  const TORSO = [[7.4, 1.4, 1.2], [7, 3.4, 2], [6.2, 3.9, 2.4], [4, 3.7, 2.7], [1, 2.8, 2.1], [-1.5, 3.7, 2.7], [-3, 3.6, 2.6], [-3.2, 0.01, 0.01]];
  const nForm = Math.round(N * 0.3), nNeedle = Math.round(N * 0.02), nDress = N - nForm - nNeedle;
  const form = points(nForm, (add, n) => {
    const nNeck = Math.round(n * 0.18), nTorso = Math.round(n * 0.52), nPole = Math.round(n * 0.12);
    lathe(add, [[9.6, 0, 0], [9.6, 1.1, 1.1], [9.3, 1.3, 1.3], [8.7, 1, 1], [7.4, 1, 1]], nNeck);
    lathe(add, TORSO, nTorso);
    tube(add, [[0, -3.2, 0], [0, -10, 0]], 0.3, nPole);
    const rest = n - nNeck - nTorso - nPole;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      tube(add, [[0, -9.8, 0], [4.6 * Math.cos(a), -10.6, 4.6 * Math.sin(a)]], 0.26, Math.round(rest / 3));
    }
  });

  const TOP = 7.4, HEM = -7.4; // the dress is sewn from the shoulders down to the hem
  const dress = points(nDress, (add, n) => {
    const nb = Math.round(n * 0.27), ns = Math.round(n * 0.58), nh = Math.round(n * 0.07);
    lathe(add, [[6.3, 3.95, 2.5], [5.2, 3.95, 2.75], [4, 3.85, 2.85], [2.4, 3.3, 2.5], [1, 2.95, 2.25]], nb);
    for (let k = 0; k < ns; k++) {
      // the skirt flares from the waist into soft folds
      const u = Math.sqrt(Math.random()), a = rand(0, TAU), fold = 1 + 0.08 * Math.sin(9 * a) * u;
      add((2.95 + 3.6 * u ** 1.2) * fold * Math.cos(a), 1 - 8.4 * u, (2.25 + 3.2 * u ** 1.2) * fold * Math.sin(a));
    }
    for (let k = 0; k < nh; k++) {
      const a = rand(0, TAU), fold = 1 + 0.08 * Math.sin(9 * a);
      add(6.55 * fold * Math.cos(a), HEM + gauss() * 0.06, 5.45 * fold * Math.sin(a));
    }
    const rest = n - nb - ns - nh;
    for (const s of [-1, 1]) tube(add, smooth([[s * 2.3, 6.2, 2.1], [s * 2.7, 7.3, 0.4], [s * 2.6, 7.2, -1.2], [s * 2.3, 6.2, -2.1]], 10), 0.22, Math.round(rest / 2));
  });
  const needle = points(nNeedle, (add, n) => tube(add, [[0, 0, 0], [0, 1.8, 0]], 0.07, n));

  return {
    name: "sewing",
    seconds: 9,
    view: 0.22,
    spin: true,
    update(t, pos, show) {
      // the sewing line moves down; fabric appears above it and covers the form
      const line = lerp(TOP + 0.3, HEM - 0.3, ease(t));
      pos.set(form, 0);
      let o = 0;
      for (let i = 0; i < nForm; i++, o++) {
        const y = form[i * 3 + 1];
        show[o] = y < 6.4 && y > -3.25 && y > line ? 0 : 1; // the torso hides once covered
      }
      for (let i = 0; i < nDress; i++, o++) {
        const k = i * 3, y = dress[k + 1], v = clamp01((y - line) / 0.5);
        const out = 1 + 0.12 * (1 - v); // fresh fabric settles in from a little further out
        pos[o * 3] = dress[k] * out;
        pos[o * 3 + 1] = y;
        pos[o * 3 + 2] = dress[k + 2] * out;
        show[o] = v;
      }
      // the needle stitches round and round along the sewing line
      const a = t * TAU * 7, r = (line > 1 ? 4.1 : 3.1 + 3.6 * clamp01((1 - line) / 8.4)) + 0.3;
      const at = [r * Math.cos(a), line - 0.3 + Math.sin(t * 90) * 0.35, r * Math.sin(a)];
      const needleShow = 1 - clamp01((t - 0.97) / 0.03);
      for (let i = 0; i < nNeedle; i++, o++) {
        pos[o * 3] = at[0] + needle[i * 3];
        pos[o * 3 + 1] = at[1] + needle[i * 3 + 1];
        pos[o * 3 + 2] = at[2] + needle[i * 3 + 2];
        show[o] = needleShow;
      }
    },
  };
}

/* ------------------------------------------------------------------ rug tufting */

function rugTufting(N: number): Build {
  const W = 4.8, H = 5.6; // the design's half width and half height, on the cloth
  const pile = (x: number, y: number) => {
    const d = Math.hypot(x, y);
    const ring = Math.exp(-(((d - 3.2) / 0.5) ** 2));
    const centre = Math.exp(-((d / 0.9) ** 2));
    const border = Math.max(0, 1 - Math.min(W - Math.abs(x), H - Math.abs(y)) / 0.6);
    return 0.35 + 0.9 * ring + 0.7 * centre + 0.5 * border;
  };
  const nFrame = Math.round(N * 0.14), nCloth = Math.round(N * 0.2), nGun = Math.round(N * 0.04);
  const nTuft = N - nFrame - nCloth - nGun;

  const frameDots = points(nFrame, (add, n) => {
    const X = 6.4, Y = 7.2, m = Math.round(n * 0.78);
    tube(add, [[-X, -Y, 0], [X, -Y, 0], [X, Y, 0], [-X, Y, 0], [-X, -Y, 0]], 0.5, m);
    for (const s of [-1, 1]) tube(add, [[s * X, -Y - 0.4, -2.6], [s * X, -Y - 0.4, 2.6]], 0.42, Math.round((n - m) / 2));
  });
  const cloth = points(nCloth, (add, n) => {
    for (let k = 0; k < n; k++) add(rand(-6, 6), rand(-6.8, 6.8), 0);
  });
  // tufts, denser where the pile is high; filled row by row from the top, back and forth
  const ROWS = 24, END = 0.97;
  const tufts = new Float32Array(nTuft * 3), when = new Float32Array(nTuft);
  for (let i = 0; i < nTuft; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = rand(-W, W);
      y = rand(-H, H);
      if (Math.random() < (pile(x, y) / 1.4) ** 2) break;
    }
    tufts.set([x, y, pile(x, y) * (0.7 + 0.3 * Math.random())], i * 3);
    const row = Math.min(ROWS - 1, Math.floor(((H - y) / (2 * H)) * ROWS));
    const across = (x + W) / (2 * W);
    when[i] = ((row + (row % 2 ? 1 - across : across)) / ROWS) * END;
  }
  // the tufting gun, behind the cloth (the tufts come out the front)
  const gun = points(nGun, (add, n) => {
    tube(add, [[0, 0, -0.2], [0, 0, -1.4]], 0.18, Math.round(n * 0.25));
    tube(add, [[0, 0, -1.4], [0, 0.2, -4.2]], 0.55, Math.round(n * 0.5));
    tube(add, [[0, 0, -3.2], [0, -2, -3.8]], 0.32, n - Math.round(n * 0.75));
  });

  return {
    name: "rug tufting",
    seconds: 10,
    view: 0.14,
    spin: false,
    update(t, pos, show) {
      pos.set(frameDots, 0);
      pos.set(cloth, nFrame * 3);
      let o = nFrame + nCloth;
      show.fill(1, 0, o);
      // each tuft pops out of the cloth as the gun passes
      for (let i = 0; i < nTuft; i++, o++) {
        const k = i * 3, v = clamp01((t - when[i]) / 0.01);
        pos[o * 3] = tufts[k];
        pos[o * 3 + 1] = tufts[k + 1];
        pos[o * 3 + 2] = tufts[k + 2] * (0.3 + 0.7 * ease(v));
        show[o] = v > 0 ? 1 : 0;
      }
      const f = clamp01(t / END) * ROWS, row = Math.min(ROWS - 1, Math.floor(f)), across = Math.min(1, f - row);
      const gx = lerp(-W, W, row % 2 ? 1 - across : across), gy = H - ((row + 0.5) / ROWS) * 2 * H;
      const gunShow = 1 - clamp01((t - END) / 0.03);
      for (let i = 0; i < nGun; i++, o++) {
        pos[o * 3] = gx + gun[i * 3];
        pos[o * 3 + 1] = gy + gun[i * 3 + 1];
        pos[o * 3 + 2] = gun[i * 3 + 2];
        show[o] = gunShow;
      }
    },
  };
}

export const NAMES = ["pottery", "crochet", "painting", "sewing", "rug tufting"];

/* every hobby's build, each with exactly n dots */
export function buildHobbies(n: number): Build[] {
  return [pottery(n), crochet(n), painting(n), sewing(n), rugTufting(n)];
}
