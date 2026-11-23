/* The bent edges of the case row, drawn with WebGL2.

   Two passes, every frame the row moves:
   1. the cards near the screen edges are drawn as rounded pictures (each card's resting
      frame, see public/images/home) into an offscreen picture of the row, with mipmaps so
      it can be blurred cheaply;
   2. that picture is drawn back through a "glass rim": towards each side the row is pulled
      wider (more and more, like an exponential lens), taller (a flare), blurrier and
      smeared sideways, the colours split a little, and a soft coloured halo follows the
      flare's outline. The middle of the screen is left to the real cards (the DOM).

   All lengths in the shaders are in the canvas' own 0…1 space. */

export const EDGE = {
  zone: 0.84, // where the bend starts (0 = middle, 1 = screen edge), at rest
  zoneSpeed: 0.14, // the bend reaches further in while the row moves
  stretch: 2, // how hard the edge pulls the row wider
  flare: 0.62, // how much taller it gets at the very edge
  flarePow: 1.8,
  split: 0.03, // colour split
  blur: 4.6, // mip levels of blur at the very edge
  smear: 0.14,
  vivid: 0.45, // extra colour towards the edge
  halo: 0.9,
  haloWidth: 0.2,
  haloHue: (52 * Math.PI) / 180,
  seamPx: 64, // the real cards fade into the drawn ones over this many pixels
  introMs: 700,
  heightFactor: 2.8, // the canvas is this many cards tall, so the flare has room
};

const CARD_VS = `#version 300 es
in vec2 corner;
uniform vec2 centre, size, view;
out vec2 uv;
void main() {
  uv = corner + 0.5;
  vec2 px = centre + corner * size;
  gl_Position = vec4(px / view * 2.0 - 1.0, 0.0, 1.0);
}`;

const CARD_FS = `#version 300 es
precision highp float;
uniform sampler2D pic;
uniform vec2 size;
uniform float radius, picAspect, ready;
in vec2 uv;
out vec4 outColor;
void main() {
  // a rounded rectangle, its edge smoothed by one screen pixel
  vec2 p = (uv - 0.5) * size;
  vec2 q = abs(p) - (0.5 * size - radius);
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float px = max(fwidth(dist), 1e-5);
  float inside = 1.0 - smoothstep(-px, px, dist);
  // the picture covers the card, cropped if its shape differs
  float cardAspect = size.x / size.y;
  vec2 fit = picAspect > cardAspect ? vec2(cardAspect / picAspect, 1.0) : vec2(1.0, picAspect / cardAspect);
  vec3 c = mix(vec3(1.0), texture(pic, (uv - 0.5) * fit + 0.5).rgb, ready);
  outColor = vec4(c * inside, inside);
}`;

const FULL_VS = `#version 300 es
in vec2 corner;
out vec2 uv;
void main() {
  uv = corner + 0.5;
  gl_Position = vec4(corner * 2.0, 0.0, 1.0);
}`;

const RIM_FS = `#version 300 es
precision highp float;
uniform sampler2D row;
uniform float zone, pull, flare, flarePow, split, blur, smear, vividness, halo, haloWidth, haloHue, reveal, seam;
in vec2 uv;
out vec4 outColor;

// where on the flat row a point of the bent edge looks: t is 0 where the bend starts, 1 at the edge
vec2 lens(float y, float t, float pullScale, float flareScale) {
  float k = max(pull * pullScale, 1e-3);
  float across = zone + (1.0 - zone) * (1.0 - exp(-k * t)) / k;
  float taller = 1.0 + flare * flareScale * pow(t, flarePow);
  return vec2(across, 0.5 + (y - 0.5) / taller);
}

vec4 look(vec2 at, float side, float lod) {
  return textureLod(row, vec2(0.5 + 0.5 * side * at.x, at.y), lod);
}

// the bent, blurred, smeared and colour-split row
vec4 bent(float y, float side, float t) {
  float lod = blur * t * t;
  float reach = smear * (1.0 - zone) * t * t;
  vec4 c = vec4(0.0);
  for (int ch = 0; ch < 3; ch++) {
    float o = float(ch) - 1.0;
    vec2 at = lens(y, t, 1.0 + o * split, 1.0 + o * split * 2.0);
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) sum += look(at - vec2(float(i) / 3.0 * reach, 0.0), side, lod);
    sum *= 0.25;
    c[ch] = sum[ch];
    if (ch == 1) c.a = sum.a;
  }
  return c;
}

// the same, flared a little further, for the halo outside the outline
vec4 wider(float y, float side, float t, float flareScale, float lod) {
  vec2 at = lens(y, t, 1.0, flareScale);
  float reach = smear * (1.0 - zone) * t * t;
  return 0.5 * (look(at, side, lod) + look(at - vec2(reach, 0.0), side, lod));
}

vec3 unpremul(vec4 c) { return c.rgb / max(c.a, 1e-3); }

vec3 turnHue(vec3 c, float a) {
  const vec3 axis = vec3(0.57735);
  return c * cos(a) + cross(axis, c) * sin(a) + axis * dot(axis, c) * (1.0 - cos(a));
}

vec3 bright(vec3 c) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = max(mix(vec3(l), c, 1.7), 0.0);
  return clamp(c / max(max(c.r, max(c.g, c.b)), 0.2) * 0.96, 0.0, 1.0);
}

vec4 over(vec3 rgb, float a, vec4 under) { return vec4(rgb * a, a) + under * (1.0 - a); }

void main() {
  float x = uv.x * 2.0 - 1.0;
  float t = clamp((abs(x) - zone) / max(1.0 - zone, 1e-3), 0.0, 1.0);
  vec4 flat_ = textureLod(row, uv, 0.0);
  if (t <= 0.0) { outColor = abs(x) >= zone - seam ? flat_ : vec4(0.0); return; }

  float side = sign(x);
  vec4 c = bent(uv.y, side, t);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = clamp(mix(vec3(l), c.rgb, 1.0 + vividness * t), 0.0, c.a);

  float lod = blur * t * t;
  vec4 h1 = wider(uv.y, side, t, 1.0 + haloWidth, lod + 0.7);
  vec4 h2 = wider(uv.y, side, t, 1.0 + 2.2 * haloWidth, lod + 1.3);
  float a1 = clamp(h1.a - c.a, 0.0, 1.0);
  float a2 = clamp(h2.a - max(c.a, h1.a), 0.0, 1.0);
  float w = halo * sqrt(t);
  c = over(bright(turnHue(unpremul(h1), -haloHue)), clamp(a1 * w, 0.0, 1.0), c);
  c = over(mix(bright(turnHue(unpremul(h2), -haloHue * 1.35)), vec3(1.0), 0.4), clamp(a2 * w, 0.0, 1.0), c);

  outColor = mix(flat_, c, reveal);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
    gl.attachShader(prog, sh);
    gl.deleteShader(sh);
  }
  gl.bindAttribLocation(prog, 0, "corner");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  return prog;
}

const uniforms = (gl: WebGL2RenderingContext, p: WebGLProgram, names: string[]) =>
  Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));

function texture(gl: WebGL2RenderingContext, min: number) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export type Frame = { centres: number[]; zone: number; speed: number; now: number };
export type Layout = { width: number; height: number; cardW: number; cardH: number };

export function createEdgeGl(host: HTMLElement, pictures: string[], onLost: () => void) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, failIfMajorPerformanceCaveat: true });
  if (!gl) throw new Error("no WebGL2");
  host.appendChild(canvas);

  const cardProg = compile(gl, CARD_VS, CARD_FS);
  const rimProg = compile(gl, FULL_VS, RIM_FS);
  const cu = uniforms(gl, cardProg, ["pic", "centre", "size", "view", "radius", "picAspect", "ready"]);
  const ru = uniforms(gl, rimProg, ["row", "zone", "pull", "flare", "flarePow", "split", "blur", "smear", "vividness", "halo", "haloWidth", "haloHue", "reveal", "seam"]);

  gl.useProgram(cardProg);
  gl.uniform1i(cu.pic, 0);
  gl.uniform1f(cu.radius, 18);
  gl.useProgram(rimProg);
  gl.uniform1i(ru.row, 0);
  gl.uniform1f(ru.flarePow, EDGE.flarePow);
  gl.uniform1f(ru.split, EDGE.split);
  gl.uniform1f(ru.blur, EDGE.blur);
  gl.uniform1f(ru.vividness, EDGE.vivid);
  gl.uniform1f(ru.halo, EDGE.halo);
  gl.uniform1f(ru.haloWidth, EDGE.haloWidth);
  gl.uniform1f(ru.haloHue, EDGE.haloHue);

  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const rowTex = texture(gl, gl.LINEAR_MIPMAP_LINEAR);
  const fbo = gl.createFramebuffer();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  // each card's resting frame, loaded once
  const pics = pictures.map((src) => {
    const p = { tex: texture(gl, gl.LINEAR), aspect: 1, ready: false };
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (gone) return;
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      p.aspect = img.naturalWidth / img.naturalHeight || 1;
      p.ready = true;
      dirty = true;
    };
    img.src = src;
    return p;
  });

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let layout: Layout | null = null;
  let last: Frame | null = null;
  let born: number | null = null;
  let dirty = true;
  let gone = false;

  const lost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  return {
    get ready() {
      return pics.every((p) => p.ready);
    },
    resize(l: Layout) {
      layout = l;
      last = null;
      canvas.width = Math.max(1, Math.round(l.width * dpr));
      canvas.height = Math.max(1, Math.round(l.height * dpr));
      gl.bindTexture(gl.TEXTURE_2D, rowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rowTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    render(f: Frame) {
      if (gone || !layout || gl.isContextLost()) return;
      born ??= f.now;
      const intro = f.now - born < EDGE.introMs;
      const same = last && last.zone === f.zone && last.speed === f.speed && last.centres.every((c, i) => c === f.centres[i]);
      if (same && !intro && !dirty) return;
      last = f;
      dirty = false;

      const { width: W, height: H, cardW, cardH } = layout;
      // only the cards that reach into the bent edges need drawing
      const reach = (f.zone - Math.max((2 * EDGE.seamPx) / W, EDGE.smear * (1 + f.speed) * (1 - f.zone)) - 0.05) * (W / 2);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(cardProg);
      gl.uniform2f(cu.size, cardW, cardH);
      gl.uniform2f(cu.view, W, H);
      gl.activeTexture(gl.TEXTURE0);
      f.centres.forEach((cx, i) => {
        const onScreen = cx + cardW / 2 > 0 && cx - cardW / 2 < W;
        const far = Math.max(Math.abs(cx - cardW / 2 - W / 2), Math.abs(cx + cardW / 2 - W / 2));
        if (!onScreen || far < reach) return;
        const p = pics[i];
        gl.bindTexture(gl.TEXTURE_2D, p.tex);
        gl.uniform2f(cu.centre, cx, H / 2);
        gl.uniform1f(cu.picAspect, p.aspect);
        gl.uniform1f(cu.ready, p.ready ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      gl.bindTexture(gl.TEXTURE_2D, rowTex);
      gl.generateMipmap(gl.TEXTURE_2D);

      const k = Math.min(1, Math.max(0, (f.now - born) / EDGE.introMs));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(rimProg);
      gl.uniform1f(ru.zone, f.zone);
      gl.uniform1f(ru.pull, EDGE.stretch * (1 + f.speed));
      gl.uniform1f(ru.flare, EDGE.flare * (1 + 0.35 * f.speed));
      gl.uniform1f(ru.smear, EDGE.smear * (1 + f.speed));
      gl.uniform1f(ru.reveal, 1 - Math.pow(1 - k, 3));
      gl.uniform1f(ru.seam, (2 * EDGE.seamPx) / W);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      if (gone) return;
      gone = true;
      canvas.removeEventListener("webglcontextlost", lost);
      pics.forEach((p) => gl.deleteTexture(p.tex));
      gl.deleteTexture(rowTex);
      gl.deleteFramebuffer(fbo);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(cardProg);
      gl.deleteProgram(rimProg);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}

export type EdgeGl = ReturnType<typeof createEdgeGl>;
