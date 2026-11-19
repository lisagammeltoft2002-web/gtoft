"use client";

import type { CaseCopy } from "@/content/site";
import { CaseWords, Curves, Stage, drawCurves, showMetric, useReveal } from "./Reveal";

/* Velory Studio. Still: one message floats, "Banner for the portal launch", ready to send.
   Reveal: it's sent, glides left, and three curves grow out into the finished pieces: a
   banner, a slide and a story. */

const OUT = [
  { name: "Banner", meta: "LinkedIn · 1200 × 627 · on brand", shape: "wide" },
  { name: "Slide", meta: "Deck · 16 : 9 · Friday demo", shape: "slide" },
  { name: "Story", meta: "Film · 9 : 16 · 15 seconds", shape: "tall" },
];
const OUT_X = 290, OUT_Y = [22, 92, 162]; // where the pieces sit (top left of each card)

export function StudioCase({ copy }: { copy: CaseCopy }) {
  const { ref, handlers } = useReveal((q, tl) => {
    tl.to(q("[data-send]"), { scale: 0.88, duration: 0.12, ease: "power1.in" })
      .to(q("[data-send]"), { scale: 1, duration: 0.3, ease: "back.out(3)" })
      .to(q("[data-composer]"), { x: -96, scale: 0.86, duration: 0.6, ease: "power3.inOut" }, "<")
      .to(q("[data-sent-tick]"), { autoAlpha: 1, duration: 0.2 }, "<0.3");
    drawCurves(q, tl, "-=0.15");
    tl.fromTo(q("[data-out]"), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.08 }, "-=0.45");
    showMetric(q, tl, "<0.1");
  });

  return (
    <article ref={ref} className="lin-tile" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <Stage>
        <Curves from={[264, 115]} to={OUT_Y.map((y) => [OUT_X - 4, y + 23] as [number, number])} />

        {/* the message: the teaser */}
        <div data-composer="" className="lin-abs" style={{ left: 100, top: 68, width: 260 }}>
          <div className="lin-float">
            <div className="lin-card lin-ui" style={{ padding: "14px 14px 10px" }}>
              <p className="m-0 text-[13.5px] leading-snug">Banner for the portal launch</p>
              <div className="mt-6 flex items-center gap-3 text-[color:var(--cb-faint)]">
                <span className="text-[15px] leading-none">+</span>
                <span className="text-[12px]">Aa</span>
                <span className="text-[12px]">@</span>
                <span data-sent-tick="" className="lin-hidden ml-auto text-[11px]">
                  Sent
                </span>
                <span data-send="" className="lin-send" style={{ marginLeft: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* what comes out */}
        {OUT.map((o, i) => (
          <div key={o.name} data-out="" className="lin-abs lin-card lin-ui lin-hidden flex items-center gap-3" style={{ left: OUT_X, top: OUT_Y[i], width: 220, height: 46, padding: "0 10px" }}>
            <Thumb shape={o.shape} />
            <div className="min-w-0">
              <p className="m-0 text-[12.5px] leading-tight">{o.name}</p>
              <p className="m-0 whitespace-nowrap text-[10.5px] leading-tight text-[color:var(--cb-soft)]">{o.meta}</p>
            </div>
          </div>
        ))}
      </Stage>
      <CaseWords copy={copy} />
    </article>
  );
}

/* a tiny on-brand piece: the work blue, a sky mountain, a line of headline */
function Thumb({ shape }: { shape: string }) {
  const [w, h] = shape === "wide" ? [40, 22] : shape === "slide" ? [38, 22] : [16, 28];
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true" className="shrink-0">
      <g transform={`translate(${(40 - w) / 2} ${(28 - h) / 2})`}>
        <rect width={w} height={h} rx="2.5" fill="var(--cb)" />
        <polygon points={`${w * 0.45},${h} ${w * 0.68},${h * 0.45} ${w * 0.8},${h * 0.65} ${w},${h * 0.35} ${w},${h}`} fill="var(--cb-faint)" />
        <rect x="3" y="4" width={Math.max(6, w * 0.4)} height="2" rx="1" fill="var(--paper)" />
      </g>
    </svg>
  );
}
