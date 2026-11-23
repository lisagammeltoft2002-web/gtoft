import type { Build } from "./sculptures";

/* Lisa's face as a dot sculpture for the Bloom engine, so it's drawn exactly like the
   hobbies: the same tiny blue dots, the same depth, shimmer and hover. The dots are
   stippled from the photo (they gather where something is darker than what's around it:
   eyes, brows, mouth, strands of hair, the edge of the face, plus a soft share for the
   shading), fading out round a focus ellipse, and lifted onto a rounded head so it has depth.
   It builds itself from the top down, like the hobbies do.
   Units: about ±9, y up, z toward you. */

type Opts = {
  crop: { x: number; y: number; w: number }; // the part of the photo, as shares of it
  focus: { x: number; y: number; rx: number; ry: number }; // the face, as shares of the photo
  tone: number; // how much the overall shading counts
  detail: number; // how much the fine dark details count
  gamma: number;
};

const SIZE = 18; // the width of the cut-out, in sculpture units
const DEPTH = 3.2; // how far the head bulges toward you
const GRID = 220; // columns the photo is read at

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

export function faceBuild(im: HTMLImageElement, o: Opts) {
  const { crop, focus } = o;
  const cw = im.width * crop.w, ch = Math.min(im.height * (1 - crop.y), cw * 1.15);
  const cols = GRID, rows = Math.round((GRID * ch) / cw), N = cols * rows;
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const ctx = off.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(im, im.width * crop.x, im.height * crop.y, cw, ch, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;

  // a box blur: what each point's surroundings look like
  const blur = (src: Float32Array, r: number) => {
    const a = new Float32Array(N), b = new Float32Array(N);
    const at = (v: number, n: number) => Math.min(n - 1, Math.max(0, v));
    for (let y = 0; y < rows; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[y * cols + at(x, cols)];
      for (let x = 0; x < cols; x++) {
        a[y * cols + x] = acc / (2 * r + 1);
        acc += src[y * cols + at(x + r + 1, cols)] - src[y * cols + at(x - r, cols)];
      }
    }
    for (let x = 0; x < cols; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += a[at(y, rows) * cols + x];
      for (let y = 0; y < rows; y++) {
        b[y * cols + x] = acc / (2 * r + 1);
        acc += a[at(y + r + 1, rows) * cols + x] - a[at(y - r, rows) * cols + x];
      }
    }
    return b;
  };
  const fine = blur(lum, 1);
  const around = blur(lum, Math.round(cols * 0.05));
  const sorted = Array.from(fine).sort((a, b) => a - b);
  const lo = sorted[Math.floor(N * 0.03)], hi = sorted[Math.floor(N * 0.98)];
  let dMax = 0;
  for (let i = 0; i < N; i++) dMax = Math.max(dMax, around[i] - fine[i]);

  // per grid point: how likely a dot lands there, and how dark it is
  const prob = new Float32Array(N), dark = new Float32Array(N), bulge = new Float32Array(N);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    dark[i] = 1 - Math.min(1, Math.max(0, (fine[i] - lo) / (hi - lo || 1)));
    const detail = Math.max(0, around[i] - fine[i]) / (dMax * 0.45 || 1);
    const ix = crop.x + ((x + 0.5) / cols) * crop.w, iy = crop.y + ((y + 0.5) / rows) * (ch / im.height);
    const d = Math.hypot((ix - focus.x) / focus.rx, (iy - focus.y) / focus.ry);
    const near = 1 - Math.min(1, Math.max(0, (d - 0.75) / 0.4));
    prob[i] = Math.min(1, Math.pow(Math.min(1, o.tone * dark[i] + o.detail * detail), o.gamma)) * near;
    bulge[i] = Math.sqrt(Math.max(0, 1 - d * d * 0.8));
  }

  const scale = SIZE / cols;
  return (n: number): Build[] => {
    const pts = new Float32Array(n * 3), key = new Float32Array(n);
    for (let k = 0, tries = 0; k < n && tries < n * 200; tries++) {
      const fx = Math.random() * cols, fy = Math.random() * rows;
      const i = Math.floor(fy) * cols + Math.floor(fx);
      if (Math.random() >= prob[i]) continue;
      // on a rounded head, the dark hollows (eyes, mouth) sit a little deeper
      pts[k * 3] = (fx - cols / 2) * scale;
      pts[k * 3 + 1] = (rows / 2 - fy) * scale;
      pts[k * 3 + 2] = DEPTH * bulge[i] - 0.5 * dark[i] + (Math.random() - 0.5) * 0.25;
      key[k] = fy / rows;
      k++;
    }
    const face: Build = {
      name: "face",
      seconds: 3.2,
      view: 0,
      spin: false,
      // it fills in from the top down, as a soft wave
      update(t, pos, show) {
        pos.set(pts);
        const f = t * 1.15;
        for (let i = 0; i < n; i++) show[i] = Math.min(1, Math.max(0, (f - key[i]) / 0.15));
      },
    };
    return [face];
  };
}
