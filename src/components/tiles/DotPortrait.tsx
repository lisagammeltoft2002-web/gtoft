"use client";

import { useEffect, useRef } from "react";

/* Lisa's portrait as a fine halftone of tiny dots, like a print: blue dots on the leaf green,
   bigger where the photo is darker (or, on a dark ground, `by="light"`: bigger where it's
   lighter, like a cyanotype), fading out round her head. The dots breathe a little, and the cursor pushes them aside;
   a spring brings them home. Built from the photo in the browser, so a new photo just works. */

const PITCH = 3.4; // px between dots
const MAX_R = 1.25; // the biggest dot's radius, in px
const MIN_R = 0.18; // smaller than this isn't drawn
const CROP = { x: 0.27, y: 0.03, w: 0.5 }; // the part of the photo shown (share of its width/height); its height follows the rectangle
/* the head, in the photo (share of its width/height): the dots fade out round it like a
   vignette, so the sky and water behind don't fill the rectangle */
const HEAD = { x: 0.53, y: 0.36, rx: 0.27, ry: 0.36 };
const GAMMA = 1.6; // sharpens the tones
const HOVER_R = 30, HOVER_PUSH = 160, BACK_K = 22, BACK_D = 8;

export function DotPortrait({ src, alt, color = "#fdfcf9", by = "light", className = "" }: { src: string; alt: string; color?: string; by?: "light" | "dark"; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, alive = true;
    let cleanup = () => {};

    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (!alive) return;
      let w = 1, h = 1, n = 0;
      let home = new Float32Array(0), size = new Float32Array(0), push = new Float32Array(0), vel = new Float32Array(0), seed = new Float32Array(0);

      /* one dot per grid point, sized by how light the photo is there */
      const sample = () => {
        const cols = Math.floor(w / PITCH), rows = Math.floor(h / PITCH);
        if (cols < 2 || rows < 2) return;
        const cw = img.width * CROP.w, ch = Math.min(img.height * (1 - CROP.y), cw * (h / w));
        const off = document.createElement("canvas");
        off.width = cols;
        off.height = rows;
        const o = off.getContext("2d", { willReadFrequently: true });
        if (!o) return;
        o.imageSmoothingQuality = "high";
        o.drawImage(img, img.width * CROP.x, img.height * CROP.y, cw, ch, 0, 0, cols, rows);
        const px = o.getImageData(0, 0, cols, rows).data;
        const lum = new Float32Array(cols * rows);
        for (let i = 0; i < cols * rows; i++) lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
        // stretch the tones between the darkest and lightest few percent
        const sorted = Array.from(lum).sort((a, b) => a - b);
        const lo = sorted[Math.floor(sorted.length * 0.04)], hi = sorted[Math.floor(sorted.length * 0.97)];
        n = cols * rows;
        home = new Float32Array(n * 2);
        size = new Float32Array(n);
        push = new Float32Array(n * 2);
        vel = new Float32Array(n * 2);
        seed = Float32Array.from({ length: n * 2 }, () => Math.random());
        const ox = (w - (cols - 1) * PITCH) / 2, oy = (h - (rows - 1) * PITCH) / 2;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const light = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo || 1)));
          const ix = CROP.x + ((x + 0.5) / cols) * CROP.w, iy = CROP.y + ((y + 0.5) / rows) * (ch / img.height);
          const d = Math.hypot((ix - HEAD.x) / HEAD.rx, (iy - HEAD.y) / HEAD.ry);
          const near = 1 - Math.min(1, Math.max(0, (d - 0.8) / 0.35));
          home[i * 2] = ox + x * PITCH;
          home[i * 2 + 1] = oy + y * PITCH;
          size[i] = MAX_R * Math.pow(by === "light" ? light : 1 - light, GAMMA) * near;
        }
      };

      const resize = () => {
        const r = canvas.getBoundingClientRect();
        w = Math.max(1, r.width);
        h = Math.max(1, r.height);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sample();
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

      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05), t = now / 1000;
        last = now;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const r = size[i];
          if (r < MIN_R) continue;
          // the cursor pushes, the spring pulls back
          const x = home[i * 2] + push[i * 2], y = home[i * 2 + 1] + push[i * 2 + 1];
          const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
          if (dd < HOVER_R * HOVER_R && dd > 1e-4) {
            const d = Math.sqrt(dd), f = (1 - d / HOVER_R) * HOVER_PUSH;
            vel[i * 2] += (dx / d) * f;
            vel[i * 2 + 1] += (dy / d) * f;
          }
          if (push[i * 2] || push[i * 2 + 1] || vel[i * 2] || vel[i * 2 + 1]) {
            vel[i * 2] += (-BACK_K * push[i * 2] - BACK_D * vel[i * 2]) * dt;
            vel[i * 2 + 1] += (-BACK_K * push[i * 2 + 1] - BACK_D * vel[i * 2 + 1]) * dt;
            push[i * 2] += vel[i * 2] * dt;
            push[i * 2 + 1] += vel[i * 2 + 1] * dt;
            if (Math.abs(push[i * 2]) + Math.abs(push[i * 2 + 1]) + Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) < 0.01) push[i * 2] = push[i * 2 + 1] = vel[i * 2] = vel[i * 2 + 1] = 0;
          }
          // breathing: each dot swells a hair, on its own
          const b = still ? 1 : 1 + 0.12 * Math.sin(t * 1.1 + seed[i * 2] * 40);
          ctx.moveTo(x + r * b, y);
          ctx.arc(x, y, r * b, 0, Math.PI * 2);
        }
        ctx.fill();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      cleanup = () => {
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
      };
    };
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [src, color, by]);

  return <canvas ref={canvasRef} role="img" aria-label={alt} className={`block h-full w-full ${className}`} />;
}
