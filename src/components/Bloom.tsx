"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildHobbies, type Build } from "./sculptures";

/* Lisa's hobbies as 3D sculptures made of thousands of tiny blue dots, each one building
   itself live from start to finished (see sculptures.ts): parts appear where they are made.
   The sculpture turns slowly (or rocks, when it has a front) and leans toward the cursor;
   dots further away are smaller and fainter. Between hobbies the dots swirl loose and
   re-form. Hovering scatters the dots, and a spring pulls them back. */

const COLOR = [0x5b / 255, 0x8b / 255, 0xd0 / 255]; // the sky blue of the headline
const DOTS = 20000;
const DOT_PX = 1.1; // dot size in CSS pixels (front dots a little bigger, back ones smaller)
const ALPHA = 0.62;
const BACK_ALPHA = 0.22; // how faint the furthest dots get, as a share of the nearest
const PERSP = 60; // camera distance in sculpture units: lower is a stronger 3D look
const TURN = 0.42; // radians per second they turn on their own
const LEAN_YAW = 0.7, LEAN_PITCH = 0.35; // how far they lean toward the cursor
const LEAN_EASE = 3; // how quickly they follow it
const SPREAD = 0.42; // how far a dot can sit off its surface; most stay close, a few stray
const SWIRL = 1.6; // how far dots swirl loose while changing hobby
const ROCK = 0.55, ROCK_SPEED = 0.45; // how far and fast the easel and frame rock
const MORPH_K = 4; // changing hobby: spring stiffness and damping (slightly bouncy)
const MORPH_D = 3.4;
const START = 0.6; // seconds the raw material shows before the build starts
const FINISHED = 2.8; // seconds the finished piece stays
const HOVER_R = 34; // px around the cursor that dots move away from
const HOVER_PUSH = 200; // px/s added per frame at the cursor's centre
const BACK_K = 25; // the spring that pulls pushed dots home
const BACK_D = 9;
const MARGIN_X = 8; // px kept clear at the sides of the rectangle
const MARGIN_Y = 40; // px kept clear at the top and bottom, for the captions
const NEAR_GROW = 1.12; // allowance for the nearest dots looking bigger

const vertex = /* glsl */ `
  uniform mat3 uRot;
  uniform float uMorph, uClock, uScale, uSize, uSwirl, uPersp, uRadius;
  attribute vec3 aNow, aPrev;
  attribute float aShow, aShowPrev;
  attribute vec3 aSpread;
  attribute vec2 aPush, aSeed;
  varying float vNear, vShow;

  void main() {
    float m = clamp(uMorph, 0.0, 1.0);
    float loose = 4.0 * m * (1.0 - m);
    vec3 swirl = vec3(
      sin(aSeed.x * 23.0 + uClock * 2.3),
      cos(aSeed.y * 19.0 + uClock * 1.9),
      sin((aSeed.x + aSeed.y) * 17.0 + uClock * 2.1)
    ) * loose * uSwirl;
    vShow = mix(aShowPrev, aShow, m);
    vec3 p = uRot * (mix(aPrev, aNow, uMorph) + aSpread + swirl);
    float persp = uPersp / (uPersp - p.z);
    vNear = clamp(p.z / uRadius * 0.5 + 0.5, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xy * persp * uScale + aPush, 0.0, 1.0);
    gl_PointSize = vShow < 0.01 ? 0.0 : uSize * mix(0.7, 1.35, vNear);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha, uBack;
  varying float vNear, vShow;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (vShow < 0.01 || dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uColor, uAlpha * vShow * mix(uBack, 1.0, vNear));
  }
`;

export function Bloom({ onShape }: { onShape?: (index: number) => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onShapeRef = useRef(onShape);
  useEffect(() => {
    onShapeRef.current = onShape;
  }, [onShape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const builds = buildHobbies(DOTS);

    /* per-dot data */
    const aNow = new Float32Array(DOTS * 3), aPrev = new Float32Array(DOTS * 3);
    const aShow = new Float32Array(DOTS), aShowPrev = new Float32Array(DOTS);
    const aSpread = new Float32Array(DOTS * 3), aSeed = new Float32Array(DOTS * 2);
    const aPush = new Float32Array(DOTS * 2), vel = new Float32Array(DOTS * 2);
    const tilt = new Float32Array(DOTS * 2); // each dot gets pushed off at its own slight angle
    for (let i = 0; i < DOTS; i++) {
      // a random direction, most dots very close to their surface, a few strays
      let x = 0, y = 0, z = 0, l = 0;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        l = Math.hypot(x, y, z);
      } while (l > 1 || l < 1e-3);
      const r = Math.pow(Math.random(), 2.6) * SPREAD;
      aSpread.set([(x / l) * r, (y / l) * r, (z / l) * r], i * 3);
      aSeed[i * 2] = Math.random();
      aSeed[i * 2 + 1] = Math.random();
      const t = (Math.random() - 0.5) * 1.3, strength = 0.35 + Math.random() * 1.3;
      tilt[i * 2] = Math.cos(t) * strength;
      tilt[i * 2 + 1] = Math.sin(t) * strength;
    }

    /* each hobby: centred on its height range over the whole build, and how far it reaches
       sideways (any way it turns) and up/down (from its viewing angle) */
    const centre: number[] = [], side: number[] = [], upDown: number[] = [];
    builds.forEach((b, h) => {
      let lo = Infinity, hi = -Infinity, sd = 0, ud = 0;
      const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        b.update(t, aNow, aShow);
        return { pos: aNow.slice(), show: aShow.slice() };
      });
      for (const f of frames) for (let i = 0; i < DOTS; i++) {
        if (f.show[i] < 0.01) continue;
        lo = Math.min(lo, f.pos[i * 3 + 1]);
        hi = Math.max(hi, f.pos[i * 3 + 1]);
      }
      centre[h] = (lo + hi) / 2;
      const c = Math.cos(b.view), s = Math.sin(b.view);
      for (const f of frames) for (let i = 0; i < DOTS; i++) {
        if (f.show[i] < 0.01) continue;
        const r = Math.hypot(f.pos[i * 3], f.pos[i * 3 + 2]);
        sd = Math.max(sd, r);
        ud = Math.max(ud, Math.abs(f.pos[i * 3 + 1] - centre[h]) * c + r * s);
      }
      side[h] = sd + SPREAD;
      upDown[h] = ud + SPREAD;
    });

    /* place hobby h at build progress t into aNow / aShow */
    const place = (h: number, t: number) => {
      builds[h].update(t, aNow, aShow);
      const c = centre[h];
      for (let i = 1; i < DOTS * 3; i += 3) aNow[i] -= c;
    };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3));
    const attr = (name: string, arr: Float32Array, size: number) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const nowAttr = attr("aNow", aNow, 3), prevAttr = attr("aPrev", aPrev, 3);
    const showAttr = attr("aShow", aShow, 1), showPrevAttr = attr("aShowPrev", aShowPrev, 1);
    const pushAttr = attr("aPush", aPush, 2);
    attr("aSpread", aSpread, 3);
    attr("aSeed", aSeed, 2);

    let hobby = 0;
    place(hobby, still ? 1 : 0);
    aPrev.set(aNow);
    aShowPrev.set(aShow);

    const rot = new THREE.Matrix3();
    const uniforms = {
      uRot: { value: rot },
      uClock: { value: 0 },
      uMorph: { value: 1 },
      uScale: { value: 1 },
      uSize: { value: DOT_PX },
      uSwirl: { value: SWIRL },
      uPersp: { value: PERSP },
      uRadius: { value: 10.5 }, // roughly how deep the sculptures are, for the near/far fade
      uColor: { value: new THREE.Vector3(...COLOR) },
      uAlpha: { value: ALPHA },
      uBack: { value: BACK_ALPHA },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false });
    const dots = new THREE.Points(geo, mat);
    dots.frustumCulled = false;

    const scene = new THREE.Scene();
    scene.add(dots);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setClearColor(0x000000, 0);

    /* size: the camera works in CSS pixels with 0,0 in the middle of the rectangle; each
       hobby is as big as the rectangle allows across its whole build */
    let w = 1, h = 1, scale = 1;
    const hobbyScale: number[] = [];
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
      camera.updateProjectionMatrix();
      builds.forEach((_, k) => {
        hobbyScale[k] = Math.min(Math.max(1, w / 2 - MARGIN_X) / (side[k] * NEAR_GROW), Math.max(1, h / 2 - MARGIN_Y) / (upDown[k] * NEAR_GROW));
      });
      uniforms.uSize.value = DOT_PX * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* the cursor, in the same centred pixels (y up) */
    let mx = 0, my = 0, hovering = false, leanX = 0, leanY = 0;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left - w / 2;
      my = h / 2 - (e.clientY - r.top);
      hovering = true;
    };
    const onLeave = () => (hovering = false);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    /* push one dot away from the cursor and let its spring pull it back */
    const hover = (x: number, y: number, i: number, dt: number) => {
      if (hovering) {
        const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
        if (dd < HOVER_R * HOVER_R && dd > 1e-4) {
          const d = Math.sqrt(dd), f = (1 - d / HOVER_R) * HOVER_PUSH;
          const nx = dx / d, ny = dy / d, tx = tilt[i * 2], ty = tilt[i * 2 + 1];
          vel[i * 2] += (nx * tx - ny * ty) * f;
          vel[i * 2 + 1] += (nx * ty + ny * tx) * f;
        }
      }
      vel[i * 2] += (-BACK_K * aPush[i * 2] - BACK_D * vel[i * 2]) * dt;
      vel[i * 2 + 1] += (-BACK_K * aPush[i * 2 + 1] - BACK_D * vel[i * 2 + 1]) * dt;
      aPush[i * 2] += vel[i * 2] * dt;
      aPush[i * 2 + 1] += vel[i * 2 + 1] * dt;
    };

    /* where dot i is on screen right now (the same sum as the vertex shader), without the push */
    const e = rot.elements; // column-major
    const screen = (i: number, morph: number, out: Float32Array) => {
      const k = i * 3;
      const x = aPrev[k] + (aNow[k] - aPrev[k]) * morph + aSpread[k];
      const y = aPrev[k + 1] + (aNow[k + 1] - aPrev[k + 1]) * morph + aSpread[k + 1];
      const z = aPrev[k + 2] + (aNow[k + 2] - aPrev[k + 2]) * morph + aSpread[k + 2];
      const rx = e[0] * x + e[3] * y + e[6] * z;
      const ry = e[1] * x + e[4] * y + e[7] * z;
      const rz = e[2] * x + e[5] * y + e[8] * z;
      const p = (PERSP / (PERSP - rz)) * scale;
      out[0] = rx * p;
      out[1] = ry * p;
    };
    const at = new Float32Array(2);

    /* phases: "change" (dots swirl into the next hobby's raw material), "build", "done" */
    let prevHobby = hobby, phase: "change" | "build" | "done" = still ? "done" : "build", clock = -START;
    let morph = 1, morphV = 0, real = 0, spinYaw = 0.6;
    let moving = false; // any dot still pushed out of place
    let last = performance.now(), raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      real += dt;
      clock += dt;

      if (!still) {
        if (phase === "build") {
          // build it live; aPrev follows so nothing swirls
          const t = Math.min(1, Math.max(0, clock / builds[hobby].seconds));
          place(hobby, t);
          aPrev.set(aNow);
          aShowPrev.set(aShow);
          nowAttr.needsUpdate = prevAttr.needsUpdate = showAttr.needsUpdate = showPrevAttr.needsUpdate = true;
          if (t >= 1) {
            phase = "done";
            clock = 0;
          }
        } else if (phase === "done" && clock > FINISHED) {
          // on to the next hobby: swirl from the finished piece into the new raw material
          prevHobby = hobby;
          hobby = (hobby + 1) % builds.length;
          onShapeRef.current?.(hobby);
          aPrev.set(aNow);
          aShowPrev.set(aShow);
          place(hobby, 0);
          nowAttr.needsUpdate = prevAttr.needsUpdate = showAttr.needsUpdate = showPrevAttr.needsUpdate = true;
          morph = 0;
          morphV = 0;
          phase = "change";
        } else if (phase === "change") {
          morphV += (-MORPH_K * (morph - 1) - MORPH_D * morphV) * dt;
          morph += morphV * dt;
          if (Math.abs(morph - 1) < 0.01 && Math.abs(morphV) < 0.01) {
            morph = 1;
            prevHobby = hobby;
            phase = "build";
            clock = -START;
          }
        }
      }

      /* turn, and lean toward the cursor (measured from the rectangle, across the page) */
      if (!still) {
        spinYaw += TURN * dt;
        const tx = hovering ? Math.max(-1, Math.min(1, mx / (window.innerWidth / 2))) : 0;
        const ty = hovering ? Math.max(-1, Math.min(1, my / (window.innerHeight / 2))) : 0;
        const ease = 1 - Math.exp(-LEAN_EASE * dt);
        leanX += (tx - leanX) * ease;
        leanY += (ty - leanY) * ease;
      }
      /* blend the view, the turn and the size from the last hobby to this one */
      const m = Math.min(1, Math.max(0, morph)), A: Build = builds[prevHobby], B: Build = builds[hobby];
      const yawOf = (b: Build) => (b.spin ? spinYaw : still ? 0.35 : ROCK * Math.sin(real * ROCK_SPEED));
      let turn = yawOf(B) - yawOf(A);
      turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2; // the short way round
      const ya = yawOf(A) + turn * m + leanX * LEAN_YAW, pa = A.view + (B.view - A.view) * m - leanY * LEAN_PITCH;
      scale = hobbyScale[prevHobby] + (hobbyScale[hobby] - hobbyScale[prevHobby]) * m;
      uniforms.uScale.value = scale;
      const cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
      // look down onto it (about x), after turning (about y)
      rot.set(cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy);

      /* hover: only does work while the cursor is near or dots are still settling */
      const near = hovering && Math.abs(mx) < w / 2 + HOVER_R && Math.abs(my) < h / 2 + HOVER_R;
      if (near || moving) {
        moving = false;
        for (let i = 0; i < DOTS; i++) {
          if (aShow[i] < 0.01 && aShowPrev[i] < 0.01) continue;
          screen(i, morph, at);
          hover(at[0] + aPush[i * 2], at[1] + aPush[i * 2 + 1], i, dt);
          if (Math.abs(aPush[i * 2]) + Math.abs(aPush[i * 2 + 1]) + Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) > 0.01) moving = true;
          else aPush[i * 2] = aPush[i * 2 + 1] = vel[i * 2] = vel[i * 2 + 1] = 0;
        }
        pushAttr.needsUpdate = true;
      }

      uniforms.uClock.value = real;
      uniforms.uMorph.value = morph;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="3D sculptures made of blue dots that build themselves, one hobby after another: a vase thrown on the wheel, a crocheted beanie, a sunflower painted on an easel, a dress sewn onto a dress form, and a tufted rug"
      className="relative block h-full w-full"
    />
  );
}
