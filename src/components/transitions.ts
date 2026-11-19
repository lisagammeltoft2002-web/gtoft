/* How each hobby turns into the next one: kept simple and calm, so it's satisfying to
   watch. The dots set off in a soft wave from the top down, and each glides on a gentle
   curve round the piece to the matching place in the next one (top to top, bottom to
   bottom), so nobody travels far. Dots the next piece doesn't start with fade softly away,
   and its tool forms last. Units as in sculptures.ts, each hobby centred on its own height.
   A dot's trip from the last piece (A) to the next (B) runs f = 0 → 1; Bloom.tsx blends
   A → path(f) → B. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* the angle from a to b, the short way round */
const turn = (a: number, b: number) => {
  const TAU = Math.PI * 2;
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export type Box = { min: number[]; max: number[] };
export type Ctx = { clock: number; rank: Float32Array; fuzz: Float32Array };
type Key = (x: number, y: number, z: number, box: Box, tool: boolean) => number;

export type Route = {
  unravel: number; // seconds over which dots set off from the last piece
  flight: number; // seconds each dot travels
  depart: number; // share of the flight spent easing off the last piece onto the path
  arrive: number; // share spent easing from the path into the next piece
  thin: [number, number]; // dots the next piece doesn't start with fade out over this part of the trip
  spin: number; // how much faster everything turns at the height of the change
  leave: Key; // the order dots set off from the finished piece (low first)
  enter: Key; // the order they arrive in the next piece's start (low first; tools come last anyway)
  overlap?: number; // seconds before the last dot arrives that the next build starts (default in Bloom)
  pre?: (p: Float32Array, clock: number) => void; // moves the whole last piece at once
  path: (out: Float32Array, f: number, a: Float32Array, b: Float32Array, k: number, c: Ctx) => void;
  target?: (p: Float32Array, clock: number) => void; // moves where a dot is heading
};

const fromTop: Key = (_x, y, _z, box) => (box.max[1] - y) / (box.max[1] - box.min[1] || 1);
const LIFT = 0.6; // how far a dot floats up on its way, at the middle of its trip

const gentle: Route = {
  unravel: 1.3,
  flight: 1.7,
  depart: 0.5,
  arrive: 0.5,
  thin: [0.15, 0.75],
  spin: 0,
  overlap: 0.5,
  leave: fromTop,
  enter: (x, y, z, box, tool) => 0.85 * fromTop(x, y, z, box, tool),
  path(out, f, a, b) {
    // round the piece (not through its middle), the short way, floating up a little
    const s = smooth(f), ra = Math.hypot(a[0], a[2]), rb = Math.hypot(b[0], b[2]);
    const ta = Math.atan2(a[2], a[0]), th = ta + turn(ta, Math.atan2(b[2], b[0])) * s, r = lerp(ra, rb, s);
    out[0] = r * Math.cos(th);
    out[1] = lerp(a[1], b[1], s) + LIFT * Math.sin(Math.PI * f);
    out[2] = r * Math.sin(th);
  },
};

/* routes[h] takes hobby h into hobby h + 1: the same calm change every time */
export const routes: Route[] = [gentle, gentle, gentle, gentle, gentle];
