"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildHobbies, type Build } from "./sculptures";
import { routes, type Box, type Ctx, type Route } from "./transitions";

/* Lisa's hobbies as 3D sculptures made of thousands of tiny blue dots, each one building
   itself from nothing to the finished piece (see sculptures.ts). The sculpture turns slowly
   (or rocks, when it has a front) and leans toward the cursor; dots further away are smaller
   and fainter, and every dot shimmers a little so it is never quite still.
   Between hobbies the dots flow from one piece into the next as one stream, each change in
   its own way that fits what comes next (see transitions.ts): its base first, its tool last.
   Each piece starts changing just before it's finished, and the next build starts while the
   last dots are still arriving, so there is always something being made.
   Hovering scatters the dots, and a spring pulls them back. */

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
const SHIMMER = 0.06; // how far each dot drifts on its own, so nothing is ever frozen
const ROCK = 0.55, ROCK_SPEED = 0.45; // how far and fast the easel and frame rock
const LEAD = 0.4; // seconds before a build finishes that it starts unravelling into the next
/* the changes between hobbies (each one's own path and timing is in transitions.ts) */
const OVERLAP = 0.35; // the next build starts this long before the change has fully arrived
const FUZZ = 0.22; // how thick a stream of travelling dots is
const HOVER_R = 34; // px around the cursor that dots move away from
const HOVER_PUSH = 200; // px/s added per frame at the cursor's centre
const BACK_K = 25; // the spring that pulls pushed dots home
const BACK_D = 9;
const MARGIN_X = 8; // px kept clear at the sides of the rectangle
const MARGIN_Y = 64; // px kept clear at the top and bottom, for the captions (up to two lines)
const NEAR_GROW = 1.12; // allowance for the nearest dots looking bigger

const smooth = (v: number) => {
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  return x * x * (3 - 2 * x);
};

const vertex = /* glsl */ `
  uniform mat3 uRot;
  uniform float uClock, uScale, uSize, uPersp, uRadius, uShimmer;
  attribute vec3 aPos, aSpread;
  attribute float aShow;
  attribute vec2 aPush, aSeed;
  varying float vNear, vShow;

  void main() {
    // a tiny drift of its own, so the dots are never frozen
    vec3 drift = vec3(
      sin(aSeed.x * 41.0 + uClock * 1.7),
      sin(aSeed.y * 37.0 + uClock * 1.3),
      sin((aSeed.x + aSeed.y) * 29.0 + uClock * 1.5)
    ) * uShimmer;
    vShow = aShow;
    vec3 p = uRot * (aPos + aSpread + drift);
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
    const count = builds.length;

    /* per-dot data. A "slot" is one dot on screen; slotIdx says which of the current
       hobby's dots it is showing, which changes each time the thread rewinds the dots. */
    const aPos = new Float32Array(DOTS * 3), aShow = new Float32Array(DOTS);
    const aSpread = new Float32Array(DOTS * 3), aSeed = new Float32Array(DOTS * 2);
    const aPush = new Float32Array(DOTS * 2), vel = new Float32Array(DOTS * 2);
    const tilt = new Float32Array(DOTS * 2); // each dot gets pushed off at its own slight angle
    const fuzz = new Float32Array(DOTS * 3); // where each dot sits across the thread
    const slotIdx = new Int32Array(DOTS);
    for (let i = 0; i < DOTS; i++) {
      slotIdx[i] = i;
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
      const fr = Math.sqrt(Math.random()) * FUZZ;
      fuzz.set([(x / l) * fr, (y / l) * fr, (z / l) * fr], i * 3);
      aSeed[i * 2] = Math.random();
      aSeed[i * 2 + 1] = Math.random();
      const t = (Math.random() - 0.5) * 1.3, strength = 0.35 + Math.random() * 1.3;
      tilt[i * 2] = Math.cos(t) * strength;
      tilt[i * 2 + 1] = Math.sin(t) * strength;
    }

    /* each hobby: centred on its height range over the whole build, and how far it reaches
       sideways (any way it turns) and up/down (from its viewing angle) */
    const bPos = new Float32Array(DOTS * 3), bShow = new Float32Array(DOTS);
    const centre: number[] = [], side: number[] = [], upDown: number[] = [];
    builds.forEach((b, h) => {
      let lo = Infinity, hi = -Infinity, sd = 0, ud = 0;
      const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        b.update(t, bPos, bShow);
        return { pos: bPos.slice(), show: bShow.slice() };
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

    /* hobby h at build progress t, centred (into bPos / bShow, by the hobby's own dot order) */
    const place = (h: number, t: number, pos = bPos, vis = bShow) => {
      builds[h].update(t, pos, vis);
      const c = centre[h];
      for (let i = 1; i < DOTS * 3; i += 3) pos[i] -= c;
    };

    /* for each change (routes[h] takes hobby h into h + 1): the order dots leave the finished
       piece and the order they arrive in the next one's start, its tool last. Dots that
       aren't showing go anywhere in the order, so the stream stays evenly full. */
    const leaveKey: Float32Array[] = [], arriveKey: Float32Array[] = [];
    const startShow: Float32Array[] = []; // which dots each hobby starts with
    const keys = (key: Route["leave"], tool?: [number, number]) => {
      const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      for (let i = 0; i < DOTS; i++) if (bShow[i] > 0.5) for (let d = 0; d < 3; d++) {
        box.min[d] = Math.min(box.min[d], bPos[i * 3 + d]);
        box.max[d] = Math.max(box.max[d], bPos[i * 3 + d]);
      }
      const out = new Float32Array(DOTS);
      for (let i = 0; i < DOTS; i++) {
        const isTool = !!tool && i >= tool[0] && i < tool[1];
        out[i] = bShow[i] < 0.5 ? Math.random() : isTool ? 0.86 + 0.14 * Math.random() : key(bPos[i * 3], bPos[i * 3 + 1], bPos[i * 3 + 2], box, isTool);
      }
      return out;
    };
    builds.forEach((b, h) => {
      place(h, 1);
      leaveKey[h] = keys(routes[h].leave);
      place(h, 0);
      startShow[h] = bShow.slice();
      arriveKey[h] = keys(routes[(h + count - 1) % count].enter, b.tool);
    });
    /* how long after a change starts the next build begins, for the change into hobby h */
    const buildAt = (h: number) => {
      const r = routes[(h + count - 1) % count];
      return r.unravel + r.flight - (r.overlap ?? OVERLAP);
    };

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3));
    const attr = (name: string, arr: Float32Array, size: number) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const posAttr = attr("aPos", aPos, 3), showAttr = attr("aShow", aShow, 1);
    const pushAttr = attr("aPush", aPush, 2);
    attr("aSpread", aSpread, 3);
    attr("aSeed", aSeed, 2);

    /* show hobby h at build progress t on every slot */
    const show = (h: number, t: number) => {
      place(h, t);
      for (let k = 0; k < DOTS; k++) {
        const j = slotIdx[k];
        aPos[k * 3] = bPos[j * 3];
        aPos[k * 3 + 1] = bPos[j * 3 + 1];
        aPos[k * 3 + 2] = bPos[j * 3 + 2];
        aShow[k] = bShow[j];
      }
      posAttr.needsUpdate = showAttr.needsUpdate = true;
    };

    /* the change: every slot pairs the dot it shows now with the next hobby's dot of the same
       rank (first to leave → first to arrive), and gets a time to leave */
    const fromPos = new Float32Array(DOTS * 3), fromShow = new Float32Array(DOTS); // the last piece, still finishing
    const leave = new Float32Array(DOTS), nextIdx = new Int32Array(DOTS);
    const keep = new Uint8Array(DOTS); // travels all the way into the next piece
    const rank = new Float32Array(DOTS); // its place in the leaving order, 0 → 1
    const ctx: Ctx = { clock: 0, rank, fuzz };
    let route: Route = routes[count - 1];
    const order = (key: (i: number) => number) => {
      const ids = Array.from({ length: DOTS }, (_, i) => i);
      const k = Float32Array.from(ids, key);
      return ids.sort((a, b) => k[a] - k[b]);
    };
    const beginChange = (from: number, to: number) => {
      route = routes[from];
      const out = order((k) => leaveKey[from][slotIdx[k]]);
      const into = order((j) => arriveKey[to][j]);
      for (let r = 0; r < DOTS; r++) {
        nextIdx[out[r]] = into[r];
        keep[out[r]] = startShow[to][into[r]] > 0.5 ? 1 : 0;
        rank[out[r]] = r / (DOTS - 1);
        // a gentle start: only a few dots leave at first, then a steady stream
        leave[out[r]] = route.unravel * Math.pow(r / (DOTS - 1), 0.8);
      }
    };
    /* every slot, `clock` seconds into the change, with the last hobby still finishing (at
       build progress tFrom) and the next one at build progress t */
    const A = new Float32Array(3), B = new Float32Array(3), M = new Float32Array(3);
    const change = (from: number, tFrom: number, to: number, clock: number, t: number) => {
      place(from, tFrom, fromPos, fromShow);
      place(to, t);
      ctx.clock = clock;
      const { pre, path, target, flight, depart, arrive, thin: [t0, t1] } = route;
      for (let k = 0; k < DOTS; k++) {
        const f = (clock - leave[k]) / flight, o = k * 3, i = slotIdx[k] * 3, j = nextIdx[k] * 3;
        if (f >= 1) {
          aPos[o] = bPos[j];
          aPos[o + 1] = bPos[j + 1];
          aPos[o + 2] = bPos[j + 2];
          aShow[k] = bShow[nextIdx[k]];
          continue;
        }
        // the last piece, moved as a whole if this change does that (curling, falling, spinning)
        A[0] = fromPos[i];
        A[1] = fromPos[i + 1];
        A[2] = fromPos[i + 2];
        if (pre) pre(A, clock);
        const as = fromShow[slotIdx[k]];
        if (f <= 0) {
          aPos[o] = A[0];
          aPos[o + 1] = A[1];
          aPos[o + 2] = A[2];
          aShow[k] = as;
          continue;
        }
        // off the last piece onto this change's path, and off the path into the next piece
        B[0] = bPos[j];
        B[1] = bPos[j + 1];
        B[2] = bPos[j + 2];
        path(M, f, A, B, k, ctx);
        if (target) target(B, clock);
        const a = smooth(f / depart), b = smooth((f - 1 + arrive) / arrive);
        for (let d = 0; d < 3; d++) {
          const m = A[d] + (M[d] - A[d]) * a;
          aPos[o + d] = m + (B[d] - m) * b;
        }
        // dots the next piece doesn't start with fade out on the way
        const v = (as + (1 - as) * a) * (keep[k] ? 1 : 1 - smooth((f - t0) / (t1 - t0)));
        aShow[k] = v + (bShow[nextIdx[k]] - v) * b;
      }
      posAttr.needsUpdate = showAttr.needsUpdate = true;
    };
    const endChange = () => slotIdx.set(nextIdx);

    let hobby = 0;
    show(hobby, still ? 1 : 0);

    const rot = new THREE.Matrix3();
    const uniforms = {
      uRot: { value: rot },
      uClock: { value: 0 },
      uScale: { value: 1 },
      uSize: { value: DOT_PX },
      uPersp: { value: PERSP },
      uShimmer: { value: still ? 0 : SHIMMER },
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
    let w = 1, h = 1;
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
    let scale = 1;
    const screen = (i: number, out: Float32Array) => {
      const k = i * 3;
      const x = aPos[k] + aSpread[k], y = aPos[k + 1] + aSpread[k + 1], z = aPos[k + 2] + aSpread[k + 2];
      const rx = e[0] * x + e[3] * y + e[6] * z;
      const ry = e[1] * x + e[4] * y + e[7] * z;
      const rz = e[2] * x + e[5] * y + e[8] * z;
      const p = (PERSP / (PERSP - rz)) * scale;
      out[0] = rx * p;
      out[1] = ry * p;
    };
    const at = new Float32Array(2);

    /* one clock per hobby, counted from the start of the change into it: the thread winds
       (0 → CHANGE), the build starts a little before it has finished (BUILD_AT), and LEAD
       seconds before the build is done it starts unravelling into the next one */
    let prevHobby = hobby, changing = false, clock = buildAt(hobby);
    let real = 0, spinYaw = 0.6;
    let moving = false; // any dot still pushed out of place
    let last = performance.now(), raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      real += dt;

      if (!still) {
        clock += dt;
        if (!changing && clock >= buildAt(hobby) + builds[hobby].seconds - LEAD) {
          prevHobby = hobby;
          hobby = (hobby + 1) % count;
          onShapeRef.current?.(hobby);
          beginChange(prevHobby, hobby);
          changing = true;
          clock = dt;
        }
        const t = Math.min(1, Math.max(0, (clock - buildAt(hobby)) / builds[hobby].seconds));
        if (changing) {
          const tFrom = Math.min(1, 1 + (clock - LEAD) / builds[prevHobby].seconds);
          change(prevHobby, tFrom, hobby, clock, t);
          if (clock >= route.unravel + route.flight) {
            endChange();
            changing = false;
          }
        } else show(hobby, t);
      }

      /* turn (a little faster while the thread winds), and lean toward the cursor (measured
         from the rectangle, across the page) */
      const c = changing ? Math.min(1, clock / (route.unravel + route.flight)) : 1;
      if (!still) {
        const bump = Math.sin(Math.PI * c) ** 2;
        spinYaw += TURN * (1 + route.spin * (changing ? bump : 0)) * dt;
        const tx = hovering ? Math.max(-1, Math.min(1, mx / (window.innerWidth / 2))) : 0;
        const ty = hovering ? Math.max(-1, Math.min(1, my / (window.innerHeight / 2))) : 0;
        const ease = 1 - Math.exp(-LEAN_EASE * dt);
        leanX += (tx - leanX) * ease;
        leanY += (ty - leanY) * ease;
      }
      /* blend the view, the turn and the size from the last hobby to this one */
      const m = c * c * c * (c * (c * 6 - 15) + 10), A: Build = builds[prevHobby], B: Build = builds[hobby];
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
          if (aShow[i] < 0.01) continue;
          screen(i, at);
          hover(at[0] + aPush[i * 2], at[1] + aPush[i * 2 + 1], i, dt);
          if (Math.abs(aPush[i * 2]) + Math.abs(aPush[i * 2 + 1]) + Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) > 0.01) moving = true;
          else aPush[i * 2] = aPush[i * 2 + 1] = vel[i * 2] = vel[i * 2 + 1] = 0;
        }
        pushAttr.needsUpdate = true;
      }

      uniforms.uClock.value = real;
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
      aria-label="3D sculptures made of blue dots that build themselves, each unravelling into a spiralling thread that winds into the next: a vase thrown on the wheel, a crocheted beanie, a sunflower painted on an easel, a dress draped onto a dress form, and a tufted rug"
      className="relative block h-full w-full"
    />
  );
}
