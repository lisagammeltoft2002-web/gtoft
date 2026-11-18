/* The site's colours in one place, so palettes can be compared on the real page with
   ?palette=<name> (the default stays "moss" until one is chosen).
   - paper: the background and the cut-out hero title
   - ink:   the ball and the dunes        - deep: their darkest tone
   - light: the palest airborne sand      - text: headings and body on the glass */

export type Palette = { paper: string; ink: string; deep: string; light: string; text: string; glass?: string };

export const PALETTES: Record<string, Palette> = {
  /* the default: soft, bright and happy. A warm white paper, a fresh sunlit leaf green, sage glass */
  meadow: { paper: "#f1f0e9", ink: "#7aa05a", deep: "#4a7a3a", light: "#b3cf93", text: "#1d2a17", glass: "#f7faf2" },
  /* the current one: cream and moss */
  moss: { paper: "#e9ecdc", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  /* moss on neutral paper (no green in the background), a step darker so the white glass shows */
  stone: { paper: "#dcd8d1", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  grey: { paper: "#d8d8d6", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  sand: { paper: "#ddd4c6", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  /* her alternative: warm stone paper with a graphite sand */
  graphite: { paper: "#dcd8d1", ink: "#32312f", deep: "#201f1e", light: "#53524f", text: "#151414" },
  /* moss on light blue paper, dark enough that the white glass still lifts off it */
  mist: { paper: "#d3dde3", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  powder: { paper: "#cfdbe8", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  sky: { paper: "#c6d7ec", ink: "#4a683e", deep: "#2e4826", light: "#688458", text: "#1f3315" },
  /* warm black and white: off-white bone paper, a soft warm black */
  mono: { paper: "#f3f0ea", ink: "#2b2925", deep: "#141311", light: "#77716a", text: "#1a1815" },
  /* cobalt: a cool near-white with an electric blue ball */
  cobalt: { paper: "#eef0f4", ink: "#2f4cf0", deep: "#1a2c9e", light: "#6f86ff", text: "#0f1430" },
  /* clay: warm sand paper with a terracotta ball and a deep brown text */
  clay: { paper: "#f2ece3", ink: "#c4572f", deep: "#8a3518", light: "#de8a62", text: "#2b1c15" },
};

const DEFAULT = "meadow";
const KEY = "gtoft-palette-2"; /* (bumped with the bright redesign, so older picks don't hide it) */ /* the picker's choice, remembered in this browser */

export function currentPalette(): Palette {
  if (typeof window === "undefined") return PALETTES[DEFAULT];
  const name = new URLSearchParams(window.location.search).get("palette");
  if (name && PALETTES[name]) return PALETTES[name];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved?.paper && saved?.ink) return fromPicks(saved.paper, saved.ink, saved.glass);
  } catch {}
  return PALETTES[DEFAULT];
}

/* ---------- the live palette: the picker changes it, the page and the shaders follow ---------- */

const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hexOf = (c: number[]) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/* from the two picked colours: the sand's darker and paler tones and a dark text in the same hue
   (the same ratios as the original moss set) */
export function fromPicks(paper: string, ink: string, glass = "#ffffff"): Palette {
  const c = rgbOf(ink);
  return {
    paper,
    ink,
    glass,
    deep: hexOf(c.map((v) => v * 0.65)),
    light: hexOf(c.map((v) => v + (255 - v) * 0.17)),
    text: hexOf(c.map((v) => v * 0.42)),
  };
}

let live: Palette | null = null;
const listeners = new Set<() => void>();
export const livePalette = () => (live ??= currentPalette());
export function onPalette(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function setPicks(paper: string, ink: string, glass = "#ffffff", remember = true) {
  live = fromPicks(paper, ink, glass);
  applyPaletteCss(live);
  if (remember) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ paper, ink, glass }));
    } catch {}
  }
  listeners.forEach((fn) => fn());
}
export function resetPicks() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  live = PALETTES[DEFAULT];
  applyPaletteCss(live);
  listeners.forEach((fn) => fn());
}
export const DEFAULT_PALETTE = () => PALETTES[DEFAULT];

/* the CSS side: the Tailwind theme colours are CSS variables, so overriding them recolours everything */
export function applyPaletteCss(p: Palette) {
  const s = document.documentElement.style;
  s.setProperty("--color-cream", p.paper);
  s.setProperty("--color-leaf", p.paper);
  s.setProperty("--color-moss", p.text);
  s.setProperty("--glass", p.glass ?? "#ffffff");
  s.setProperty("--ink", p.ink);
}

/* the GLSL side: the fragment shaders are written with the moss colours as constants; they become
   uniforms (set every frame from the live palette) so a new colour shows at once */
export function liveColours(fs: string) {
  return fs
    .replace("const vec3 CREAM = vec3(233.0, 236.0, 220.0) / 255.0;", "uniform vec3 CREAM;")
    .replace("const vec3 GREEN = vec3(74.0, 104.0, 62.0) / 255.0;", "uniform vec3 GREEN;")
    .replace("const vec3 DEEP  = vec3(46.0, 72.0, 38.0) / 255.0;", "uniform vec3 DEEP;")
    .replace("const vec3 LIGHT = vec3(104.0, 132.0, 88.0) / 255.0;", "uniform vec3 LIGHT;");
}
export const rgb01 = (hex: string): [number, number, number] => {
  const [r, g, b] = rgbOf(hex);
  return [r / 255, g / 255, b / 255];
};
