/* The shape of a card that the disc pushes into, computed exactly (no sampling), so it
   changes smoothly as the disc moves and every corner is rounded with the same radius.

   How: the final shape is "rectangle minus disc, with all convex corners rounded by rho".
   That equals: shrink the rectangle by rho and grow the disc by rho, take the outline of
   what's left (straight edges + one concave arc), then push every edge back out by rho and
   put a rho-circle around every vertex. Straight edges land back on the card's edges, the
   concave arc lands exactly on the disc's margin, and every corner gets a true circular
   fillet, including the ones where the curve meets a straight edge. */

export type Rect = { x0: number; y0: number; x1: number; y1: number };
type P = [number, number];
type Seg =
  | { kind: "line"; a: P; b: P; n: P } /* n: outward normal */
  | { kind: "arc"; a: P; b: P; dphi: number }; /* along the grown disc */

const TAU = Math.PI * 2;
const N: P[] = [[0, -1], [1, 0], [0, 1], [-1, 0]]; /* outward normals of top, right, bottom, left */

export function carvedPath(rc: Rect, cx: number, cy: number, R: number, rho: number): string {
  /* the shrunk rectangle, walked clockwise on screen: top, right, bottom, left */
  const x0 = rc.x0 + rho, y0 = rc.y0 + rho, x1 = rc.x1 - rho, y1 = rc.y1 - rho;
  if (x1 <= x0 || y1 <= y0) return "";
  const Rp = R + rho;
  const C: P[] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const len = [x1 - x0, y1 - y0, x1 - x0, y1 - y0];
  const cum = [0, len[0], len[0] + len[1], len[0] + len[1] + len[2]];
  const per = cum[3] + len[3];
  const inside = (p: P) => (p[0] - cx) ** 2 + (p[1] - cy) ** 2 < Rp * Rp;
  const inRect = (p: P) => p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;

  /* where the grown disc crosses the shrunk rectangle's edges */
  type Hit = { t: number; p: P; edge: number; enter: boolean; phi: number };
  const hits: Hit[] = [];
  for (let k = 0; k < 4; k++) {
    const a = C[k];
    const u: P = [(C[(k + 1) % 4][0] - a[0]) / len[k], (C[(k + 1) % 4][1] - a[1]) / len[k]];
    const bx = a[0] - cx, by = a[1] - cy;
    const B = u[0] * bx + u[1] * by;
    const disc = B * B - (bx * bx + by * by - Rp * Rp);
    if (disc <= 0) continue;
    const sq = Math.sqrt(disc);
    for (const s of [-B - sq, -B + sq]) {
      if (s < 0 || s >= len[k]) continue;
      const p: P = [a[0] + u[0] * s, a[1] + u[1] * s];
      hits.push({ t: cum[k] + s, p, edge: k, enter: s + B < 0, phi: Math.atan2(p[1] - cy, p[0] - cx) });
    }
  }

  const loops: Seg[][] = [];
  if (!hits.length) {
    if (inside(C[0]) && inside(C[1]) && inside(C[2]) && inside(C[3])) return "";
    loops.push([0, 1, 2, 3].map((k) => ({ kind: "line", a: C[k], b: C[(k + 1) % 4], n: N[k] })));
  } else {
    hits.sort((a, b) => a.t - b.t);
    const used = new Set<Hit>();
    for (const start of hits) {
      if (start.enter || used.has(start)) continue;
      const loop: Seg[] = [];
      let cur = start;
      for (let guard = 0; guard < 16; guard++) {
        used.add(cur);
        /* walk the rectangle from this exit to the next entry */
        const after = hits.filter((h) => h.enter);
        const nxt = after.reduce((best, h) => {
          const d = (h.t - cur.t + per) % per || per;
          const db = (best.t - cur.t + per) % per || per;
          return d < db ? h : best;
        });
        let steps = (nxt.edge - cur.edge + 4) % 4;
        if (steps === 0 && nxt.t <= cur.t) steps = 4;
        let from = cur.p;
        for (let s = 0, k = cur.edge; s < steps; s++, k = (k + 1) % 4) {
          loop.push({ kind: "line", a: from, b: C[(k + 1) % 4], n: N[k] });
          from = C[(k + 1) % 4];
        }
        loop.push({ kind: "line", a: from, b: nxt.p, n: N[nxt.edge] });

        /* then follow the disc, the way that runs inside the rectangle, to the next crossing */
        const probe = (dir: number): P => [cx + Rp * Math.cos(nxt.phi + dir * 1e-3), cy + Rp * Math.sin(nxt.phi + dir * 1e-3)];
        const dir = inRect(probe(1)) ? 1 : -1;
        let end = nxt, best = Infinity;
        for (const h of hits) {
          if (h === nxt) continue;
          const d = (((h.phi - nxt.phi) * dir) % TAU + TAU) % TAU;
          if (d > 1e-9 && d < best) { best = d; end = h; }
        }
        loop.push({ kind: "arc", a: nxt.p, b: end.p, dphi: dir * best });
        used.add(nxt);
        cur = end;
        if (cur === start) break;
      }
      loops.push(loop);
    }
  }

  /* push everything back out by rho and round every vertex */
  const f = (v: number) => v.toFixed(2);
  const normalAt = (s: Seg, p: P): P => {
    if (s.kind === "line") return s.n;
    const dx = cx - p[0], dy = cy - p[1], l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  };
  const out = (s: Seg, p: P): P => {
    const n = normalAt(s, p);
    return [p[0] + rho * n[0], p[1] + rho * n[1]];
  };
  let d = "";
  for (const loop of loops) {
    const segs = loop.filter((s) => s.kind === "arc" || Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) > 1e-6);
    if (!segs.length) continue;
    const p0 = out(segs[0], segs[0].a);
    d += `M${f(p0[0])} ${f(p0[1])}`;
    segs.forEach((s, k) => {
      const e = out(s, s.b);
      if (s.kind === "line") d += `L${f(e[0])} ${f(e[1])}`;
      else d += `A${f(R)} ${f(R)} 0 ${Math.abs(s.dphi) > Math.PI ? 1 : 0} ${s.dphi > 0 ? 1 : 0} ${f(e[0])} ${f(e[1])}`;
      const next = segs[(k + 1) % segs.length];
      const q = out(next, next.a);
      if (Math.hypot(q[0] - e[0], q[1] - e[1]) > 0.01) d += `A${f(rho)} ${f(rho)} 0 0 1 ${f(q[0])} ${f(q[1])}`;
    });
    d += "Z";
  }
  return d;
}
