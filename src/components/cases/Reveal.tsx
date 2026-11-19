"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { CaseCopy } from "@/content/site";

/* The case studies, Linear style: one real piece of product UI floats calmly on a pale
   panel (the teaser). Pointing at the rectangle plays its reveal and shows what the project
   is; moving away plays it back. On touch screens a tap does the same. */

export type Q = (selector: string) => Element[];

export function useReveal(build: (q: Q, tl: gsap.core.Timeline) => void) {
  const ref = useRef<HTMLElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      build(gsap.utils.selector(root) as Q, tl);
      tlRef.current = tl;
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (open: boolean) => {
    const tl = tlRef.current;
    if (!tl || openRef.current === open) return;
    openRef.current = open;
    ref.current?.classList.toggle("is-open", open);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(open ? 1 : 0);
    else if (open) tl.timeScale(1).play();
    else tl.timeScale(1.7).reverse();
  };

  const handlers = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && set(true),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && set(false),
    onPointerUp: (e: React.PointerEvent) => e.pointerType !== "mouse" && set(!openRef.current),
    onFocus: () => set(true),
    onBlur: () => set(false),
    tabIndex: 0,
  };
  return { ref, handlers };
}

/* a fixed-size drawing board (w × h) scaled to fit its space, so the UI keeps its proportions */
export function Stage({ w = 460, h = 230, children }: { w?: number; h?: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setS(Math.min(e.contentRect.width / w, e.contentRect.height / h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return (
    <div ref={box} className="lin-stage">
      <div className="lin-board" style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${s})` }}>
        {children}
      </div>
    </div>
  );
}

/* the words, bottom left: the name and one grey line; the number shows on reveal */
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

/* curved connectors, drawn on reveal: from one point out to several */
export function Curves({ from, to, w = 460, h = 230 }: { from: [number, number]; to: [number, number][]; w?: number; h?: number }) {
  const [x0, y0] = from;
  return (
    <svg className="lin-curves" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {to.map(([x, y], i) => {
        const mid = (x0 + x) / 2;
        return <path key={i} data-curve="" d={`M${x0} ${y0} C${mid} ${y0}, ${mid} ${y}, ${x} ${y}`} pathLength={1} />;
      })}
      {to.map(([x, y], i) => (
        <path key={`a${i}`} data-curve-head="" d={`M${x - 4} ${y - 3} L${x} ${y} L${x - 4} ${y + 3}`} />
      ))}
    </svg>
  );
}

/* the shared reveal steps every case uses: curves draw, the number appears */
export function drawCurves(q: Q, tl: gsap.core.Timeline, at: string | number) {
  tl.fromTo(q("[data-curve]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, stagger: 0.07, ease: "power2.inOut" }, at).fromTo(
    q("[data-curve-head]"),
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.2, stagger: 0.07 },
    "-=0.25",
  );
}

export function showMetric(q: Q, tl: gsap.core.Timeline, at: string | number) {
  tl.fromTo(q("[data-metric]"), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at);
}
