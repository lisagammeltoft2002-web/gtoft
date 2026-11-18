/* Lisa's hobbies as little journeys of 3D dot sculptures. Each hobby is a few stages that
   the dots re-form through, from raw material to the finished thing:
     pottery      clay puck on the wheel → centred cone → opened bowl → pulled-up cylinder → vase
     crochet      ball of yarn → chain unwinding from it → the crown in rounds → half a beanie → beanie
     painting     blank canvas on an easel → stem and leaves → the flower's centre → petals → sunflower
     sewing       folded fabric → spread out with the pattern traced → pieces cut → the dress → on a dress form
     rug tufting  cloth on the frame with the design drawn → ring tufted → centre → all tufted → rug with fringe
   Units: about ±10, y up, z toward you, turning around the y axis. Every stage has exactly
   the same number of dots; they are sorted by height so dots travel to a matching height. */

export const NAMES = ["pottery", "crochet", "painting", "sewing", "rug tufting"];

/* view: how far we look down onto it (radians). spin: turns all the way round; otherwise it
   rocks gently, facing you (for the easel and the tufting frame, which have a front). */
export type Stage = { hobby: number; view: number; spin: boolean; hold: number; points: Float32Array };

type Add = (x: number, y: number, z: number) => void;
type Part = [number, (add: Add, n: number) => void];

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

/* a surface of revolution round the y axis: profile of [y, r] or [y, rx, rz] (oval) */
function lathe(add: Add, prof: number[][], n: number, ridge = 0) {
  const P = smooth(prof);
  const rx = (p: number[]) => p[1], rz = (p: number[]) => p[2] ?? p[1];
  const seg = P.slice(1).map((p, i) => {
    const q = P[i];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) * ((rx(p) + rx(q) + rz(p) + rz(q)) / 4 + 0.25);
  });
  const pick = picker(seg);
  for (let k = 0; k < n; k++) {
    const i = pick(), t = Math.random(), a = rand(0, TAU);
    const y = lerp(P[i][0], P[i + 1][0], t);
    const bump = ridge ? ridge * Math.sin(y * 5.5) : 0;
    add((lerp(rx(P[i]), rx(P[i + 1]), t) + bump) * Math.cos(a), y, (lerp(rz(P[i]), rz(P[i + 1]), t) + bump) * Math.sin(a));
  }
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

/* two directions square to u (and to each other) */
function frame(u: number[]) {
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let p = [u[1] * ref[2] - u[2] * ref[1], u[2] * ref[0] - u[0] * ref[2], u[0] * ref[1] - u[1] * ref[0]];
  const pl = Math.hypot(...p);
  p = p.map((v) => v / pl);
  const q = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];
  return [p, q];
}

/* a flat 2D shape (an SVG path) that can be filled with dots and traced along its edge */
let svg: SVGSVGElement | null = null;
const pt = typeof DOMPoint === "undefined" ? null : new DOMPoint();
function shape(d: string, box: [number, number, number, number]) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  svg!.appendChild(p);
  const len = p.getTotalLength();
  return {
    fill(n: number, put: (u: number, v: number) => void) {
      for (let k = 0, tries = 0; k < n && tries < n * 40; tries++) {
        pt!.x = rand(box[0], box[1]);
        pt!.y = rand(box[2], box[3]);
        if (p.isPointInFill(pt!)) {
          put(pt!.x, pt!.y);
          k++;
        }
      }
    },
    edge(n: number, put: (u: number, v: number) => void, dashed = false) {
      for (let k = 0; k < n; ) {
        const t = Math.random() * len;
        if (dashed && Math.floor(t / 0.45) % 2) continue;
        const q = p.getPointAtLength(t);
        put(q.x, q.y);
        k++;
      }
    },
  };
}

/* build one stage from parts, each given a share of the dots */
function compose(N: number, parts: Part[]) {
  const pts: number[][] = [];
  const add: Add = (x, y, z) => pts.push([x, y, z]);
  const total = parts.reduce((s, [w]) => s + w, 0);
  let used = 0;
  parts.forEach(([w, f], i) => {
    const n = i === parts.length - 1 ? N - used : Math.round((N * w) / total);
    used += n;
    f(add, n);
  });
  while (pts.length < N) pts.push(pts[(Math.random() * pts.length) | 0].slice());
  pts.length = N;
  return pts;
}

/* ------------------------------------------------------------------ pottery */

const WHEEL_Y = -8.4;
const wheel: Part[1] = (add, n) => {
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
};
const clay = (prof: number[][]): Part[1] => (add, n) => lathe(add, prof.map(([y, r]) => [y + WHEEL_Y, r]), n, 0.12);

const POTTERY: [number, Part[]][] = [
  // a puck of clay slapped on the wheel
  [1, [[0.7, clay([[0, 0], [0, 2.5], [0, 4.3], [0.4, 4.6], [2.2, 4.5], [2.8, 4.1], [2.9, 2.2], [3, 0]])], [0.3, wheel]]],
  // coned up to centre it
  [0.7, [[0.7, clay([[0, 0], [0, 3.8], [0.8, 3.7], [3.4, 2.8], [5.9, 1.7], [7.6, 0.9], [8.1, 0]])], [0.3, wheel]]],
  // opened into a wide bowl
  [0.55, [[0.7, clay([[0, 0], [0, 4.8], [1.2, 5.4], [3.2, 5.9], [4.6, 6.1], [4.8, 5.6], [3.6, 5], [2, 4], [1.1, 2.5], [1, 0]])], [0.3, wheel]]],
  // the walls pulled up into a cylinder
  [0.35, [[0.7, clay([[0, 0], [0, 3.6], [1.4, 3.4], [6.4, 3.2], [10.9, 3.1], [11.6, 3], [11.7, 2.6], [10.9, 2.6], [6.4, 2.7], [1.4, 2.8], [0.8, 0]])], [0.3, wheel]]],
  // shaped into a vase with a neck and rim
  [0.3, [[0.7, clay([[0, 0], [0, 3], [0.8, 3.6], [3, 5.2], [5.8, 6], [8.4, 5.6], [10.8, 4.2], [12.6, 2.6], [14, 1.9], [15.4, 2], [16.4, 2.5], [16.8, 2.8], [16.7, 2.4], [15.8, 1.9]])], [0.3, wheel]]],
];

/* ------------------------------------------------------------------ crochet */

function yarnBall(cx: number, cy: number, cz: number, R: number): Part[1] {
  return (add, n) => {
    const wraps = Array.from({ length: 16 }, () => {
      let nn = [gauss(), gauss(), gauss()];
      const l = Math.hypot(...nn);
      nn = nn.map((v) => v / l);
      const [u, v] = frame(nn);
      return { u, v, r: R * rand(0.94, 1.02) };
    });
    for (let k = 0; k < n; k++) {
      const w = wraps[(Math.random() * wraps.length) | 0], a = rand(0, TAU), r = w.r + gauss() * 0.08;
      add(
        cx + (w.u[0] * Math.cos(a) + w.v[0] * Math.sin(a)) * r,
        cy + (w.u[1] * Math.cos(a) + w.v[1] * Math.sin(a)) * r,
        cz + (w.u[2] * Math.cos(a) + w.v[2] * Math.sin(a)) * r,
      );
    }
  };
}

/* a chain of little loops along a path (the first row of crochet) */
function chain(path: number[][]): Part[1] {
  const P = smooth(path, 30);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]));
  const total = cum[cum.length - 1], size = 1.1, count = Math.floor(total / size);
  const at = (s: number) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const p = P[i - 1].map((v, k) => lerp(v, P[i][k], t));
    const d = P[i].map((v, k) => v - P[i - 1][k]);
    const l = Math.hypot(...d) || 1;
    return { p, u: d.map((v) => v / l) };
  };
  return (add, n) => {
    for (let k = 0; k < n; k++) {
      const j = (Math.random() * count) | 0;
      const { p, u } = at((j + 0.5) * size);
      const [a, b] = frame(u);
      const side = j % 2 ? a : b; // loops twist, one this way, the next that way
      const ang = rand(0, TAU);
      const c = Math.cos(ang) * size * 0.55, s = Math.sin(ang) * 0.32;
      add(p[0] + u[0] * c + side[0] * s + gauss() * 0.05, p[1] + u[1] * c + side[1] * s + gauss() * 0.05, p[2] + u[2] * c + side[2] * s + gauss() * 0.05);
    }
  };
}

/* rows of V-shaped stitches, each a ring [y, r]; rib adds vertical ribbing (the brim) */
function stitches(rings: number[][], rib = false): Part[1] {
  const pick = picker(rings.map(([, r]) => r + 0.3));
  return (add, n) => {
    for (let k = 0; k < n; k++) {
      const [y, r] = rings[pick()], a = rand(0, TAU);
      const count = Math.max(6, Math.round((TAU * r) / 0.85));
      const f = ((a / TAU) * count) % 1;
      const dy = rib ? rand(-0.25, 0.25) : (Math.abs(f - 0.5) * 2 - 0.5) * 0.5;
      const rr = r + (rib ? 0.22 * Math.cos(a * count) : 0.1 * Math.sin(f * Math.PI)) + gauss() * 0.04;
      add(rr * Math.cos(a), y + dy, rr * Math.sin(a));
    }
  };
}

/* the beanie: crown rounds from the top, the body, the ribbed brim, a pompom */
const BEANIE_R = 6.4, BEANIE_TOP = 7;
const crown = (upTo: number) => {
  const rows: number[][] = [];
  for (let phi = 0.18; phi <= upTo; phi += 0.17) rows.push([BEANIE_TOP - 5.6 * (1 - Math.cos(phi)), BEANIE_R * Math.sin(phi)]);
  return rows;
};
const body = (down: number) => {
  const rows: number[][] = [];
  for (let y = BEANIE_TOP - 5.6 - 0.7; y >= BEANIE_TOP - 5.6 - down; y -= 0.7) rows.push([y, BEANIE_R]);
  return rows;
};
const brim = Array.from({ length: 4 }, (_, i) => [BEANIE_TOP - 5.6 - 5.4 - i * 0.6, BEANIE_R + 0.25]);
const pompom: Part[1] = (add, n) => {
  for (let k = 0; k < n; k++) {
    const v = [gauss(), gauss(), gauss()], l = Math.hypot(...v), r = 1.9 * Math.pow(Math.random(), 0.25);
    add((v[0] / l) * r, BEANIE_TOP + 1.6 + (v[1] / l) * r, (v[2] / l) * r);
  }
};

const CROCHET: [number, Part[]][] = [
  [0.9, [[0.85, yarnBall(0, 0, 0, 6)], [0.15, (add, n) => tube(add, smooth([[3.4, -4.6, 1.6], [5, -6.4, 1.6], [6.2, -6.6, 0.4], [6.4, -8.2, -0.6]], 20), 0.2, n)]]],
  [0.6, [[0.7, yarnBall(-1.8, -3.8, 0, 4.6)], [0.3, chain([[2.2, -6, 1.6], [4.6, -5.4, 1.2], [6, -2.6, 0.4], [6, 0.8, -0.4], [4.6, 4, -1], [2, 5.8, -0.4]])]]],
  [0.6, [[0.45, yarnBall(-2.8, -7, 0.6, 3.6)], [0.4, stitches(crown(0.9))], [0.15, chain([[0, -4.6, 1.6], [1.6, -1, 2.6], [2.6, 2.4, 3.6], [2.4, 4.6, 3.4]])]]],
  [0.6, [[0.22, yarnBall(-3.4, -8.2, 2.4, 2.4)], [0.68, stitches([...crown(Math.PI / 2), ...body(2.8)])], [0.1, chain([[-1.8, -6.6, 3.4], [-0.6, -3.6, 5], [0.4, -2.2, 6.1]])]]],
  [0.3, [[0.78, stitches([...crown(Math.PI / 2), ...body(5)])], [0.12, stitches(brim, true)], [0.1, pompom]]],
];

/* ------------------------------------------------------------------ painting */

const CANVAS = { x0: -5, x1: 5, y0: -2.7, y1: 9.3, z: 0.35 };
const easel: Part[1] = (add, n) => {
  const legs = [
    [[-3.8, 10.5, 0.9], [-6.2, -10.5, 2.4]],
    [[3.8, 10.5, 0.9], [6.2, -10.5, 2.4]],
    [[0, 10, -0.4], [0, -10.5, -5.6]],
    [[-6, -3.15, 1.15], [6, -3.15, 1.15]], // the ledge the canvas stands on
    [[-1.6, 9.7, 0.65], [1.6, 9.7, 0.65]], // the clamp at the top
  ];
  legs.forEach((l, i) => tube(add, l, i < 3 ? 0.28 : 0.36, Math.round(n / legs.length)));
};
const canvas: Part[1] = (add, n) => {
  const { x0, x1, y0, y1, z } = CANVAS;
  for (let k = 0; k < n; k++) {
    const r = Math.random();
    if (r < 0.74) add(rand(x0, x1), rand(y0, y1), z); // the face
    else if (r < 0.9) {
      // the sides
      const t = rand(0, 2 * (x1 - x0 + y1 - y0)), zz = rand(-z, z);
      if (t < x1 - x0) add(x0 + t, y0, zz);
      else if (t < 2 * (x1 - x0)) add(x0 + t - (x1 - x0), y1, zz);
      else if (t < 2 * (x1 - x0) + (y1 - y0)) add(x0, y0 + t - 2 * (x1 - x0), zz);
      else add(x1, y0 + t - 2 * (x1 - x0) - (y1 - y0), zz);
    } else add(rand(x0, x1), rand(y0, y1), -z); // the back
  }
};
const PAINT_Z = CANVAS.z + 0.12;
const FLOWER = [0, 5.2];
const stemAndLeaves: Part[1] = (add, n) => {
  tube(add, smooth([[0.3, -2.5, PAINT_Z], [-0.1, 0.5, PAINT_Z], [0.2, 2.6, PAINT_Z], [0, FLOWER[1] - 1, PAINT_Z]], 16), 0.17, Math.round(n * 0.34));
  const leaf = (bx: number, by: number, tx: number, ty: number, m: number) => {
    const dx = tx - bx, dy = ty - by, l = Math.hypot(dx, dy), px = -dy / l, py = dx / l;
    for (let k = 0; k < m; k++) {
      const u = Math.random(), w = 0.75 * Math.sin(Math.PI * u) * (Math.random() < 0.55 ? Math.sign(rand(-1, 1)) : rand(-1, 1));
      add(bx + dx * u + px * w, by + dy * u + py * w + 0.25 * Math.sin(Math.PI * u), PAINT_Z + 0.05);
    }
  };
  leaf(0, 0.4, -3, 1.9, Math.round(n * 0.33));
  leaf(0.1, -1, 2.9, 0.1, n - Math.round(n * 0.34) - Math.round(n * 0.33));
};
const flowerCentre: Part[1] = (add, n) => {
  // seeds in a sunflower spiral, domed
  for (let k = 0; k < n; k++) {
    const i = Math.random() * 600, r = 1.35 * Math.sqrt(i / 600), a = i * 2.39996;
    add(FLOWER[0] + r * Math.cos(a) + gauss() * 0.04, FLOWER[1] + r * Math.sin(a) + gauss() * 0.04, PAINT_Z + 0.35 * (1 - (r / 1.35) ** 2));
  }
};
const petals = (count: number, of = 13): Part[1] => (add, n) => {
  for (let k = 0; k < n; k++) {
    const j = k % count, th = (j / of) * TAU + 1.2;
    const u = Math.random(), r = 1.45 + u * 2.1, w = 0.55 * Math.pow(Math.sin(Math.PI * u), 0.7);
    const s = Math.random() < 0.45 ? Math.sign(rand(-1, 1)) : rand(-1, 1);
    add(FLOWER[0] + Math.cos(th) * r - Math.sin(th) * w * s, FLOWER[1] + Math.sin(th) * r + Math.cos(th) * w * s, PAINT_Z + 0.12 * Math.sin(Math.PI * u));
  }
};

const PAINTING: [number, Part[]][] = [
  [0.5, [[0.22, easel], [0.78, canvas]]],
  [0.5, [[0.22, easel], [0.6, canvas], [0.18, stemAndLeaves]]],
  [0.5, [[0.22, easel], [0.48, canvas], [0.15, stemAndLeaves], [0.15, flowerCentre]]],
  [0.5, [[0.22, easel], [0.4, canvas], [0.12, stemAndLeaves], [0.12, flowerCentre], [0.14, petals(6)]]],
  [0.1, [[0.2, easel], [0.3, canvas], [0.12, stemAndLeaves], [0.14, flowerCentre], [0.24, petals(13)]]],
];

/* ------------------------------------------------------------------ sewing */

/* pattern pieces, drawn flat (u across, v down) */
const BODICE = "M -2.3 -3.2 L -1 -3.4 Q 0 -2.3 1 -3.4 L 2.3 -3.2 Q 2 -1.6 2.9 -0.6 L 2.5 3.2 L -2.5 3.2 L -2.9 -0.6 Q -2 -1.6 -2.3 -3.2 Z";
const SKIRT = "M -1.9 -3.6 L 1.9 -3.6 L 3.9 3.4 Q 0 4.3 -3.9 3.4 Z";
const pieces = (spread: number, lift: number): Part[1] => (add, n) => {
  const b = shape(BODICE, [-3, 3, -3.5, 3.3]), s = shape(SKIRT, [-4, 4, -3.7, 4.3]);
  const nb = Math.round(n * 0.45);
  b.fill(Math.round(nb * 0.7), (u, v) => add(u - spread, lift, v));
  b.edge(nb - Math.round(nb * 0.7), (u, v) => add(u - spread, lift + 0.05, v));
  const ns = n - nb;
  s.fill(Math.round(ns * 0.7), (u, v) => add(u + spread, lift, v));
  s.edge(ns - Math.round(ns * 0.7), (u, v) => add(u + spread, lift + 0.05, v));
};
const folded: Part[1] = (add, n) => {
  // three layers of cloth folded on the table, the folds rounded on alternate sides
  for (let k = 0; k < n; k++) {
    const r = Math.random();
    if (r < 0.8) {
      const layer = (Math.random() * 4) | 0, x = rand(-5.5, 5.5), z = rand(-3.6, 3.6);
      add(x, layer * 0.55 + 0.06 * Math.sin(x * 1.3 + z), z);
    } else {
      const fold = (Math.random() * 3) | 0, side = fold % 2 ? -1 : 1, b = rand(-Math.PI / 2, Math.PI / 2);
      add(side * (5.5 + 0.275 * Math.cos(b)), fold * 0.55 + 0.275 + 0.275 * Math.sin(b), rand(-3.6, 3.6));
    }
  }
};
const spread: Part[1] = (add, n) => {
  const sheet = Math.round(n * 0.72);
  for (let k = 0; k < sheet; k++) {
    const x = rand(-8.6, 8.6), z = rand(-5.2, 5.2);
    add(x, 0.25 * Math.sin(x * 0.6) * Math.cos(z * 0.5), z);
  }
  // the pattern traced on top, dashed
  const b = shape(BODICE, [-3, 3, -3.5, 3.3]), s = shape(SKIRT, [-4, 4, -3.7, 4.3]);
  const rest = n - sheet;
  b.edge(Math.round(rest * 0.45), (u, v) => add(u - 4.4, 0.3, v), true);
  s.edge(rest - Math.round(rest * 0.45), (u, v) => add(u + 3.6, 0.3, v), true);
};

/* the dress form's torso, an oval in plan: [y, half width, half depth] */
const bodice = [[6.3, 3.95, 2.5], [5.2, 3.95, 2.75], [4, 3.85, 2.85], [2.4, 3.3, 2.5], [1, 2.95, 2.25]];
const dress = (add: Add, n: number) => {
  const nb = Math.round(n * 0.27), ns = Math.round(n * 0.56), nh = Math.round(n * 0.07), nw = Math.round(n * 0.04);
  lathe(add, bodice, nb);
  for (let k = 0; k < ns; k++) {
    // the skirt flares from the waist into soft folds
    const u = Math.sqrt(Math.random()), a = rand(0, TAU);
    const fold = 1 + 0.08 * Math.sin(9 * a) * u;
    add((2.95 + 3.6 * u ** 1.2) * fold * Math.cos(a), 1 - 8.4 * u, (2.25 + 3.2 * u ** 1.2) * fold * Math.sin(a));
  }
  for (let k = 0; k < nh; k++) {
    const a = rand(0, TAU), fold = 1 + 0.08 * Math.sin(9 * a);
    add(6.55 * fold * Math.cos(a), -7.4 + gauss() * 0.06, 5.45 * fold * Math.sin(a));
  }
  for (let k = 0; k < nw; k++) {
    const a = rand(0, TAU);
    add(3.0 * Math.cos(a), 1 + gauss() * 0.05, 2.3 * Math.sin(a));
  }
  const rest = n - nb - ns - nh - nw;
  for (const s of [-1, 1]) tube(add, smooth([[s * 2.3, 6.2, 2.1], [s * 2.7, 7.3, 0.4], [s * 2.6, 7.2, -1.2], [s * 2.3, 6.2, -2.1]], 10), 0.22, Math.round(rest / 2));
};
const form: Part[1] = (add, n) => {
  const q = Math.round(n / 4);
  lathe(add, [[9.6, 0], [9.6, 1.1], [9.3, 1.3], [8.7, 1], [7.4, 1], [7.1, 2.6, 1.6], [6.4, 3.85, 2.4]].map((p) => (p.length === 2 ? [p[0], p[1], p[1]] : p)), q);
  tube(add, [[0, -7.4, 0], [0, -10, 0]], 0.3, q);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    tube(add, [[0, -9.8, 0], [4.6 * Math.cos(a), -10.6, 4.6 * Math.sin(a)]], 0.26, Math.round((n - 2 * q) / 3));
  }
};

const SEWING: [number, Part[]][] = [
  [0.5, [[1, folded]]],
  [0.6, [[1, spread]]],
  [0.6, [[1, pieces(4.6, 0.6)]]],
  [0.4, [[1, dress]]],
  [0.3, [[0.66, dress], [0.34, form]]],
];

/* ------------------------------------------------------------------ rug tufting */

/* the frame stands up (x, y, facing +z); the design sits on the cloth */
const DES = { w: 4.8, h: 5.6 };
const pile = (x: number, y: number) => {
  const d = Math.hypot(x, y);
  const ring = Math.exp(-(((d - 3.2) / 0.5) ** 2));
  const centre = Math.exp(-((d / 0.9) ** 2));
  const border = Math.max(0, 1 - Math.min(DES.w - Math.abs(x), DES.h - Math.abs(y)) / 0.6);
  return 0.35 + 0.9 * ring + 0.7 * centre + 0.5 * border;
};
const tuftFrame: Part[1] = (add, n) => {
  const X = 6.4, Y = 7.2, m = Math.round(n * 0.78);
  tube(add, [[-X, -Y, 0], [X, -Y, 0], [X, Y, 0], [-X, Y, 0], [-X, -Y, 0]], 0.5, m);
  for (const s of [-1, 1]) tube(add, [[s * X, -Y - 0.4, -2.6], [s * X, -Y - 0.4, 2.6]], 0.42, Math.round((n - m) / 2));
};
const cloth: Part[1] = (add, n) => {
  for (let k = 0; k < n; k++) add(rand(-6, 6), rand(-6.8, 6.8), 0);
};
const drawnDesign: Part[1] = (add, n) => {
  for (let k = 0; k < n; k++) {
    const r = Math.random(), a = rand(0, TAU);
    if (r < 0.7) {
      const d = Math.random() < 0.5 ? 2.7 : 3.7;
      add(d * Math.cos(a), d * Math.sin(a), 0.03);
    } else if (r < 0.82) add(Math.cos(a), Math.sin(a), 0.03);
    else {
      const t = rand(0, 2 * (DES.w + DES.h)) * 2;
      const per = 2 * (2 * DES.w + 2 * DES.h);
      const s = t % per;
      if (s < 2 * DES.w) add(-DES.w + s, DES.h, 0.03);
      else if (s < 4 * DES.w) add(-DES.w + s - 2 * DES.w, -DES.h, 0.03);
      else if (s < 4 * DES.w + 2 * DES.h) add(-DES.w, -DES.h + s - 4 * DES.w, 0.03);
      else add(DES.w, -DES.h + s - 4 * DES.w - 2 * DES.h, 0.03);
    }
  }
};
/* tufts poke out of the front of the cloth as fuzzy loops */
const ringTufts = (sweep: number): Part[1] => (add, n) => {
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 - Math.random() * sweep, d = 3.2 + rand(-0.55, 0.55);
    add(d * Math.cos(a), d * Math.sin(a), 1.2 * Math.pow(Math.random(), 0.6));
  }
};
const centreTufts: Part[1] = (add, n) => {
  for (let k = 0; k < n; k++) {
    const a = rand(0, TAU), d = 1.05 * Math.sqrt(Math.random());
    add(d * Math.cos(a), d * Math.sin(a), 1.0 * Math.pow(Math.random(), 0.6));
  }
};
const allTufts: Part[1] = (add, n) => {
  // denser where the pile is high, so the ring still reads face on
  for (let k = 0; k < n; k++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = rand(-DES.w, DES.w);
      y = rand(-DES.h, DES.h);
      if (Math.random() < (pile(x, y) / 1.4) ** 2) break;
    }
    add(x, y, pile(x, y) * (0.7 + 0.3 * Math.random()));
  }
};
const finishedRug: Part[1] = (add, n) => {
  // off the frame, lying flat (pile up), with fringe at both ends
  const W = 5.4, H = 6.6, put = (x: number, y: number, z: number) => add(x, z, -y);
  const top = Math.round(n * 0.66), back = Math.round(n * 0.08);
  for (let k = 0; k < top; k++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 4; tries++) {
      x = rand(-W, W);
      y = rand(-H, H);
      if (Math.random() < pile((x * DES.w) / W, (y * DES.h) / H) / 1.4) break;
    }
    put(x, y, pile((x * DES.w) / W, (y * DES.h) / H) + gauss() * 0.06);
  }
  for (let k = 0; k < back; k++) put(rand(-W, W), rand(-H, H), 0);
  const strands = 9;
  for (let k = 0; k < n - top - back; k++) {
    const i = k % (strands * 2), end = i < strands ? 1 : -1, xi = -W + 0.6 + ((i % strands) / (strands - 1)) * (2 * W - 1.2);
    const t = Math.random();
    put(xi + Math.sin(t * 3 + xi) * 0.3 + gauss() * 0.06, end * (H + t * 2.6), 0.15 - t * t * 0.6 + gauss() * 0.06);
  }
};

const RUG: [number, Part[]][] = [
  [0.5, [[0.3, tuftFrame], [0.58, cloth], [0.12, drawnDesign]]],
  [0.4, [[0.28, tuftFrame], [0.45, cloth], [0.27, ringTufts(Math.PI * 1.1)]]],
  [0.4, [[0.26, tuftFrame], [0.34, cloth], [0.32, ringTufts(TAU)], [0.08, centreTufts]]],
  [0.5, [[0.25, tuftFrame], [0.75, allTufts]]],
  [0.3, [[1, finishedRug]]],
];

/* ------------------------------------------------------------------ the journeys */

const JOURNEYS: { stages: [number, Part[]][]; views: number[]; spin: boolean[] }[] = [
  { stages: POTTERY, views: [0.5, 0.42, 0.55, 0.38, 0.3], spin: [true, true, true, true, true] },
  { stages: CROCHET, views: [0.28, 0.28, 0.3, 0.3, 0.28], spin: [true, true, true, true, true] },
  { stages: PAINTING, views: [0.1, 0.1, 0.1, 0.1, 0.1], spin: [false, false, false, false, false] },
  { stages: SEWING, views: [0.75, 0.85, 0.85, 0.25, 0.22], spin: [true, true, true, true, true] },
  { stages: RUG, views: [0.12, 0.12, 0.12, 0.12, 0.85], spin: [false, false, false, false, true] },
];
const LAST_HOLD = 2.6; // the finished piece stays a little longer

/* Build every stage of every journey with exactly n dots each. Needs the DOM (for the
   flat pattern shapes). Each journey is centred on its height range across all stages. */
export function buildJourneys(n: number): Stage[] {
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.appendChild(svg);
  const out: Stage[] = [];
  JOURNEYS.forEach((j, hobby) => {
    const all = j.stages.map(([, parts]) => compose(n, parts));
    let lo = Infinity, hi = -Infinity;
    for (const pts of all) for (const p of pts) {
      lo = Math.min(lo, p[1]);
      hi = Math.max(hi, p[1]);
    }
    const mid = (lo + hi) / 2;
    all.forEach((pts, i) => {
      pts.sort((a, b) => a[1] - b[1]);
      const points = new Float32Array(n * 3);
      pts.forEach((p, k) => points.set([p[0], p[1] - mid, p[2]], k * 3));
      const last = i === all.length - 1;
      out.push({ hobby, view: j.views[i], spin: j.spin[i], hold: last ? LAST_HOLD : j.stages[i][0], points });
    });
  });
  svg.remove();
  svg = null;
  return out;
}
