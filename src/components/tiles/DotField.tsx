"use client";

import { useEffect, useRef } from "react";

/* Any drawing made the hobbies' way: thousands of tiny sky-blue dots, a little see-through,
   some nearer (bigger, stronger) and some further (smaller, fainter), each drifting a hair on
   its own so nothing is ever frozen. The cursor pushes them aside and a spring brings them
   home. `place(w, h)` says where the dots go, in pixels of the canvas. */

const COLOR = "91 139 208"; // the sky blue, as in Bloom
const DOT_PX = 1.1, ALPHA = 0.62, BACK_ALPHA = 0.22;
const SHIMMER = 0.45; // px each dot drifts on its own
const HOVER_R = 34, HOVER_PUSH = 200, BACK_K = 25, BACK_D = 9;
const LAYERS = 4; // depth layers (each its own size and strength), drawn back to front

export function DotField({ place, label, strength = 1, burst = false, origin = [0.5, 0.5], zoom = 1, className = "" }: { place: (w: number, h: number) => Promise<Float32Array> | Float32Array; label: string; strength?: number; burst?: boolean; origin?: [number, number]; zoom?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placeRef = useRef(place);
  /* burst: the dots spark, fly apart and fade, while the whole drawing shrinks by `zoom`
     toward `origin` (share of the canvas), so it can hand over to a zooming photo */
  const burstRef = useRef({ on: burst, origin, zoom });
  useEffect(() => {
    burstRef.current = { on: burst, origin, zoom };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, alive = true, w = 1, h = 1, n = 0, version = 0;
    let home = new Float32Array(0), push = new Float32Array(0), vel = new Float32Array(0), seed = new Float32Array(0), layer = new Uint8Array(0);

    const resize = async () => {
      // its own layout size (not the on-screen box, which shrinks when a parent is scaled)
      w = Math.max(1, canvas.clientWidth);
      h = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const v = ++version;
      const pts = await placeRef.current(w, h);
      if (!alive || v !== version) return;
      n = pts.length / 2;
      home = Float32Array.from(pts);
      push = new Float32Array(n * 2);
      vel = new Float32Array(n * 2);
      seed = Float32Array.from({ length: n * 2 }, () => Math.random());
      layer = Uint8Array.from({ length: n }, () => Math.floor(Math.random() * LAYERS));
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    let mx = -1e4, my = -1e4;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = ((e.clientX - r.left) / Math.max(1, r.width)) * w;
      my = ((e.clientY - r.top) / Math.max(1, r.height)) * h;
    };
    window.addEventListener("pointermove", onMove);
    let seen = true;
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(canvas);

    let last = performance.now(), sc = 0;
    const sparks: number[] = [];
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05), t = now / 1000;
      last = now;
      if (!seen) {
        raf = requestAnimationFrame(frame); // off screen: draw nothing
        return;
      }
      ctx.clearRect(0, 0, w, h);
      const B = burstRef.current;
      sc += ((B.on ? 1 : 0) - sc) * Math.min(1, dt * (B.on ? 1.7 : 2.6));
      if (sc < 0.002) sc = 0;
      const ease = sc * sc * (3 - 2 * sc), ox = B.origin[0] * w, oy = B.origin[1] * h;
      const shrink = 1 + (1 / B.zoom - 1) * ease;
      ctx.globalAlpha = 1 - Math.pow(ease, 1.4);
      for (let L = 0; L < LAYERS; L++) {
        const near = L / (LAYERS - 1);
        const r = (DOT_PX / 2) * (0.7 + 0.65 * near);
        ctx.fillStyle = `rgb(${COLOR} / ${Math.min(1, strength * ALPHA * (BACK_ALPHA + (1 - BACK_ALPHA) * near))})`;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (layer[i] !== L) continue;
          const k = i * 2;
          let x = home[k] + push[k], y = home[k + 1] + push[k + 1];
          const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
          if (dd < HOVER_R * HOVER_R && dd > 1e-4) {
            const d = Math.sqrt(dd), f = (1 - d / HOVER_R) * HOVER_PUSH;
            // the cursor pushes, the spring pulls back
            vel[k] += (dx / d) * f;
            vel[k + 1] += (dy / d) * f;
          }
          if (push[k] || push[k + 1] || vel[k] || vel[k + 1]) {
            vel[k] += (-BACK_K * push[k] - BACK_D * vel[k]) * dt;
            vel[k + 1] += (-BACK_K * push[k + 1] - BACK_D * vel[k + 1]) * dt;
            push[k] += vel[k] * dt;
            push[k + 1] += vel[k + 1] * dt;
            if (Math.abs(push[k]) + Math.abs(push[k + 1]) + Math.abs(vel[k]) + Math.abs(vel[k + 1]) < 0.01) push[k] = push[k + 1] = vel[k] = vel[k + 1] = 0;
          }
          if (!still) {
            x += Math.sin(seed[k] * 41 + t * 1.7) * SHIMMER;
            y += Math.sin(seed[k + 1] * 37 + t * 1.3) * SHIMMER;
          }
          let rr = r;
          if (sc > 0) {
            // zoom out with the photo, then spark and fly apart from the middle
            const ex = (x - ox) * shrink, ey = (y - oy) * shrink, len = Math.hypot(ex, ey) || 1;
            const fly = Math.pow(ease, 1.6) * (18 + seed[k] * 90);
            x = ox + ex + (ex / len) * fly;
            y = oy + ey + (ey / len) * fly - ease * seed[k + 1] * 24;
            if (Math.sin(seed[k] * 97 + t * 19) > 0.9) {
              rr = r * (1 + 1.8 * Math.sin(Math.PI * Math.min(1, ease * 1.3))); // a spark
              sparks.push(x, y, rr);
            }
          }
          // ponytail: squares, not arcs; at 1–2 px nobody sees the difference and it's ~5× cheaper
          ctx.rect(x - rr, y - rr, rr * 2, rr * 2);
        }
        ctx.fill();
      }
      // the sparks' bright centres, on top
      if (sparks.length) {
        ctx.fillStyle = "rgb(255 255 250 / 0.85)";
        ctx.beginPath();
        for (let j = 0; j < sparks.length; j += 3) {
          const rad = sparks[j + 2] * 0.4;
          ctx.moveTo(sparks[j] + rad, sparks[j + 1]);
          ctx.arc(sparks[j], sparks[j + 1], rad, 0, Math.PI * 2);
        }
        ctx.fill();
        sparks.length = 0;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [strength]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className={`block h-full w-full ${className}`} />;
}

/* stipple a photo so a face reads: dots gather where something is darker than what's around
   it (eyes, brows, mouth, strands of hair, the edge of the face), plus a soft share for the
   overall shading, fading out round a focus ellipse */
export function stipplePhoto(src: string, opts: { crop: { x: number; y: number; w: number }; focus: { x: number; y: number; rx: number; ry: number }; density: number; tone: number; detail: number; gamma: number }) {
  let img: HTMLImageElement | null = null;
  const load = () =>
    new Promise<HTMLImageElement>((res) => {
      if (img?.complete) return res(img);
      img = new Image();
      img.onload = () => res(img!);
      img.src = src;
    });
  return async (w: number, h: number) => {
    const im = await load();
    const { crop, focus } = opts;
    const cols = Math.max(2, Math.round(w)), rows = Math.max(2, Math.round(h));
    const cw = im.width * crop.w, ch = Math.min(im.height * (1 - crop.y), cw * (h / w));
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const o = off.getContext("2d", { willReadFrequently: true })!;
    o.imageSmoothingQuality = "high";
    o.drawImage(im, im.width * crop.x, im.height * crop.y, cw, ch, 0, 0, cols, rows);
    const px = o.getImageData(0, 0, cols, rows).data;
    const N = cols * rows;
    const lum = new Float32Array(N);
    for (let i = 0; i < N; i++) lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    // a soft blur of the photo: what each point's surroundings look like
    const blur = (src: Float32Array, r: number) => {
      const a = new Float32Array(N), b = new Float32Array(N);
      for (let y = 0; y < rows; y++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += src[y * cols + Math.min(cols - 1, Math.max(0, x))];
        for (let x = 0; x < cols; x++) {
          a[y * cols + x] = acc / (2 * r + 1);
          acc += src[y * cols + Math.min(cols - 1, x + r + 1)] - src[y * cols + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < cols; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += a[Math.min(rows - 1, Math.max(0, y)) * cols + x];
        for (let y = 0; y < rows; y++) {
          b[y * cols + x] = acc / (2 * r + 1);
          acc += a[Math.min(rows - 1, y + r + 1) * cols + x] - a[Math.max(0, y - r) * cols + x];
        }
      }
      return b;
    };
    const fine = blur(lum, 3);
    const around = blur(lum, Math.max(4, Math.round(cols * 0.05)));
    const sorted = Array.from(fine).sort((a, b) => a - b);
    const lo = sorted[Math.floor(N * 0.03)], hi = sorted[Math.floor(N * 0.98)];
    const prob = new Float32Array(N);
    let dMax = 0;
    for (let i = 0; i < N; i++) dMax = Math.max(dMax, around[i] - fine[i]);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const dark = 1 - Math.min(1, Math.max(0, (fine[i] - lo) / (hi - lo || 1)));
      const detail = Math.max(0, around[i] - fine[i]) / (dMax * 0.45 || 1);
      const ix = crop.x + ((x + 0.5) / cols) * crop.w, iy = crop.y + ((y + 0.5) / rows) * (ch / im.height);
      const d = Math.hypot((ix - focus.x) / focus.rx, (iy - focus.y) / focus.ry);
      const near = 1 - Math.min(1, Math.max(0, (d - 0.75) / 0.4));
      prob[i] = Math.min(1, Math.pow(Math.min(1, opts.tone * dark + opts.detail * detail), opts.gamma)) * near;
    }
    const out: number[] = [];
    // ponytail: capped, so a big canvas doesn't mean 100k+ dots a frame; raise with care
    const target = Math.min(w * h * opts.density, 24000);
    for (let tries = 0; out.length / 2 < target && tries < target * 40; tries++) {
      const fx = Math.random() * cols, fy = Math.random() * rows;
      if (Math.random() < prob[Math.floor(fy) * cols + Math.floor(fx)]) out.push((fx / cols) * w, (fy / rows) * h);
    }
    return Float32Array.from(out);
  };
}
