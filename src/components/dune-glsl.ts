/* The dunes in GLSL, shared by the dune lab (Dune.tsx) and the sand flow (flow.ts): the inks,
   the ball's grain, the ranges and when the sand arrives at each place. Kept free of React so the
   flow's worker can import it. */

/* shared with the hero's paper shader: the inks, the grain and the dunes */
export const DUNE_GLSL = `
const vec3 CREAM = vec3(233.0, 236.0, 220.0) / 255.0;  /* the ball's paper and inks */
const vec3 GREEN = vec3(74.0, 104.0, 62.0) / 255.0;
const vec3 DEEP  = vec3(46.0, 72.0, 38.0) / 255.0;

float hash(vec2 q) {
  uvec2 u = uvec2(ivec2(q) + 65536);
  uint h = u.x * 374761393u + u.y * 668265263u;
  h = (h ^ (h >> 13u)) * 1274126177u;
  return float(h ^ (h >> 16u)) / 4294967295.0;
}
float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }

/* the ball's grain (1-2px clumps, loudest in the half-tones) and the paper speckle */
vec3 paperGrain(vec2 px, float cover, vec3 ink) {
  vec2 g = floor(px);
  /* the grain lives only in the green: bare paper is flat cream, and the grain fades in softly
     with the first trace of ink so there is no edge where it starts */
  float inked = smoothstep(0.0, 0.06, cover);
  float n = 0.6 * hash(g) + 0.4 * hash(floor(g / 2.0) + vec2(0.0, 9173.0)) - 0.5;
  cover = clamp(cover + n * inked * (0.22 + 1.5 * cover * (1.0 - cover)), 0.0, 1.0);
  float sp = inked * (hash(g + vec2(5101.0, 77.0)) - 0.5) * 20.0 / 255.0;
  return mix(CREAM, ink, cover) + vec3(sp, sp, sp * 0.9);
}

/* the crest of each range, as a height from the top (0 top … 1 bottom), at x (0 … 1) */
float crest(int i, float x) {
  if (i == 0) return 0.575 - 0.012 * sin(x * 9.0 + 1.0) - 0.075 * bump(x, 0.33, 0.075) - 0.02 * bump(x, 0.55, 0.12);  /* the far line and its mound */
  if (i == 1) return 0.6 - 0.018 * sin(x * 7.0 + 2.2) - 0.03 * bump(x, 0.14, 0.12) - 0.02 * bump(x, 0.7, 0.14);
  if (i == 2) return 0.655 - 0.03 * bump(x, 0.05, 0.16) - 0.02 * sin(x * 5.0 + 0.4) - 0.025 * bump(x, 0.62, 0.18);
  if (i == 3) return 0.84 - 0.29 * smoothstep(0.25, 1.05, x) + 0.02 * sin(x * 6.0);          /* the big one on the right */
  return 0.9 - 0.13 * bump(x, 0.0, 0.32) + 0.04 * smoothstep(0.4, 1.0, x);                  /* the swell in front, left */
}
/* how much ink each range carries: paler with distance */
const float BASE[5] = float[](0.24, 0.33, 0.43, 0.56, 0.66);
/* how far down each range its tone deepens: short for the far ranges, long in front */
const float SPAN[5] = float[](0.035, 0.05, 0.08, 0.2, 0.12);

/* when the sand arrives at screen point s (CSS px, y down), in fall progress. Each range piles
   up from its foot to its crest; the front ranges come first, the far ones and the mound last,
   with a slow ripple so the front isn't ruled. Used by the dunes (to appear then) and by the
   falling grains (to land then). */
float arrNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = hash(i + 4000.0), b = hash(i + vec2(4001.0, 4000.0)), c = hash(i + vec2(4000.0, 4001.0)), d = hash(i + 4001.0);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float arrive(vec2 s, vec2 size) {
  float span = max(size.x, 1.6 * size.y);
  float X = (s.x - 0.5 * size.x) / span + 0.5;
  float Y = (s.y / size.y - 0.3) / 0.7;
  /* blended softly across the ranges (back to front), so the schedule never jumps at a crest:
     the dunes can only fade in, never along a line */
  float t = 0.92;
  for (int i = 0; i < 5; i++) {
    float d = Y - crest(i, X);
    float far = 1.0 - float(i) / 4.0;
    float ti = 0.42 + 0.26 * far + 0.24 * (1.0 - smoothstep(0.0, 0.18, max(d, 0.0)));
    t = mix(t, ti, smoothstep(-0.06, 0.06, d));
  }
  return clamp(t + 0.06 * (arrNoise(s / 90.0) - 0.5), 0.36, 0.95);
}

/* the dunes at screen point s (CSS px, y down) on a screen of this size, drawn in the band
   from y0 (0 … 1 of the height) down to the bottom: returns (how much ink, how much dune) */
vec2 dunes(vec2 s, vec2 size, float fill, float y0) {
  float span = max(size.x, 1.6 * size.y);           /* narrow screens see a middle crop, not a squeezed view */
  float X = (s.x - 0.5 * size.x) / span + 0.5;
  float Y = (s.y / size.y - y0) / (1.0 - y0);
  float tall = size.y * (1.0 - y0);
  float feather = 0.012;
  float cover = 0.0, alpha = 0.0;
  for (int i = 0; i < 5; i++) {
    float top = crest(i, X);
    float d = Y - top;                               /* depth below the crest */
    float a = smoothstep(-feather * 0.4, feather, d);
    if (a <= 0.0) continue;
    float slope = (crest(i, X + 0.004) - crest(i, X - 0.004)) / 0.008 * tall / span;
    float turned = smoothstep(-0.12, 0.35, -slope);  /* rises to the right: turned from the sun */
    float c = BASE[i] * (0.8 + 0.4 * turned);
    /* lightest just under the crest, deepening down to the foot, so every crest stands out
       against the shadowed foot of the range behind it */
    c *= mix(0.42, 1.25, smoothstep(0.0, SPAN[i], d));
    cover = alpha > 0.0 ? mix(cover, c, a) : c;
    alpha = alpha + a * (1.0 - alpha);
  }
  /* formed only where the sand has arrived: clump by clump, the ball's dissolve in reverse */
  /* it accumulates: thin at first, as the first grains arrive, filling in as more land */
  float k = smoothstep(-0.02, 0.12, fill - arrive(s, size));
  alpha *= step(hash(floor(s) + vec2(31.0, 7.0)), k);
  return vec2(cover, alpha);
}
`;
