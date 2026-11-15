"use client";

import { useEffect, useRef } from "react";
import { reducedMotion, shadow } from "./wind";

/* Green ground in dappled sunlight (random light-green patches), with the lilies' shadows on top: the lilies
   paint a small shadow map every frame (wind.ts), and this shader uses it as its light, so
   the shadows sway together with the flowers. Plus sand grain, paper texture and slow colour shifts. */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 res;
uniform float t;
uniform float dpr;
uniform sampler2D shadowMap;
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float soft(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 2.1; a *= 0.5; }
  return v / 0.875;
}

/* dappled sunlight: soft patches stretched along a diagonal, drifting slowly */
float dapple(vec2 uv, float t) {
  mat2 rot = mat2(0.82, 0.57, -0.57, 0.82);
  vec2 q = rot * uv * vec2(1.7, 3.6);
  vec2 w = vec2(soft(q * 0.7 + vec2(0.0, t * 0.06)), soft(q * 0.7 + vec2(5.2, 1.3) - t * 0.05));
  float n = soft(q + 0.55 * w + vec2(t * 0.015, 0.0));
  return smoothstep(0.30, 0.56, n);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / res.y;
  uv.y = 1.0 - uv.y;

  vec2 px = frag / max(dpr, 1.0);            /* CSS pixels, so the texture is the same size on every screen */

  /* sand: clumpy grains of 1-3px, made of two sizes of noise plus single-pixel sparkle */
  float sand = 0.5 * noise(px * 0.9) + 0.3 * noise(px * 1.9 + 7.0) + 0.2 * hash(floor(px));

  /* random patches of sunlight, then the lilies' own shadows on top */
  float light = dapple(uv, t);
  light = mix(light, light * smoothstep(0.1, 0.9, dapple(uv * 0.45 + 3.0, t * 0.6)), 0.2);
  float fall = texture(shadowMap, vec2(frag.x / res.x, 1.0 - frag.y / res.y)).a;
  light *= 1.0 - 0.88 * fall;
  /* the grains catch the light on their own, so shadow edges break up into speckle */
  light = clamp(light + (sand - 0.5) * 0.45 * (1.0 - abs(light * 2.0 - 1.0)), 0.0, 1.0);

  /* colour shifts: the greens drift slowly across the page and over time */
  float drift = sin(t * 0.07 + uv.x * 1.3 - uv.y * 0.8) * 0.5 + 0.5;
  float drift2 = sin(t * 0.05 + uv.y * 1.7 + 2.0) * 0.5 + 0.5;
  vec3 deep = mix(vec3(0.055, 0.12, 0.035), vec3(0.045, 0.105, 0.045), drift);  /* moss -> pine */
  vec3 lit  = mix(vec3(0.14, 0.23, 0.09), vec3(0.17, 0.24, 0.10), drift2); /* leaf -> chartreuse */
  vec3 col = mix(deep, lit, light);
  /* warm sun in the brightest patches, cool in the deepest shade */
  col += vec3(0.03, 0.02, -0.01) * smoothstep(0.75, 1.0, light);
  col += vec3(-0.01, 0.0, 0.015) * (1.0 - smoothstep(0.0, 0.3, light));

  /* sand grain over the whole surface: light and dark grains, loud in the sun, quiet in the shade */
  float amp = mix(0.2, 0.30, light);
  col *= 1.0 + amp * (sand - 0.5) * 1.6;
  /* a few bright crystals and dark pits */
  float h = hash(floor(px) + 31.0);
  col *= 1.0 + 0.12 * light * step(0.985, h) - 0.12 * step(h, 0.012);

  /* ---- vintage paper ---- */

  /* aged ink: a little desaturated and warmed toward sepia */
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum) * vec3(1.08, 1.0, 0.82), 0.14);

  /* paper mottling: soft cloudy unevenness in the stock */
  float mott = soft(px * 0.012) - 0.5;
  col *= 1.0 + 0.07 * mott;


  /* foxing: rare small rust-brown age spots */
  vec2 fc = floor(px / 90.0);
  vec2 fpos = (fc + vec2(hash(fc), hash(fc + 3.3))) * 90.0;
  float fox = step(0.86, hash(fc + 11.0)) * (1.0 - smoothstep(0.0, 3.0 + 6.0 * hash(fc + 5.0), length(px - fpos)));
  col = mix(col, col * vec3(0.92, 0.84, 0.66), fox * 0.35);

  /* worn edges: a soft darker, warmer border like an old print */
  vec2 c = frag / res - 0.5;
  float edge = smoothstep(0.18, 0.52, dot(c, c) * 1.6);
  col *= 1.0 - 0.22 * edge;
  col = mix(col, col * vec3(1.04, 0.98, 0.84), edge * 0.5);

  o = vec4(col, 1.0);
}`;

export function Background() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "res");
    const uT = gl.getUniformLocation(prog, "t");
    const uDpr = gl.getUniformLocation(prog, "dpr");

    /* the lilies' shadow map, re-uploaded each frame (it is small) */
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(gl.getUniformLocation(prog, "shadowMap"), 0);

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const still = reducedMotion();
    const start = performance.now();
    let raf = 0;
    const draw = () => {
      const t = still ? 12 : 12 + (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uDpr, dpr);
      if (shadow.canvas && shadow.canvas.width > 0) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, shadow.canvas);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      /* with reduced motion, keep drawing briefly so the still shadows arrive, then stop */
      if (!still || performance.now() - start < 1500) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full bg-[#4d7a35]"
    />
  );
}
