"use client";

import { useEffect, useRef } from "react";

/* A paper plane made the hobbies' way: a 3D sculpture of tiny sky-blue dots (the two wings of the
   paper plane icon lifted into depth, their edges a little denser), seen in perspective with the far dots smaller
   and fainter. It flies: it turns gently to show its shape, banks, bobs up and down, and a
   dotted trail streams out behind it. The cursor pushes the dots aside like in the hobbies.
   Units: about ±12, y up, z toward you. */

const COLOR = "91 139 208";
const DOT_PX = 1.3, ALPHA = 0.85, BACK_ALPHA = 0.22, LAYERS = 5;
const PERSP = 60, SPREAD = 0.12, SHIMMER = 0.06;
const VIEW = 0; // the icon is already drawn from its best side
const HOVER_R = 30, HOVER_PUSH = 200, BACK_K = 25, BACK_D = 9;

type V = [number, number, number];
/* the paper plane icon (a 60 × 40 drawing: nose up right, the near wing on top, the far
   wing folding under it), lifted into 3D: the near wingtip toward you, the far one away */
const icon = (x: number, y: number, z: number): V => [(x - 30) * 0.42, -(y - 20) * 0.42, z];
const A = icon(2, 22, 3.5), B = icon(56, 4, 0), C = icon(28, 25, 0), D = icon(36, 36, -3.5);
const DIR: V = [0.8, 0.6, 0]; // the way it flies, roughly from the fold to the nose

function build() {
  const pts: number[] = [];
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const put = (p: V) => pts.push(p[0] + gauss() * SPREAD, p[1] + gauss() * SPREAD, p[2] + gauss() * SPREAD);
  const face = (a: V, b: V, c: V, n: number) => {
    for (let i = 0; i < n; i++) {
      let u = Math.random(), v = Math.random();
      if (u + v > 1) (u = 1 - u), (v = 1 - v);
      put([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * u + (c[k] - a[k]) * v) as V);
    }
  };
  const edge = (a: V, b: V, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      put([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t) as V);
    }
  };
  face(A, B, C, 1100); // the near wing, on top
  face(C, B, D, 900); // the far wing, folding under
  for (const [a, b] of [[A, B], [B, D], [D, C], [C, A], [C, B]] as [V, V][]) edge(a, b, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 16));
  return Float32Array.from(pts);
}

export function DotPlane({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const body = build();
    const TRAIL = 220;
    const n = body.length / 3, total = n + TRAIL;
    const seed = Float32Array.from({ length: total * 3 }, () => Math.random());
    const push = new Float32Array(total * 2), vel = new Float32Array(total * 2);
    const sx = new Float32Array(total), sy = new Float32Array(total), near = new Float32Array(total), alpha = new Float32Array(total);

    let w = 1, h = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let mx = -1e4, my = -1e4;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05), t = still ? 0 : now / 1000;
      last = now;
      // how it flies: a three-quarter view that turns a little, banks and bobs
      const yaw = Math.sin(t * 0.5) * 0.32, roll = Math.sin(t * 0.9) * 0.16, pitch = Math.sin(t * 0.7) * 0.06;
      const bob = Math.sin(t * 1.15) * 0.9, cv = Math.cos(VIEW), sv = Math.sin(VIEW);
      const cy = Math.cos(yaw), sY = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const scale = Math.min((w / 2 - 6) / 13, (h / 2 - 6) / 9.5);
      const ox = w / 2, oy = h / 2;
      const place = (i: number, x: number, y: number, z: number, a: number) => {
        // roll round the length, pitch the nose, then turn round the vertical
        const y1 = y * cr - z * sr, z1 = y * sr + z * cr;
        const x2 = x * cp - y1 * sp, y2 = x * sp + y1 * cp;
        const x3 = x2 * cy + z1 * sY, z3 = -x2 * sY + z1 * cy;
        // and we look down onto it a little
        const yb = y2 + bob, y4 = yb * cv - z3 * sv, z4 = yb * sv + z3 * cv;
        const p = PERSP / (PERSP - z4);
        sx[i] = ox + x3 * p * scale;
        sy[i] = oy - y4 * p * scale;
        near[i] = Math.min(1, Math.max(0, z4 / 11 * 0.5 + 0.5));
        alpha[i] = a;
      };
      for (let i = 0; i < n; i++) {
        const k = i * 3, d = SHIMMER * (still ? 0 : 1);
        place(i, body[k] + Math.sin(seed[k] * 41 + t * 1.7) * d, body[k + 1] + Math.sin(seed[k + 1] * 37 + t * 1.3) * d, body[k + 2] + Math.sin(seed[k + 2] * 29 + t * 1.5) * d, 1);
      }
      // the trail: dashes of dots streaming back from the tail, fading as they go
      for (let j = 0; j < TRAIL; j++) {
        const i = n + j, f = (seed[i * 3] + t * 0.35) % 1; // how far back along the trail
        const dash = Math.floor(f * 9) % 2 === 0 ? 1 : 0;
        const back = 3 + f * 13, wave = Math.sin(f * 5 - t * 1.6) * 0.9 * f;
        const x = C[0] - DIR[0] * back - DIR[1] * wave, y = C[1] - DIR[1] * back + DIR[0] * wave - 1.2;
        place(i, x, y + (seed[i * 3 + 1] - 0.5) * 0.35, (seed[i * 3 + 2] - 0.5) * 0.35, dash * (1 - f) * 0.9);
      }

      ctx.clearRect(0, 0, w, h);
      for (let Ly = 0; Ly < LAYERS; Ly++) {
        const lo = Ly / LAYERS, hi = (Ly + 1) / LAYERS, nr = (Ly + 0.5) / LAYERS;
        const r = (DOT_PX / 2) * (0.7 + 0.65 * nr);
        for (const band of [1, 0.6, 0.3]) {
          ctx.fillStyle = `rgb(${COLOR} / ${ALPHA * band * (BACK_ALPHA + (1 - BACK_ALPHA) * nr)})`;
          ctx.beginPath();
          for (let i = 0; i < total; i++) {
            if (near[i] < lo || near[i] >= hi + (Ly === LAYERS - 1 ? 1 : 0)) continue;
            const a = alpha[i];
            if (a <= 0 || (band === 1 ? a < 0.8 : band === 0.6 ? a < 0.45 || a >= 0.8 : a >= 0.45)) continue;
            const k = i * 2;
            const x = sx[i] + push[k], y = sy[i] + push[k + 1];
            const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
            if (dd < HOVER_R * HOVER_R && dd > 1e-4) {
              const dl = Math.sqrt(dd), f = (1 - dl / HOVER_R) * HOVER_PUSH;
              vel[k] += (dx / dl) * f;
              vel[k + 1] += (dy / dl) * f;
            }
            if (push[k] || push[k + 1] || vel[k] || vel[k + 1]) {
              vel[k] += (-BACK_K * push[k] - BACK_D * vel[k]) * dt;
              vel[k + 1] += (-BACK_K * push[k + 1] - BACK_D * vel[k + 1]) * dt;
              push[k] += vel[k] * dt;
              push[k + 1] += vel[k + 1] * dt;
            }
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} role="img" aria-label={label} className="block h-full w-full" />;
}
