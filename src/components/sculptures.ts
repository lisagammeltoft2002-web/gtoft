/* Lisa's hobbies as 3D dot sculptures that build themselves, quickly and smoothly, from
   nothing to the finished piece, with only what's needed:
     pottery      a puck of clay on the wheel grows straight up into a vase
     crochet      a hook circles a few times while the beanie grows from the crown down
     painting     a brush paints a sunflower in three strokes: stem, centre, petals, then lifts away
     sewing       the dress drapes down over the dress form
     rug tufting  the tufting gun sweeps back and forth while the rug fills in behind it
   Each hobby has the same number of dots. update(t) places every dot for build progress
   t (0 → 1) and says how visible it is. Most parts grow as one soft wave (see reveal).
   Units: about ±10, y up, z toward you, turning around the y axis. */

export type Build = {
  name: string;
  seconds: number; // how long the build takes
  view: number; // how far we look down onto it (radians)
  spin: boolean; // turns all the way round; otherwise it rocks gently, facing you
  tool?: [number, number]; // the dots (from, to) that make the tool, which winds in last
  update: (t: number, pos: Float32Array, show: Float32Array) => void;
};

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);

/* build progress: it starts already moving (so it carries on from the thread that wound
   it, with no pause), keeps an even pace, and settles softly at the end */
const START_PACE = 0.7;
const grow = (t: number) => {
  const u = clamp01(t);
  return START_PACE * (u * u * u - 2 * u * u + u) + (3 * u * u - 2 * u * u * u);
};
/* the soft growth wave: each dot has a key k (0 → 1, e.g. top to bottom) and fades in as
   the wave front passes it */
const BAND = 0.14;
const front = (t: number) => grow(t) * (1 + BAND);
const reveal = (t: number, k: number, band = BAND) => clamp01((front(t) - k) / band);

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
  // the clay's outline (height above the wheel, radius): puck → vase
  const shapes = [
    [[0, 0], [0, 2.5], [0, 4.3], [0.4, 4.6], [2.2, 4.5], [2.8, 4.1], [2.9, 2.2], [3, 0]],
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
    seconds: 4,
    view: 0.38,
    spin: true,
    update(t, pos, show) {
      pos.set(wheel, 0);
      show.fill(1);
      // the puck grows straight up into the vase
      const g = grow(t), A = keys[0], B = keys[1], o = nWheel * 3;
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
  for (let y = TOP - 6.3; y >= TOP - 7.0 - 1e-6; y -= 0.7) rows.push({ y, r: R, rib: false });
  for (let i = 0; i < 3; i++) rows.push({ y: TOP - 7.6 - i * 0.6, r: R + 0.25, rib: true });
  const yTop = rows[0].y, yEnd = rows[rows.length - 1].y;
  const radiusAt = (y: number) => {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].y <= y) return lerp(rows[i - 1].r, rows[i].r, (rows[i - 1].y - y) / (rows[i - 1].y - rows[i].y || 1));
    }
    return rows[rows.length - 1].r;
  };

  const nHook = Math.round(N * 0.05), nSt = N - nHook;
  const st = new Float32Array(nSt * 3), key = new Float32Array(nSt);
  const pickRow = picker(rows.map((r) => r.r + 0.3));
  for (let i = 0; i < nSt; i++) {
    const ri = pickRow(), { y, r, rib } = rows[ri], a = rand(0, TAU);
    const count = Math.max(6, Math.round((TAU * r) / 0.85)), f = ((a / TAU) * count) % 1;
    const dy = rib ? rand(-0.25, 0.25) : (Math.abs(f - 0.5) * 2 - 0.5) * 0.5;
    const rr = r + (rib ? 0.22 * Math.cos(a * count) : 0.1 * Math.sin(f * Math.PI)) + gauss() * 0.04;
    st.set([rr * Math.cos(a), y + dy, rr * Math.sin(a)], i * 3);
    // the first rounds (a little crown) are there from the start, so there's something to begin from
    key[i] = (yTop - y) / (yTop - yEnd) - 0.12;
  }
  // the hook, drawn along +x from its tip, with a little barb at the tip
  const hook = points(nHook, (add, n) => {
    tube(add, [[0.15, 0.25, 0], [0, 0, 0], [3.4, 0, 0]], 0.17, Math.round(n * 0.8));
    tube(add, [[1.9, 0, 0], [3.4, 0, 0]], 0.26, n - Math.round(n * 0.8));
  });

  return {
    name: "crochet",
    seconds: 4,
    view: 0.3,
    spin: true,
    tool: [nSt, N],
    update(t, pos, show) {
      let o = 0;
      // the beanie grows from the crown down; fresh stitches settle from just above
      for (let i = 0; i < nSt; i++, o++) {
        const v = reveal(t, key[i]);
        pos[o * 3] = st[i * 3];
        pos[o * 3 + 1] = st[i * 3 + 1] + 0.5 * (1 - v);
        pos[o * 3 + 2] = st[i * 3 + 2];
        show[o] = v;
      }
      // the hook rides the growing edge, circling three times
      const y = lerp(yTop, yEnd, clamp01(front(t) + 0.12 - BAND / 2)), a = grow(t) * TAU * 3 + 0.6;
      // at the end it lifts up and away as it fades, still moving
      const away = ease(clamp01((t - 0.84) / 0.16));
      const r = radiusAt(y) + 0.25 + 1.6 * away;
      const tip = [r * Math.cos(a), y + 1.4 * away, r * Math.sin(a)];
      const dir = [Math.cos(a) * 0.5 - Math.sin(a) * 0.25, 0.83, Math.sin(a) * 0.5 + Math.cos(a) * 0.25];
      const dl = Math.hypot(...dir);
      const d = dir.map((v) => v / dl);
      const [s, q] = frame(d);
      const hookShow = 1 - away;
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
  const nCanvas = Math.round(N * 0.42), nBrush = Math.round(N * 0.04);
  const nPaint = N - nCanvas - nBrush;

  // just the canvas: its face, with its edge a little firmer so it reads as a canvas
  const canvas = points(nCanvas, (add, n) => {
    const { x0, x1, y0, y1, z } = CANVAS;
    for (let k = 0; k < n; k++) {
      if (Math.random() < 0.85) add(rand(x0, x1), rand(y0, y1), z);
      else {
        const edge = (Math.random() * 4) | 0, j = gauss() * 0.06;
        if (edge === 0) add(rand(x0, x1), y0 + j, z);
        else if (edge === 1) add(rand(x0, x1), y1 + j, z);
        else if (edge === 2) add(x0 + j, rand(y0, y1), z);
        else add(x1 + j, rand(y0, y1), z);
      }
    }
  });

  /* the strokes, in the order they are painted; at(u) gives a point u of the way along */
  const strokes: { share: number; from: number; to: number; at: (u: number) => number[] }[] = [];
  const stem = smooth([[0.3, -2.5], [-0.1, 0.5], [0.2, 2.6], [0, FLOWER[1] - 1]], 16);
  // 1: the stem, bottom to top
  strokes.push({ share: 0.16, from: 0, to: 0.28, at: (u) => { // matches STEM below
    const f = u * (stem.length - 1), i = Math.min(stem.length - 2, Math.floor(f)), g = f - i, a = rand(0, TAU);
    return [lerp(stem[i][0], stem[i + 1][0], g) + Math.cos(a) * 0.2, lerp(stem[i][1], stem[i + 1][1], g), PAINT_Z + Math.sin(a) * 0.05];
  } });
  // 2: the centre, in a sunflower spiral from the middle out, domed
  strokes.push({ share: 0.3, from: 0.33, to: 0.6, at: (u) => {
    const i = u * 600, r = 1.35 * Math.sqrt(i / 600), a = i * 2.39996;
    return [FLOWER[0] + r * Math.cos(a), FLOWER[1] + r * Math.sin(a), PAINT_Z + 0.35 * (1 - (r / 1.35) ** 2)];
  } });
  // 3: the petals, in one sweep round the flower
  strokes.push({ share: 0.54, from: 0.65, to: 0.95, at: (u) => {
    const j = Math.min(12, Math.floor(u * 13)), th = (j / 13) * TAU + 1.2;
    const along = Math.random(), r = 1.45 + along * 2.1, w = 0.55 * Math.pow(Math.sin(Math.PI * along), 0.7) * rand(-1, 1);
    return [FLOWER[0] + Math.cos(th) * r - Math.sin(th) * w, FLOWER[1] + Math.sin(th) * r + Math.cos(th) * w, PAINT_Z + 0.12 * Math.sin(Math.PI * along)];
  } });
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
  const STEM = [0, 0.28], CENTRE = [0.33, 0.6], PETALS = [0.65, 0.95];
  const stemAt = (u: number) => {
    const f = clamp01(u) * (stem.length - 1), i = Math.min(stem.length - 2, Math.floor(f)), g = f - i;
    return [lerp(stem[i][0], stem[i + 1][0], g), lerp(stem[i][1], stem[i + 1][1], g)];
  };
  const centreAt = (u: number) => {
    const r = 1.35 * Math.sqrt(clamp01(u)), a = Math.PI / 2 + clamp01(u) * TAU * 1.5;
    return [FLOWER[0] + r * Math.cos(a), FLOWER[1] + r * Math.sin(a)];
  };
  const petalsAt = (u: number) => {
    const a = 1.2 + clamp01(u) * TAU;
    return [FLOWER[0] + 2.8 * Math.cos(a), FLOWER[1] + 2.8 * Math.sin(a)];
  };
  const within = (te: number, [a, b]: number[]) => (te - a) / (b - a);
  const mix2 = (p: number[], q: number[], g: number) => [lerp(p[0], q[0], ease(clamp01(g))), lerp(p[1], q[1], ease(clamp01(g)))];
  const pathAt = (te: number) => {
    if (te <= STEM[1]) return stemAt(within(te, STEM));
    if (te < CENTRE[0]) return mix2(stemAt(1), centreAt(0), within(te, [STEM[1], CENTRE[0]]));
    if (te <= CENTRE[1]) return centreAt(within(te, CENTRE));
    if (te < PETALS[0]) return mix2(centreAt(1), petalsAt(0), within(te, [CENTRE[1], PETALS[0]]));
    return petalsAt(within(te, PETALS));
  };
  // the brush follows that path softened, so it glides round the corners between strokes
  // instead of stopping at each one
  const SOFT = 0.035;
  const brushAt = (te: number) => {
    let x = 0, y = 0, n = 0;
    for (let k = -4; k <= 4; k++) {
      const wgt = 5 - Math.abs(k), [px, py] = pathAt(Math.min(1, Math.max(0, te + (k / 4) * SOFT)));
      x += px * wgt;
      y += py * wgt;
      n += wgt;
    }
    return [x / n, y / n];
  };
  const brush = points(nBrush, (add, n) => {
    for (let k = 0; k < n; k++) {
      const x = Math.random() * 7, a = rand(0, TAU);
      const r = x < 1.1 ? 0.12 + 0.28 * (x / 1.1) : x < 1.8 ? 0.36 : 0.24 - 0.1 * ((x - 1.8) / 5.2);
      add(x, Math.cos(a) * r, Math.sin(a) * r);
    }
  });

  return {
    name: "painting",
    seconds: 4.5,
    view: 0.1,
    spin: false,
    tool: [N - nBrush, N],
    update(t, pos, show) {
      pos.set(canvas, 0);
      let o = nCanvas;
      show.fill(1, 0, o);
      // paint appears softly as the brush passes
      const te = grow(t);
      for (let i = 0; i < nPaint; i++, o++) {
        pos.set(paintPos.subarray(i * 3, i * 3 + 3), o * 3);
        show[o] = clamp01((te - paintWhen[i]) / 0.04);
      }
      // the brush glides along its path; when the painting is done it lifts away and fades
      const done = ease(clamp01((t - 0.84) / 0.16));
      const [bx, by] = brushAt(te);
      const tip = [bx, by, PAINT_Z + 0.25 + 2.5 * done];
      for (let i = 0; i < nBrush; i++, o++) {
        place(brush, i, tip, BD, bs, bq, pos, o);
        show[o] = 1 - done;
      }
    },
  };
}

/* ------------------------------------------------------------------ sewing */

function sewing(N: number): Build {
  const TORSO = [[7.4, 1.4, 1.2], [7, 3.4, 2], [6.2, 3.9, 2.4], [4, 3.7, 2.7], [1, 2.8, 2.1], [-1.5, 3.7, 2.7], [-3, 3.6, 2.6], [-3.2, 0.01, 0.01]];
  const nForm = Math.round(N * 0.3), nDress = N - nForm;
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
    const ns = Math.round(n * 0.6), nh = Math.round(n * 0.07), nb = n - ns - nh;
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
  });

  const keyOf = (y: number) => (TOP - y) / (TOP - HEM);
  const DRAPE = 0.22; // a wide, soft edge, like fabric falling
  return {
    name: "sewing",
    seconds: 4,
    view: 0.22,
    spin: true,
    update(t, pos, show) {
      pos.set(form, 0);
      let o = 0;
      for (let i = 0; i < nForm; i++, o++) {
        const y = form[i * 3 + 1];
        // the torso hides once the dress covers it (not the neck or the stand)
        show[o] = y < 6.4 && y > -3.25 ? 1 - reveal(t, keyOf(y), DRAPE) : 1;
      }
      // the dress drapes down over the form, settling in from just outside and above
      for (let i = 0; i < nDress; i++, o++) {
        const k = i * 3, y = dress[k + 1], v = reveal(t, keyOf(y), DRAPE), e = ease(v);
        const out = 1 + 0.1 * (1 - e);
        pos[o * 3] = dress[k] * out;
        pos[o * 3 + 1] = y + 1.2 * (1 - e);
        pos[o * 3 + 2] = dress[k + 2] * out;
        show[o] = v;
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
  const nFrame = Math.round(N * 0.14), nCloth = Math.round(N * 0.05), nGun = Math.round(N * 0.05);
  const nTuft = N - nFrame - nCloth - nGun;

  const frameDots = points(nFrame, (add, n) => {
    const X = 6.4, Y = 7.2, m = Math.round(n * 0.78);
    tube(add, [[-X, -Y, 0], [X, -Y, 0], [X, Y, 0], [-X, Y, 0], [-X, -Y, 0]], 0.5, m);
    for (const s of [-1, 1]) tube(add, [[s * X, -Y - 0.4, -2.6], [s * X, -Y - 0.4, 2.6]], 0.42, Math.round((n - m) / 2));
  });
  const cloth = points(nCloth, (add, n) => {
    for (let k = 0; k < n; k++) add(rand(-6, 6), rand(-6.8, 6.8), 0);
  });
  // tufts, denser where the pile is high; they fill in from the top down as a soft band
  const tufts = new Float32Array(nTuft * 3), key = new Float32Array(nTuft);
  for (let i = 0; i < nTuft; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = rand(-W, W);
      y = rand(-H, H);
      if (Math.random() < (pile(x, y) / 1.4) ** 2) break;
    }
    tufts.set([x, y, pile(x, y) * (0.7 + 0.3 * Math.random())], i * 3);
    key[i] = (H - y) / (2 * H);
  }
  // the tufting gun, in front of the rug: its nozzle at 0,0,0 pressed to the cloth, the body
  // rising up and toward you, with a handle (drawn so you can see it face on)
  const gun = points(nGun, (add, n) => {
    tube(add, [[0, 0, 0], [0.1, 0.9, 0.8]], 0.14, Math.round(n * 0.14));
    tube(add, [[0.1, 0.9, 0.8], [0.6, 4.6, 2.6]], 0.45, Math.round(n * 0.6));
    tube(add, [[0.4, 3, 1.9], [2.2, 2.2, 2.6]], 0.28, n - Math.round(n * 0.74));
  });
  const GUN_Z = 1.6; // just above the tallest pile

  return {
    name: "rug tufting",
    seconds: 4.5,
    view: 0.14,
    spin: false,
    tool: [N - nGun, N],
    update(t, pos, show) {
      pos.set(frameDots, 0);
      pos.set(cloth, nFrame * 3);
      let o = nFrame + nCloth;
      show.fill(1, 0, o);
      // the pile grows out of the cloth as the band passes
      for (let i = 0; i < nTuft; i++, o++) {
        const k = i * 3, v = reveal(t, key[i]);
        pos[o * 3] = tufts[k];
        pos[o * 3 + 1] = tufts[k + 1];
        pos[o * 3 + 2] = tufts[k + 2] * (0.2 + 0.8 * ease(v));
        show[o] = v;
      }
      // the gun sweeps back and forth four times, riding the band
      const gx = -W * 0.9 * Math.cos(Math.PI * 4 * grow(t));
      const gy = H - clamp01(front(t) - BAND / 2) * 2 * H;
      // at the end it lifts off the rug, toward you, as it fades
      const away = ease(clamp01((t - 0.84) / 0.16)), gunShow = 1 - away;
      for (let i = 0; i < nGun; i++, o++) {
        pos[o * 3] = gx + gun[i * 3];
        pos[o * 3 + 1] = gy + gun[i * 3 + 1] + 1.2 * away;
        pos[o * 3 + 2] = GUN_Z + gun[i * 3 + 2] + 2.4 * away;
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

/* ------------------------------------------------------------------ paper plane (contact) */

/* a paper plane that folds itself: the sheet appears from the nose back as one closed dart
   (keel and both wings standing up together), then the wings fold out, one a beat after the
   other, to a slight V. Nose along +x. Dots crowd the creases and the leading edges. */
export function paperPlane(N: number): Build {
  const NOSE = [8.25, 0.6, 0], TAIL = [-8.25, 0.6, 0], KEEL = [-8.25, -2.6, 0], SPAN = 6.4;
  const OPEN = 1.42; // how far the wings fold out (radians from standing up)
  const TURN_C = Math.cos(0.5), TURN_S = Math.sin(0.5);
  const nKeel = Math.round(N * 0.22);
  // each dot: which part (0 keel, -1 / 1 wings), and where on that triangle (u along, v across)
  const side = new Int8Array(N), U = new Float32Array(N), V = new Float32Array(N), key = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    side[i] = i < nKeel ? 0 : i % 2 ? 1 : -1;
    let u = Math.random(), v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const e = Math.random();
    if (e < 0.12) v = Math.abs(gauss()) * 0.012; // the crease along the spine
    else if (e < 0.2) u = Math.abs(gauss()) * 0.012; // the leading edge
    else if (e < 0.25) u = 1 - v - Math.abs(gauss()) * 0.012; // the back edge
    U[i] = u;
    V[i] = v;
    key[i] = u + v * 0.35; // the sheet appears from the nose back
  }
  return {
    name: "paper plane",
    seconds: 4.2,
    view: 0.62, // seen from a little above, so the wings show
    spin: false, // rocks gently instead of turning edge-on
    update(t, pos, show) {
      const fold = (s: number) => ease(clamp01((t - (s > 0 ? 0.42 : 0.52)) / 0.4)) * OPEN;
      const fR = fold(1), fL = fold(-1);
      for (let i = 0; i < N; i++) {
        const u = U[i], v = V[i], s = side[i], a = u + v;
        let x = NOSE[0] + (TAIL[0] - NOSE[0]) * a, y = NOSE[1] + (TAIL[1] - NOSE[1]) * a, z = 0;
        if (s === 0) {
          x += (KEEL[0] - TAIL[0]) * v;
          y += (KEEL[1] - TAIL[1]) * v;
        } else {
          const f = s > 0 ? fR : fL;
          y += Math.cos(f) * SPAN * v;
          z += s * Math.sin(f) * SPAN * v;
        }
        // turned three-quarters, nose toward you and to the right, so its shape always reads
        pos[i * 3] = x * TURN_C - z * TURN_S;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = x * TURN_S + z * TURN_C;
        show[i] = reveal(t / 0.55, key[i]);
      }
    },
  };
}
