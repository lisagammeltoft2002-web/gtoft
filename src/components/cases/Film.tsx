"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import type { CaseCopy } from "@/content/site";

gsap.registerPlugin(TextPlugin);

/* The case studies as short product videos. Each one is a small world of real product UI
   (W × H px) filmed by a camera that eases in on what matters and out again, with a cursor
   that moves, hovers and clicks. A film plays only while it's pointed at (or after a tap);
   it holds its last frame, and when the pointer leaves it fades back to its first frame. */

const W = 600;
const H = 340;
/** the app window every film is drawn in (left, top, right, bottom): the camera never shows past it */
const CONTENT = [20, 14, 580, 326];

export type Q = (selector: string) => Element[];

export interface Kit {
  q: Q;
  tl: gsap.core.Timeline;
  /** where the camera starts: focus point and zoom */
  start: (x: number, y: number, z: number) => void;
  /** move the camera so (x, y) sits in the middle, at zoom z */
  cam: (x: number, y: number, z: number, at: number, dur?: number) => void;
  /** where the cursor waits (hidden) before it first moves */
  cursorStart: (x: number, y: number) => void;
  /** glide the cursor's tip to (x, y); it fades in on its first move */
  cursor: (x: number, y: number, at: number, dur?: number) => void;
  /** hover a button: it darkens / lifts a little */
  hover: (selector: string, at: number, vars?: gsap.TweenVars) => void;
  /** press: the cursor dips, a ring spreads, the target pushes in */
  click: (selector: string | null, at: number) => void;
  /** type text into an element, character by character */
  type: (selector: string, text: string, at: number, dur?: number) => void;
  /** show elements that start hidden */
  show: (selector: string, at: number, vars?: gsap.TweenVars, stagger?: number) => void;
  hide: (selector: string, at: number, dur?: number) => void;
  /** the case's number, at the end */
  metric: (at: number) => void;
}

/* fade a film back to its first frame; returns the fades, so a new play can cancel just them */
function rewind(tl: gsap.core.Timeline, fade: HTMLElement, metric: HTMLElement | null, reset: () => void) {
  const out: gsap.core.Tween[] = [];
  if (metric) out.push(gsap.to(metric, { autoAlpha: 0, duration: 0.3 }));
  out.push(
    gsap.to(fade, {
      autoAlpha: 0,
      duration: 0.3,
      onComplete() {
        tl.pause(0);
        reset();
        out.push(gsap.to(fade, { autoAlpha: 1, duration: 0.4 }));
      },
    }),
  );
  return out;
}

/* ------------------------------------------------------------------ one film */

export function useFilm(build: (k: Kit) => (() => void) | void) {
  const ref = useRef<HTMLElement>(null);
  const ctl = useRef<{ play: () => void; stop: () => void } | null>(null);
  const playing = useRef(false);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const q = gsap.utils.selector(root) as Q;
    const camEl = q("[data-cam]")[0] as HTMLElement;
    const cur = q("[data-cursor]")[0] as HTMLElement;
    const art = q("[data-cursor-art]")[0] as HTMLElement;
    const ring = q("[data-ripple]")[0] as HTMLElement;
    const stage = q("[data-stage]")[0] as HTMLElement;
    const metricEl = (q("[data-metric]")[0] as HTMLElement) ?? null;
    let ro: ResizeObserver | null = null;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

      /* the camera, as a list of shots: each one eases from wherever the camera is to its
         own point (x, y) and zoom (z). Every shot is fenced inside the content (the app
         window) first, so the screen is always filled and the camera glides along one smooth
         path instead of bumping into an edge. Zoom changes at an even pace (in steps of
         ratio, not size), and the camera is worked out from the film's time, so it is the
         same however the film is played, paused or rewound. The cursor keeps its size. */
      type Shot = { at: number; dur: number; x: number; y: number; z: number };
      const shots: Shot[] = [];
      let first = { x: W / 2, y: H / 2, z: 1 };
      const [L, T, R, B] = CONTENT;
      const camEase = gsap.parseEase("power2.inOut");
      const apply = () => {
        const r = stage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const s0 = Math.max(r.width / W, r.height / H);
        const fence = (c: { x: number; y: number; z: number }) => {
          const z = Math.max(c.z, r.width / (s0 * (R - L)), r.height / (s0 * (B - T)));
          const hw = r.width / (s0 * z) / 2, hh = r.height / (s0 * z) / 2;
          return { x: Math.min(Math.max(c.x, L + hw), R - hw), y: Math.min(Math.max(c.y, T + hh), B - hh), z };
        };
        const t = tl.time();
        let c = fence(first);
        for (const sh of shots) {
          if (sh.at >= t) break;
          const e = camEase(Math.min(1, (t - sh.at) / sh.dur)), to = fence(sh);
          c = { x: c.x + (to.x - c.x) * e, y: c.y + (to.y - c.y) * e, z: c.z * Math.pow(to.z / c.z, e) };
        }
        gsap.set(camEl, { x: W / 2 - c.x * c.z, y: H / 2 - c.y * c.z, scale: c.z, transformOrigin: "0 0", force3D: false });
        gsap.set(cur, { scale: 1 / c.z });
      };
      tl.eventCallback("onUpdate", apply);
      ro = new ResizeObserver(apply);
      ro.observe(stage);
      let cursorShown = false;

      const kit: Kit = {
        q,
        tl,
        start: (x, y, z) => {
          first = { x, y, z };
          apply();
        },
        cam: (x, y, z, at, dur = 1.15) => {
          // a touch slower than asked: calm camera moves feel better than quick ones
          shots.push({ at, dur: dur * 1.15, x, y, z });
          shots.sort((a, b) => a.at - b.at);
          tl.set({}, {}, at + dur * 1.15); // the film lasts at least until the shot lands
        },
        cursorStart: (x, y) => gsap.set(cur, { x, y, autoAlpha: 0 }),
        cursor: (x, y, at, dur = 0.85) => {
          if (!cursorShown) {
            cursorShown = true;
            tl.to(cur, { autoAlpha: 1, duration: 0.25, ease: "none" }, at);
          }
          // x and y ease a little differently, so the cursor travels on a soft curve like a hand
          tl.to(cur, { x, duration: dur, ease: "power2.inOut" }, at).to(cur, { y, duration: dur, ease: "sine.inOut" }, at);
        },
        hover: (selector, at, vars) => {
          tl.to(q(selector), { backgroundColor: "var(--f-accent-deep)", duration: 0.2, ease: "none", ...vars }, at);
        },
        click: (selector, at) => {
          tl.to(art, { scale: 0.8, duration: 0.09, ease: "power1.in" }, at)
            .to(art, { scale: 1, duration: 0.25, ease: "back.out(3)" }, at + 0.09)
            .fromTo(ring, { scale: 0.2, autoAlpha: 0.9 }, { scale: 1.6, autoAlpha: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, at);
          if (selector)
            tl.to(q(selector), { scale: 0.92, duration: 0.09, ease: "power1.in" }, at).to(
              q(selector),
              { scale: 1, duration: 0.3, ease: "back.out(3)" },
              at + 0.09,
            );
        },
        type: (selector, text, at, dur) => {
          tl.to(q(selector), { text: { value: text }, duration: dur ?? text.length * 0.045, ease: "none" }, at);
        },
        show: (selector, at, vars, stagger) => {
          tl.fromTo(q(selector), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger, ...vars }, at);
        },
        hide: (selector, at, dur = 0.25) => {
          tl.to(q(selector), { autoAlpha: 0, duration: dur, ease: "none" }, at);
        },
        metric: (at) => {
          tl.fromTo(q("[data-metric]"), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at);
        },
      };

      const extraReset = build(kit) ?? (() => {});
      const reset = () => {
        apply();
        extraReset();
      };
      apply();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tl.progress(1);
        gsap.set(cur, { autoAlpha: 0 });
        return;
      }

      let fades: gsap.core.Tween[] = [];
      ctl.current = {
        play: () => {
          fades.forEach((t) => t.kill());
          gsap.set(stage, { autoAlpha: 1 });
          if (tl.progress() > 0) {
            tl.pause(0);
            reset();
          }
          tl.play(0);
        },
        stop: () => {
          tl.pause();
          if (tl.progress() > 0) fades = rewind(tl, stage, metricEl, reset);
        },
      };
    }, root);

    return () => {
      ro?.disconnect();
      ctl.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (on: boolean) => {
    if (playing.current === on) return;
    playing.current = on;
    if (on) ctl.current?.play();
    else ctl.current?.stop();
  };

  const handlers = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && set(true),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && set(false),
    onPointerUp: (e: React.PointerEvent) => e.pointerType !== "mouse" && set(!playing.current),
    // keyboard only: a tap also focuses the tile, and would cancel its own toggle
    onFocus: (e: React.FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && set(true),
    onBlur: () => set(false),
    tabIndex: 0,
  };
  return { ref, handlers };
}

/* ------------------------------------------------------------------ the frame */

/* the world (W × H) scaled to cover its space; inside it the camera, and the cursor on top */
export function FilmStage({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setS(Math.max(e.contentRect.width / W, e.contentRect.height / H)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="film-stage" data-stage="">
      <div className="film-world" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${s})` }}>
        <div className="film-cam" data-cam="" style={{ width: W, height: H }}>
          {children}
          <Cursor />
        </div>
      </div>
    </div>
  );
}

function Cursor() {
  return (
    <div className="f-cursor" data-cursor="" aria-hidden="true">
      <span className="f-ripple" data-ripple="" />
      <svg data-cursor-art="" width="17" height="22" viewBox="0 0 17 22" style={{ transformOrigin: "1px 1px", display: "block" }}>
        <path
          d="M1.5 1.5v16.2l4.1-3.9 2.9 6.4 2.9-1.3-2.8-6.2h5.7z"
          fill="#141a28"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* the words, bottom left: the name and one line; the number shows at the end of the film */
export function CaseWords({ copy, figureRef }: { copy: CaseCopy; figureRef?: React.Ref<HTMLSpanElement> }) {
  const m = copy.metrics[0];
  return (
    <div className="lin-words">
      <div className="min-w-0">
        <p className="lin-title">{copy.title}</p>
        <p className="lin-line">{copy.role}</p>
      </div>
      <p className="lin-metric" data-metric="">
        <span className="lin-figure" ref={figureRef}>
          {m.figure}
        </span>
        <span className="lin-line">{m.label}</span>
      </p>
    </div>
  );
}

/* a small tick for buttons and status chips */
export function Check() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 5.2 4.2 7.4 8.2 2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
