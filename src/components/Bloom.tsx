"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildJourneys, type Stage } from "./sculptures";

/* Lisa's hobbies as 3D sculptures made of thousands of tiny blue dots, each one a little
   journey from raw material to the finished thing (see sculptures.ts). The sculpture turns
   slowly (or rocks, when it has a front) and leans toward the cursor; dots further away are
   smaller and fainter. Between steps the dots re-form; between hobbies they swirl loose.
   Hovering scatters the dots, and a spring pulls them back. Loose dots drift in from the edges. */

const COLOR = [0x5b / 255, 0x8b / 255, 0xd0 / 255]; // the sky blue of the headline
const DOTS = 18000;
const DOT_PX = 1.1; // dot size in CSS pixels (front dots a little bigger, back ones smaller)
const ALPHA = 0.62;
const BACK_ALPHA = 0.22; // how faint the furthest dots get, as a share of the nearest
const PERSP = 60; // camera distance in sculpture units: lower is a stronger 3D look
const TURN = 0.42; // radians per second they turn on their own
const LEAN_YAW = 0.7, LEAN_PITCH = 0.35; // how far they lean toward the cursor
const LEAN_EASE = 3; // how quickly they follow it
const SPREAD = 0.42; // how far a dot can sit off its surface; most stay close, a few stray
const SWIRL = 1.6; // how far dots swirl loose while re-forming
const STEP_SWIRL = 0.3; // between steps of one hobby the dots only loosen a little
const ROCK = 0.55, ROCK_SPEED = 0.45; // how far and fast the easel and frame rock
const MORPH_K = 4; // between hobbies: re-form spring, stiffness and damping (slightly bouncy)
const MORPH_D = 3.4;
const STEP_K = 9; // between steps: quicker, barely bouncy
const STEP_D = 5.4;
const HOVER_R = 34; // px around the cursor that dots move away from
const HOVER_PUSH = 200; // px/s added per frame at the cursor's centre
const BACK_K = 25; // the spring that pulls pushed dots home
const BACK_D = 9;
const DRIFTERS = 48; // dots that drift in from the edges
const DRIFT_TIME = 2.4;
const MARGIN_X = 8; // px kept clear at the sides of the rectangle
const MARGIN_Y = 40; // px kept clear at the top and bottom, for the captions
const NEAR_GROW = 1.12; // allowance for the nearest dots looking bigger

/* how far each stage reaches from the middle, sideways (any way it turns) and up/down
   (seen from its viewing angle), in sculpture units */
function reach(s: Stage) {
  let side = 0, upDown = 0;
  const c = Math.cos(s.view), sn = Math.sin(s.view), p = s.points;
  for (let i = 0; i < p.length; i += 3) {
    const r = Math.hypot(p[i], p[i + 2]);
    side = Math.max(side, r);
    upDown = Math.max(upDown, Math.abs(p[i + 1]) * c + r * sn);
  }
  return { side: side + SPREAD, upDown: upDown + SPREAD };
}

const vertex = /* glsl */ `
  uniform mat3 uRot;
  uniform float uMorph, uClock, uScale, uSize, uSwirl, uPersp, uRadius;
  attribute vec3 aNow, aPrev;
  attribute vec3 aSpread;
  attribute vec2 aPush, aSeed;
  varying float vNear;

  void main() {
    float m = clamp(uMorph, 0.0, 1.0);
    float loose = 4.0 * m * (1.0 - m);
    vec3 swirl = vec3(
      sin(aSeed.x * 23.0 + uClock * 2.3),
      cos(aSeed.y * 19.0 + uClock * 1.9),
      sin((aSeed.x + aSeed.y) * 17.0 + uClock * 2.1)
    ) * loose * uSwirl;
    vec3 p = uRot * (mix(aPrev, aNow, uMorph) + aSpread + swirl);
    float persp = uPersp / (uPersp - p.z);
    vNear = clamp(p.z / uRadius * 0.5 + 0.5, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xy * persp * uScale + aPush, 0.0, 1.0);
    gl_PointSize = uSize * mix(0.7, 1.35, vNear);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha, uBack;
  varying float vNear;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uColor, uAlpha * mix(uBack, 1.0, vNear));
  }
`;

const driftVertex = /* glsl */ `
  uniform float uSize;
  attribute float aFade;
  varying float vFade;
  void main() {
    vFade = aFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.6 + 0.6 * aFade);
  }
`;

const driftFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (vFade < 0.01 || dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uColor, uAlpha * vFade);
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

    const stages = buildJourneys(DOTS);
    const reaches = stages.map(reach);

    /* per-dot data */
    const aNow = new Float32Array(DOTS * 3), aPrev = new Float32Array(DOTS * 3);
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

    // with reduced motion, only the finished vase is shown
    const first = still ? stages.findIndex((s, i) => stages[i + 1]?.hobby !== s.hobby) : 0;
    aNow.set(stages[first].points);
    aPrev.set(stages[first].points);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3));
    const attr = (name: string, arr: Float32Array, size: number) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const nowAttr = attr("aNow", aNow, 3), prevAttr = attr("aPrev", aPrev, 3);
    const pushAttr = attr("aPush", aPush, 2);
    attr("aSpread", aSpread, 3);
    attr("aSeed", aSeed, 2);

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

    /* the drifters: a few loose dots that float in from the edges onto the sculpture */
    const dStart = new Float32Array(DRIFTERS * 2), dEnd = new Float32Array(DRIFTERS * 2);
    const dBorn = new Float32Array(DRIFTERS).fill(-1e9);
    const dPos = new Float32Array(DRIFTERS * 3), dFade = new Float32Array(DRIFTERS);
    const dPush = new Float32Array(DRIFTERS * 2), dVel = new Float32Array(DRIFTERS * 2);
    const dGeo = new THREE.BufferGeometry();
    const dPosAttr = new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage);
    const dFadeAttr = new THREE.BufferAttribute(dFade, 1).setUsage(THREE.DynamicDrawUsage);
    dGeo.setAttribute("position", dPosAttr);
    dGeo.setAttribute("aFade", dFadeAttr);
    const dMat = new THREE.ShaderMaterial({
      uniforms: { uSize: uniforms.uSize, uColor: uniforms.uColor, uAlpha: { value: 0.8 } },
      vertexShader: driftVertex,
      fragmentShader: driftFragment,
      transparent: true,
      depthWrite: false,
    });
    const drifters = new THREE.Points(dGeo, dMat);
    drifters.frustumCulled = false;

    const scene = new THREE.Scene();
    scene.add(dots, drifters);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setClearColor(0x000000, 0);

    /* size: the camera works in CSS pixels with 0,0 in the middle of the rectangle */
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
      // each hobby gets one size for all its steps (so the clay puck grows into the vase),
      // as big as its largest step allows
      hobbyScale.length = 0;
      stages.forEach((s, i) => {
        const r = reaches[i];
        const k = Math.min(Math.max(1, w / 2 - MARGIN_X) / (r.side * NEAR_GROW), Math.max(1, h / 2 - MARGIN_Y) / (r.upDown * NEAR_GROW));
        hobbyScale[s.hobby] = Math.min(hobbyScale[s.hobby] ?? Infinity, k);
      });
      uniforms.uSize.value = DOT_PX * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* the cursor, in the same centred pixels (y up), and where it is on the whole page */
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
    const hover = (x: number, y: number, push: Float32Array, v: Float32Array, i: number, tx: number, ty: number, dt: number) => {
      if (hovering) {
        const dx = x - mx, dy = y - my, dd = dx * dx + dy * dy;
        if (dd < HOVER_R * HOVER_R && dd > 1e-4) {
          const d = Math.sqrt(dd), f = (1 - d / HOVER_R) * HOVER_PUSH;
          const nx = dx / d, ny = dy / d;
          v[i * 2] += (nx * tx - ny * ty) * f;
          v[i * 2 + 1] += (nx * ty + ny * tx) * f;
        }
      }
      v[i * 2] += (-BACK_K * push[i * 2] - BACK_D * v[i * 2]) * dt;
      v[i * 2 + 1] += (-BACK_K * push[i * 2 + 1] - BACK_D * v[i * 2 + 1]) * dt;
      push[i * 2] += v[i * 2] * dt;
      push[i * 2 + 1] += v[i * 2 + 1] * dt;
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

    let st = first, prev = first, phase: "hold" | "morph" = "hold", clock = 0;
    let springK = MORPH_K, springD = MORPH_D;
    let morph = 1, morphV = 0, real = 0, lastDrift = 0, nextDrifter = 0, spinYaw = 0.6;
    let moving = false; // any dot still pushed out of place
    let last = performance.now(), raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      real += dt;
      clock += dt;

      /* next step */
      if (!still && phase === "hold" && clock > stages[st].hold) {
        prev = st;
        st = (st + 1) % stages.length;
        const newHobby = stages[st].hobby !== stages[prev].hobby;
        if (newHobby) onShapeRef.current?.(stages[st].hobby);
        uniforms.uSwirl.value = newHobby ? SWIRL : SWIRL * STEP_SWIRL;
        springK = newHobby ? MORPH_K : STEP_K;
        springD = newHobby ? MORPH_D : STEP_D;
        aPrev.set(aNow);
        aNow.set(stages[st].points);
        nowAttr.needsUpdate = prevAttr.needsUpdate = true;
        morph = 0;
        morphV = 0;
        phase = "morph";
      }
      if (phase === "morph") {
        morphV += (-springK * (morph - 1) - springD * morphV) * dt;
        morph += morphV * dt;
        if (Math.abs(morph - 1) < 0.01 && Math.abs(morphV) < 0.01) {
          morph = 1;
          phase = "hold";
          clock = 0;
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
      /* blend the view, the turn and the size from the last step to this one */
      const m = Math.min(1, Math.max(0, morph)), A = stages[prev], B = stages[st];
      const yawOf = (s: Stage) => (s.spin ? spinYaw : still ? 0.35 : ROCK * Math.sin(real * ROCK_SPEED));
      let turn = yawOf(B) - yawOf(A);
      turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2; // the short way round
      const look = A.view + (B.view - A.view) * m;
      const ya = yawOf(A) + turn * m + leanX * LEAN_YAW, pa = look - leanY * LEAN_PITCH;
      scale = hobbyScale[A.hobby] + (hobbyScale[B.hobby] - hobbyScale[A.hobby]) * m;
      uniforms.uScale.value = scale;
      const cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
      // look down onto it (about x), after turning (about y)
      rot.set(cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy);

      /* hover: only does work while the cursor is near or dots are still settling */
      const near = hovering && Math.abs(mx) < w / 2 + HOVER_R && Math.abs(my) < h / 2 + HOVER_R;
      if (near || moving) {
        moving = false;
        for (let i = 0; i < DOTS; i++) {
          screen(i, morph, at);
          hover(at[0] + aPush[i * 2], at[1] + aPush[i * 2 + 1], aPush, vel, i, tilt[i * 2], tilt[i * 2 + 1], dt);
          if (Math.abs(aPush[i * 2]) + Math.abs(aPush[i * 2 + 1]) + Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) > 0.01) moving = true;
          else aPush[i * 2] = aPush[i * 2 + 1] = vel[i * 2] = vel[i * 2 + 1] = 0;
        }
        pushAttr.needsUpdate = true;
      }

      /* drifters: launch one now and then while a sculpture is settled */
      if (!still && morph > 0.85 && real - lastDrift > 0.09) {
        lastDrift = real;
        const i = nextDrifter++ % DRIFTERS;
        const side = Math.floor(Math.random() * 4), s = Math.random() * 2 - 1;
        const sx = side < 2 ? s * w * 0.48 : (side === 2 ? -1 : 1) * w * 0.48;
        const sy2 = side < 2 ? (side === 0 ? -1 : 1) * h * 0.48 : s * h * 0.48;
        // land on the nearest of a handful of the sculpture's dots
        let bestD = Infinity;
        for (let t = 0; t < 24; t++) {
          screen((Math.random() * DOTS) | 0, morph, at);
          const dd = (at[0] - sx) ** 2 + (at[1] - sy2) ** 2;
          if (dd < bestD) {
            bestD = dd;
            dEnd[i * 2] = at[0];
            dEnd[i * 2 + 1] = at[1];
          }
        }
        dStart[i * 2] = sx;
        dStart[i * 2 + 1] = sy2;
        dBorn[i] = real;
        dPush[i * 2] = dPush[i * 2 + 1] = dVel[i * 2] = dVel[i * 2 + 1] = 0;
      }
      for (let i = 0; i < DRIFTERS; i++) {
        const p = (real - dBorn[i]) / DRIFT_TIME;
        if (p < 0 || p >= 1) {
          dFade[i] = 0;
          continue;
        }
        const bx = dStart[i * 2] + (dEnd[i * 2] - dStart[i * 2]) * p;
        const by = dStart[i * 2 + 1] + (dEnd[i * 2 + 1] - dStart[i * 2 + 1]) * p;
        hover(bx + dPush[i * 2], by + dPush[i * 2 + 1], dPush, dVel, i, 1, 0, dt);
        dPos[i * 3] = bx + dPush[i * 2];
        dPos[i * 3 + 1] = by + dPush[i * 2 + 1];
        dFade[i] = p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2;
      }
      dPosAttr.needsUpdate = dFadeAttr.needsUpdate = true;

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
      dGeo.dispose();
      mat.dispose();
      dMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Turning 3D sculptures made of blue dots, one hobby after another: pottery, crochet, painting, sewing and rug tufting"
      className="relative block h-full w-full"
    />
  );
}
