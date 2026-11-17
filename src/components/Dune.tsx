"use client";

import { useEffect, useRef, useState } from "react";
import { DUNE_GLSL } from "./dune-glsl";

/* The dunes, in the same print as the ball: soft grainy tone in moss ink on the cream paper,
   no lines. A hazy desert at golden hour, seen side on: five soft ranges stepping back to a
   low horizon (with one far mound), a big smooth dune sweeping up on the right in front.
   - each range is a soft silhouette; the further back, the paler (the haze);
   - the sun sits high on the right: slopes that fall away to the right catch it and stay light,
     slopes that rise to the right turn away and deepen;
   - just under each crest the sand is lightest, and it deepens towards the foot, the way the
     ball deepens towards its lower rim;
   - the sky is nearly bare paper, with a breath of haze over the horizon;
   - all of it goes through the ball's grain (loudest in the half-tones).

   The dunes form from the falling sand, dot by dot: every place on them has an arrival moment
   (arrive(), shared with the falling grains so each grain lands exactly then). The front and
   lower slopes come first, the crests and the far mound last. At its moment a place appears in
   fine grains, the ball's dissolve in reverse. `fill` here is that fall progress, 0 … 1. */

const QUAD = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const DUNE_FS = `#version 300 es
precision highp float;
uniform vec2 res;       /* CSS pixels */
uniform float dpr;
uniform float fill;     /* 0 … 1: how far the sand has fallen */
uniform vec2 origin;    /* the canvas's top-left on the page, so the grain sticks to the paper */
out vec4 o;
${DUNE_GLSL}
void main() {
  vec2 css = gl_FragCoord.xy / dpr;
  vec2 s = vec2(css.x, res.y - css.y);              /* y down */
  float X = css.x / res.x, Y = s.y / res.y;

  /* the sky: paper, warming into haze over the horizon, barest at the sun, top right */
  float sun = smoothstep(0.05, 0.85, length(vec2((X - 0.95) * res.x / res.y, Y - 0.05)) * 0.9);
  float cover = (0.03 + 0.12 * smoothstep(0.15, 0.6, Y)) * mix(0.35, 1.0, sun);

  vec2 du = dunes(s, res, fill, 0.0);
  cover = mix(cover, du.x, du.y);
  vec3 ink = mix(GREEN, DEEP, smoothstep(0.35, 0.85, cover));
  o = vec4(paperGrain(s + origin, cover, ink), 1.0);
}`;

/* a canvas that draws the dunes, filling its parent */
export function Dune({ fill = 1, className = "" }: { fill?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useRef<(f: number) => void>(() => {});

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) return;
    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, QUAD], [gl.FRAGMENT_SHADER, DUNE_FS]] as const) {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);

    let last = 1;
    draw.current = (f: number) => {
      last = f;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u("res"), r.width, r.height);
      gl.uniform1f(u("dpr"), dpr);
      gl.uniform1f(u("fill"), f);
      gl.uniform2f(u("origin"), r.left + window.scrollX, r.top + window.scrollY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const ro = new ResizeObserver(() => draw.current(last));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => draw.current(fill), [fill]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}

/* the lab page: the dunes on their own, with a slider for how much sand has arrived */
export function DuneLab() {
  const [fill, setFill] = useState(1);
  return (
    <main className="relative h-dvh w-full bg-cream">
      <Dune fill={fill} />
      <label className="absolute left-4 top-4 flex items-center gap-3 rounded-full bg-cream/80 px-4 py-2 text-sm text-moss backdrop-blur">
        sand
        <input type="range" min={0} max={1} step={0.01} value={fill} onChange={(e) => setFill(+e.target.value)} />
      </label>
    </main>
  );
}
