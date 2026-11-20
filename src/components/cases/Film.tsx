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

/* fade a film back to its first frame */
function rewind(tl: gsap.core.Timeline, fade: HTMLElement, metric: HTMLElement | null, reset: () => void) {
  if (metric) gsap.to(metric, { autoAlpha: 0, duration: 0.3, overwrite: true });
  gsap.to(fade, {
    autoAlpha: 0,
    duration: 0.3,
    overwrite: true,
    onComplete() {
      tl.pause(0);
      reset();
      gsap.to(fade, { autoAlpha: 1, duration: 0.4 });
    },
  });
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

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      // the cursor keeps its size on screen while the camera zooms
      const keepCursor = () => gsap.set(cur, { scale: 1 / (Number(gsap.getProperty(camEl, "scaleX")) || 1) });
      tl.eventCallback("onUpdate", keepCursor);

      const camVars = (x: number, y: number, z: number) => ({ x: W / 2 - x * z, y: H / 2 - y * z, scale: z });
      let cursorShown = false;

      const kit: Kit = {
        q,
        tl,
        start: (x, y, z) => gsap.set(camEl, { ...camVars(x, y, z), transformOrigin: "0 0" }),
        cam: (x, y, z, at, dur = 1.15) => {
          tl.to(camEl, { ...camVars(x, y, z), duration: dur, ease: "power3.inOut" }, at);
        },
        cursorStart: (x, y) => gsap.set(cur, { x, y, autoAlpha: 0 }),
        cursor: (x, y, at, dur = 0.85) => {
          if (!cursorShown) {
            cursorShown = true;
            tl.to(cur, { autoAlpha: 1, duration: 0.25, ease: "none" }, at);
          }
          tl.to(cur, { x, y, duration: dur, ease: "power2.inOut" }, at);
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
        keepCursor();
        extraReset();
      };
      keepCursor();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tl.progress(1);
        gsap.set(cur, { autoAlpha: 0 });
        return;
      }

      ctl.current = {
        play: () => {
          gsap.killTweensOf([stage, metricEl].filter(Boolean));
          gsap.set(stage, { autoAlpha: 1 });
          if (tl.progress() > 0) {
            tl.pause(0);
            reset();
          }
          tl.play(0);
        },
        stop: () => {
          tl.pause();
          if (tl.progress() > 0) rewind(tl, stage, metricEl, reset);
        },
      };
    }, root);

    return () => {
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

/* the world (W × H) scaled to fit its space; inside it the camera, and the cursor on top */
export function FilmStage({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setS(Math.min(e.contentRect.width / W, e.contentRect.height / H)));
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
