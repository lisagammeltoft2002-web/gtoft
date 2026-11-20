import { paperPlane, type Build } from "./sculptures";

/* Small 3D dot sculptures for the journeys on the case pages, drawn the hobbies' way (the
   Bloom engine shows them, rocking gently). Most are flat icons given depth: a 2D shape is
   filled with dots on its front and back and dotted more densely round its edge, so it reads
   like a thick paper cut-out. The bell and the coins are turned on a lathe instead.
   Units: about ±8, y up, z toward you. */

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

type In = (x: number, y: number) => boolean;
const rr = (cx: number, cy: number, w: number, h: number, r: number): In => (x, y) => {
  const dx = Math.max(Math.abs(x - cx) - w / 2 + r, 0), dy = Math.max(Math.abs(y - cy) - h / 2 + r, 0);
  return dx * dx + dy * dy <= r * r;
};
const disc = (cx: number, cy: number, r: number): In => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const tri = (a: number[], b: number[], c: number[]): In => (x, y) => {
  const s = (p: number[], q: number[]) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const any = (...f: In[]): In => (x, y) => f.some((g) => g(x, y));
const minus = (a: In, ...holes: In[]): In => (x, y) => a(x, y) && !holes.some((h) => h(x, y));
const rot = (f: In, a: number, cx = 0, cy = 0): In => {
  const c = Math.cos(-a), s = Math.sin(-a);
  return (x, y) => f(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c);
};

/* one flat piece: its shape, the box it fits in, how thick it is, and where it sits */
type Part = { inside: In; box: [number, number, number, number]; depth: number; z?: number; turn?: number; share?: number };

function extrude(N: number, parts: Part[]) {
  const pts = new Float32Array(N * 3);
  const total = parts.reduce((s, p) => s + (p.share ?? 1), 0);
  let i = 0;
  parts.forEach((p, k) => {
    const n = k === parts.length - 1 ? N - i : Math.round((N * (p.share ?? 1)) / total);
    const [x0, y0, x1, y1] = p.box, e = 0.28;
    const cy = Math.cos(p.turn ?? 0), sy = Math.sin(p.turn ?? 0);
    for (let j = 0; j < n && i < N; j++, i++) {
      let x = 0, y = 0, z = 0;
      const rim = Math.random() < 0.55;
      for (let tries = 0; tries < 400; tries++) {
        x = rand(x0, x1);
        y = rand(y0, y1);
        if (!p.inside(x, y)) continue;
        if (!rim) break;
        if (!p.inside(x + e, y) || !p.inside(x - e, y) || !p.inside(x, y + e) || !p.inside(x, y - e)) break;
      }
      z = rim ? rand(-p.depth / 2, p.depth / 2) : (Math.random() < 0.5 ? -1 : 1) * p.depth / 2;
      x += gauss() * 0.04;
      y += gauss() * 0.04;
      pts[i * 3] = x * cy + z * sy;
      pts[i * 3 + 1] = y;
      pts[i * 3 + 2] = -x * sy + z * cy + (p.z ?? 0);
    }
  });
  return pts;
}

/* a surface of revolution from a profile of [y, r] points (straight segments) */
function lathe(pts: Float32Array, from: number, n: number, prof: number[][], at: number[] = [0, 0, 0]) {
  const lens = prof.slice(1).map((p, i) => Math.hypot(p[0] - prof[i][0], p[1] - prof[i][1]) * ((p[1] + prof[i][1]) / 2 + 0.3));
  const sum = lens.reduce((a, b) => a + b, 0);
  for (let j = 0; j < n; j++) {
    let r = Math.random() * sum, k = 0;
    while (r > lens[k] && k < lens.length - 1) r -= lens[k++];
    const t = Math.random(), a = Math.random() * TAU;
    const y = prof[k][0] + (prof[k + 1][0] - prof[k][0]) * t, rad = prof[k][1] + (prof[k + 1][1] - prof[k][1]) * t;
    const o = (from + j) * 3;
    pts[o] = at[0] + rad * Math.cos(a) + gauss() * 0.04;
    pts[o + 1] = at[1] + y + gauss() * 0.04;
    pts[o + 2] = at[2] + rad * Math.sin(a) + gauss() * 0.04;
  }
}

const still = (name: string, pts: Float32Array, view = 0.32): Build => ({
  name,
  seconds: 3,
  view,
  spin: false,
  update(_t, pos, show) {
    pos.set(pts);
    show.fill(1);
  },
});

/* ------------------------------------------------------------------ the shapes */

const bubbleShape = (cx: number, cy: number, s: number, flip = false): In => {
  const m = flip ? -1 : 1;
  return minus(
    any(rr(cx, cy + 0.6 * s, 14 * s, 9 * s, 2.6 * s), tri([cx - m * 4.6 * s, cy - 3.6 * s], [cx - m * 1.4 * s, cy - 3.6 * s], [cx - m * 5.4 * s, cy - 6.4 * s])),
    disc(cx - 3.2 * s, cy + 0.6 * s, 1.05 * s),
    disc(cx, cy + 0.6 * s, 1.05 * s),
    disc(cx + 3.2 * s, cy + 0.6 * s, 1.05 * s),
  );
};

const SHAPES: Record<string, (N: number) => Build> = {
  bubble: (N) => still("a chat bubble", extrude(N, [{ inside: bubbleShape(0, 0.6, 1), box: [-8, -6, 8, 6], depth: 2.2 }])),

  bubbles: (N) =>
    still(
      "two chat bubbles",
      extrude(N, [
        { inside: bubbleShape(-2.2, 2.2, 0.78), box: [-9, -3.5, 4, 7], depth: 1.8, z: -1.2, share: 1.2 },
        { inside: bubbleShape(3.2, -2.8, 0.62, true), box: [-2, -8, 9, 1.5], depth: 1.6, z: 1.4 },
      ]),
    ),

  sections: (N) =>
    still(
      "page sections stacked, problems first",
      extrude(
        N,
        [4.4, 0, -4.4].map((y, i) => ({
          inside: minus(rr(0, y, 15 - i * 1.6, 3, 1), rr(-5.2 + i * 0.8, y, 1.6, 1.6, 0.4)),
          box: [-8, y - 2, 8, y + 2] as [number, number, number, number],
          depth: 1.1,
          z: 1.6 - i * 1.6,
          share: 1.2 - i * 0.15,
        })),
      ),
    ),

  browser: (N) =>
    still(
      "a browser window",
      extrude(N, [
        {
          inside: any(
            minus(rr(0, 0, 15.5, 11, 1.3), rr(0, -0.9, 14, 8, 0.6), disc(-6, 4.45, 0.4), disc(-4.9, 4.45, 0.4), disc(-3.8, 4.45, 0.4)),
            rr(-2.6, 1.2, 7, 1.5, 0.5),
            rr(-4.4, -1.6, 3.4, 1.5, 0.75),
            rr(3.8, -1, 4.6, 4.6, 0.6),
          ),
          box: [-8, -6, 8, 6],
          depth: 1.5,
        },
      ]),
    ),

  plane: (N) => paperPlane(N),

  swatches: (N) =>
    still(
      "three colour cards, layered",
      extrude(
        N,
        [[-3, 2.4, -1.6], [0, 0, 0], [3, -2.4, 1.6]].map(([x, y, z]) => ({
          inside: minus(rr(x, y, 7.4, 8.4, 0.9), rr(x, y - 2.6, 5.6, 0.5, 0.2), rr(x - 1.2, y - 3.4, 3.2, 0.5, 0.2)),
          box: [x - 4, y - 4.5, x + 4, y + 4.5] as [number, number, number, number],
          depth: 0.6,
          z,
        })),
      ),
    ),

  formats: (N) =>
    still(
      "a banner, a slide and a story",
      extrude(
        N,
        (
          [
            [-3.6, 2.6, 9.5, 5.6, -1.6],
            [2.6, -0.6, 6.2, 6.2, 0],
            [6, -3, 3.8, 6.6, 1.6],
          ] as const
        ).map(([x, y, w, h, z]) => ({
          inside: any(minus(rr(x, y, w, h, 0.7), rr(x, y, w - 1.1, h - 1.1, 0.3)), disc(x + w * 0.2, y + h * 0.15, Math.min(w, h) * 0.13)),
          box: [x - w / 2, y - h / 2, x + w / 2, y + h / 2] as [number, number, number, number],
          depth: 0.8,
          z,
        })),
      ),
    ),

  people: (N) => {
    const person = (x: number, s: number): In => any(disc(x, 2.4 * s, 1.75 * s), (px, py) => py <= -0.5 * s && py >= -5 * s && ((px - x) / (3.6 * s)) ** 2 + ((py + 5 * s) / (4.4 * s)) ** 2 <= 1);
    return still(
      "three people",
      extrude(N, [
        { inside: person(-5, 0.78), box: [-8.5, -5, -1.5, 4], depth: 1.4, z: -1.4, share: 0.8 },
        { inside: person(5, 0.78), box: [1.5, -5, 8.5, 4], depth: 1.4, z: -1.4, share: 0.8 },
        { inside: person(0, 1), box: [-4, -5.2, 4, 4.5], depth: 1.6, z: 1, share: 1.2 },
      ]),
    );
  },

  magnifier: (N) =>
    still(
      "a magnifying glass",
      extrude(N, [
        { inside: minus(disc(-1.4, 1.4, 4.8), disc(-1.4, 1.4, 3.5)), box: [-6.5, -3.5, 3.5, 6.5], depth: 1.6, share: 1.3 },
        { inside: rot(rr(4.2, -4.2, 6.2, 1.8, 0.9), -Math.PI / 4, 4.2, -4.2), box: [0.5, -8, 8, -0.5], depth: 1.8, share: 0.7 },
        { inside: disc(-1.4, 1.4, 3.4), box: [-5, -2, 2.2, 5], depth: 0.1, share: 0.25 },
      ]),
    ),

  bell: (N) => {
    const pts = new Float32Array(N * 3), clap = Math.round(N * 0.06);
    lathe(pts, 0, N - clap, [[5.6, 0], [5.4, 0.7], [4.8, 0.8], [4.6, 1.8], [3.8, 2.8], [1.8, 3.3], [-0.6, 3.8], [-2.4, 4.6], [-3.2, 5.6], [-3.7, 5.8], [-3.7, 0]]);
    lathe(pts, N - clap, clap, [[-4.1, 0], [-4.4, 0.75], [-5, 0.9], [-5.6, 0.6], [-5.8, 0]]);
    return still("a bell", pts, 0.3);
  },

  coins: (N) =>
    still(
      "a stack of coins and one standing coin",
      extrude(N, [
        {
          inside: any(...[[-4.8, 0.2], [-2.8, -0.4], [-0.8, 0.3], [1.2, -0.2]].map(([y, x]) => rr(x - 2.6, y, 7.6, 1.3, 0.65))),
          box: [-7, -5.5, 2, 1.7],
          depth: 2.6,
          share: 1.2,
        },
        { inside: any(minus(disc(4.2, 2.4, 3.6), disc(4.2, 2.4, 2.6)), rr(4.2, 2.4, 0.8, 3, 0.3)), box: [0.4, -1.4, 8, 6.2], depth: 0.9, z: 0.8 },
      ]),
    ),
};

export const SHAPE_NAMES = Object.keys(SHAPES);
export const journeyShape = (name: string) => (n: number) => [SHAPES[name](n)];
