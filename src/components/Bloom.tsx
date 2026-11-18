"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SHAPES } from "./bloomShapes";

/* Thousands of blue dots that flow along a line drawing, spring from one drawing to
   the next (Lisa's hobbies, see bloomShapes.ts), drift in from the edges, and scatter
   away from the cursor when you hover, then spring back. */

const COLOR = [0x5b / 255, 0x8b / 255, 0xd0 / 255]; // the sky blue of the headline
const DOTS = 16000;
const DOT_PX = 1.1; // dot size in CSS pixels
const ALPHA = 0.6;
const TABLE = 1024; // points looked up along each line
const FLOW = 1.6; // grid units per second the dots travel along their line
const SPREAD = 1.15; // how far a dot can sit off its line (grid units); most stay close, a few stray
/* The drawing's 24-unit grid as a share of the rectangle. The drawings reach the grid's
   edge, plus up to SPREAD for stray dots and SWIRL while morphing: 24 / (24 + 2 × (1.15 + 1.2))
   ≈ 0.84 keeps every dot inside the rectangle. */
const FIT = 0.84;
const SWIRL = 1.2; // how far dots swirl loose while morphing (grid units)
const HOLD = 1.6; // seconds a drawing stays before the next one
const MORPH_K = 4; // morph spring: stiffness and damping (slightly bouncy)
const MORPH_D = 3.4;
const HOVER_R = 34; // px around the cursor that dots move away from
const HOVER_PUSH = 200; // px/s added per frame at the cursor's centre
const BACK_K = 25; // the spring that pulls pushed dots home
const BACK_D = 9;
const DRIFTERS = 48; // dots that drift in from the edges
const DRIFT_TIME = 2.4;

const vertex = /* glsl */ `
  uniform sampler2D uTable;
  uniform float uRows, uTime, uClock, uMorph, uScale, uSize, uSwirl;
  attribute float aRow, aRowPrev, aRate, aRatePrev, aPhase;
  attribute vec2 aSpread, aPush, aSeed;
  void main() {
    // where this dot is along its line in the new drawing and the previous one
    vec2 now  = texture2D(uTable, vec2(fract(aPhase + uTime * aRate),     (aRow + 0.5) / uRows)).xy;
    vec2 prev = texture2D(uTable, vec2(fract(aPhase + uTime * aRatePrev), (aRowPrev + 0.5) / uRows)).xy;
    // while morphing the dots swirl loose, most at the halfway point
    float m = clamp(uMorph, 0.0, 1.0);
    float loose = 4.0 * m * (1.0 - m);
    vec2 swirl = vec2(sin(aSeed.x * 23.0 + uClock * 2.3), cos(aSeed.y * 19.0 + uClock * 1.9)) * loose * uSwirl;
    vec2 p = (mix(prev, now, uMorph) + aSpread + swirl) * uScale + aPush;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
    gl_PointSize = uSize;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uColor, uAlpha);
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

/* Turn every line of every drawing into a row of TABLE points (x, y centred, y up). */
function buildTable() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  document.body.appendChild(svg);
  const rows: { len: number; shape: number }[] = [];
  const shapeRows: number[][] = [];
  const data: number[] = [];
  SHAPES.forEach((shape, si) => {
    shapeRows.push([]);
    for (const d of shape.lines) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
      const len = path.getTotalLength();
      for (let j = 0; j < TABLE; j++) {
        const p = path.getPointAtLength((j / TABLE) * len);
        data.push(p.x - 12, 12 - p.y, 0, 1);
      }
      shapeRows[si].push(rows.length);
      rows.push({ len, shape: si });
    }
  });
  svg.remove();
  return { rows, shapeRows, data: new Float32Array(data) };
}

export function Bloom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const { rows, shapeRows, data } = buildTable();
    const table = new THREE.DataTexture(data, TABLE, rows.length, THREE.RGBAFormat, THREE.FloatType);
    table.magFilter = table.minFilter = THREE.NearestFilter;
    table.wrapS = THREE.RepeatWrapping;
    table.needsUpdate = true;

    /* Which line each dot follows in each drawing: shared out by line length
       (every line gets at least a few), shuffled, worked out once per drawing. */
    const plans = SHAPES.map((_, si) => {
      const ids = shapeRows[si];
      const total = ids.reduce((s, r) => s + rows[r].len, 0);
      const floor = Math.round(DOTS * 0.025);
      const counts = ids.map((r) => Math.round(floor + (rows[r].len / total) * (DOTS - floor * ids.length)));
      counts[0] += DOTS - counts.reduce((a, b) => a + b, 0);
      const row = new Float32Array(DOTS);
      let k = 0;
      ids.forEach((r, i) => {
        for (let c = 0; c < counts[i]; c++) row[k++] = r;
      });
      for (let i = DOTS - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [row[i], row[j]] = [row[j], row[i]];
      }
      // every dot moves at the same speed, whatever the length of its line
      const rate = row.map((r) => FLOW / rows[r].len);
      return { row, rate };
    });

    /* per-dot data */
    const aRow = new Float32Array(DOTS), aRowPrev = new Float32Array(DOTS);
    const aRate = new Float32Array(DOTS), aRatePrev = new Float32Array(DOTS);
    const aPhase = new Float32Array(DOTS), aSpread = new Float32Array(DOTS * 2);
    const aPush = new Float32Array(DOTS * 2), aSeed = new Float32Array(DOTS * 2);
    const vel = new Float32Array(DOTS * 2);
    const tilt = new Float32Array(DOTS * 2); // each dot gets pushed off at its own slight angle
    for (let i = 0; i < DOTS; i++) {
      aPhase[i] = Math.random();
      const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 1.8) * SPREAD;
      aSpread[i * 2] = Math.cos(a) * r;
      aSpread[i * 2 + 1] = Math.sin(a) * r;
      aSeed[i * 2] = Math.random();
      aSeed[i * 2 + 1] = Math.random();
      const t = (Math.random() - 0.5) * 1.3, strength = 0.35 + Math.random() * 1.3;
      tilt[i * 2] = Math.cos(t) * strength;
      tilt[i * 2 + 1] = Math.sin(t) * strength;
    }

    const first = 0; // with reduced motion, only the first drawing is shown
    aRow.set(plans[first].row);
    aRowPrev.set(plans[first].row);
    aRate.set(plans[first].rate);
    aRatePrev.set(plans[first].rate);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3));
    const attr = (name: string, arr: Float32Array, size: number) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      return a;
    };
    const rowAttr = attr("aRow", aRow, 1), rowPrevAttr = attr("aRowPrev", aRowPrev, 1);
    const rateAttr = attr("aRate", aRate, 1), ratePrevAttr = attr("aRatePrev", aRatePrev, 1);
    const pushAttr = attr("aPush", aPush, 2);
    attr("aPhase", aPhase, 1);
    attr("aSpread", aSpread, 2);
    attr("aSeed", aSeed, 2);

    const uniforms = {
      uTable: { value: table },
      uRows: { value: rows.length },
      uTime: { value: 0 },
      uClock: { value: 0 },
      uMorph: { value: 1 },
      uScale: { value: 1 },
      uSize: { value: DOT_PX },
      uSwirl: { value: SWIRL },
      uColor: { value: new THREE.Vector3(...COLOR) },
      uAlpha: { value: ALPHA },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false });
    const dots = new THREE.Points(geo, mat);
    dots.frustumCulled = false;

    /* the drifters: a few loose dots that float in from the edges onto the drawing */
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
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
      camera.updateProjectionMatrix();
      scale = (Math.min(w, h) * FIT) / 24;
      uniforms.uScale.value = scale;
      uniforms.uSize.value = DOT_PX * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* the cursor, in the same centred pixels (y up) */
    let mx = 0, my = 0, hovering = false;
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

    let shape = first, phase: "hold" | "morph" = "hold", clock = 0;
    let morph = 1, morphV = 0, time = 0, real = 0, lastDrift = 0, nextDrifter = 0;
    let moving = false; // any dot still pushed out of place
    let last = performance.now(), raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      real += dt;
      if (!still) time += dt;
      clock += dt;

      /* next drawing */
      if (!still && phase === "hold" && clock > HOLD) {
        shape = (shape + 1) % SHAPES.length;
        aRowPrev.set(aRow);
        aRatePrev.set(aRate);
        aRow.set(plans[shape].row);
        aRate.set(plans[shape].rate);
        rowAttr.needsUpdate = rowPrevAttr.needsUpdate = rateAttr.needsUpdate = ratePrevAttr.needsUpdate = true;
        morph = 0;
        morphV = 0;
        phase = "morph";
      }
      if (phase === "morph") {
        morphV += (-MORPH_K * (morph - 1) - MORPH_D * morphV) * dt;
        morph += morphV * dt;
        if (Math.abs(morph - 1) < 0.002 && Math.abs(morphV) < 0.002) {
          morph = 1;
          phase = "hold";
          clock = 0;
        }
      }

      /* hover: only does work while the cursor is near or dots are still settling */
      const near = hovering && Math.abs(mx) < w / 2 + HOVER_R && Math.abs(my) < h / 2 + HOVER_R;
      if (near || moving) {
        moving = false;
        for (let i = 0; i < DOTS; i++) {
          const kNow = (aRow[i] * TABLE + ((((aPhase[i] + time * aRate[i]) % 1) * TABLE) | 0)) * 4;
          const kPrev = (aRowPrev[i] * TABLE + ((((aPhase[i] + time * aRatePrev[i]) % 1) * TABLE) | 0)) * 4;
          const x = (data[kPrev] + (data[kNow] - data[kPrev]) * morph + aSpread[i * 2]) * scale + aPush[i * 2];
          const y = (data[kPrev + 1] + (data[kNow + 1] - data[kPrev + 1]) * morph + aSpread[i * 2 + 1]) * scale + aPush[i * 2 + 1];
          hover(x, y, aPush, vel, i, tilt[i * 2], tilt[i * 2 + 1], dt);
          if (Math.abs(aPush[i * 2]) + Math.abs(aPush[i * 2 + 1]) + Math.abs(vel[i * 2]) + Math.abs(vel[i * 2 + 1]) > 0.01) moving = true;
          else aPush[i * 2] = aPush[i * 2 + 1] = vel[i * 2] = vel[i * 2 + 1] = 0;
        }
        pushAttr.needsUpdate = true;
      }

      /* drifters: launch one now and then while a drawing is settled */
      if (!still && morph > 0.85 && real - lastDrift > 0.09) {
        lastDrift = real;
        const i = nextDrifter++ % DRIFTERS;
        const side = Math.floor(Math.random() * 4), s = Math.random() * 2 - 1;
        const sx = side < 2 ? s * w * 0.48 : (side === 2 ? -1 : 1) * w * 0.48;
        const sy = side < 2 ? (side === 0 ? -1 : 1) * h * 0.48 : s * h * 0.48;
        // land on the nearest point of the drawing's outline (its first line)
        const outline = shapeRows[shape][0];
        let best = 0, bestD = Infinity;
        for (let j = 0; j < TABLE; j += 8) {
          const k = (outline * TABLE + j) * 4;
          const dx = data[k] * scale - sx, dy = data[k + 1] * scale - sy, dd = dx * dx + dy * dy;
          if (dd < bestD) {
            bestD = dd;
            best = k;
          }
        }
        dStart[i * 2] = sx;
        dStart[i * 2 + 1] = sy;
        dEnd[i * 2] = data[best] * scale;
        dEnd[i * 2 + 1] = data[best + 1] * scale;
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

      uniforms.uTime.value = time;
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
      table.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Blue dots drawing my hobbies one after another: pottery, crochet, painting, sewing and rug tufting"
      className="block h-full w-full"
    />
  );
}
