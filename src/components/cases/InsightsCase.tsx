"use client";

import { useRef } from "react";
import type { CaseCopy } from "@/content/site";
import { CaseWords, Curves, Stage, drawCurves, showMetric, useReveal } from "./Reveal";

/* Actionable Insights. Still: one insight floats, "6 licences nobody uses", with its
   "Ask users" button. Reveal: one click, curves run out to the people holding the licences,
   their answers come back, every "No" is cancelled, and the saving counts up. */

const PEOPLE = [
  { name: "Anna", answer: "No" },
  { name: "Johan", answer: "No" },
  { name: "Maja", answer: "Yes" },
  { name: "Sara", answer: "No" },
];
const ROW_X = 292, ROW_Y = [14, 70, 126, 182];

export function InsightsCase({ copy }: { copy: CaseCopy }) {
  const figure = useRef<HTMLSpanElement>(null);
  const { ref, handlers } = useReveal((q, tl) => {
    const saved = { v: 0 };
    const render = () => {
      if (figure.current) figure.current.textContent = `${Math.round(saved.v).toLocaleString("sv-SE")} kr`;
    };
    render();
    tl.to(q("[data-ask]"), { scale: 0.9, duration: 0.12, ease: "power1.in" })
      .to(q("[data-ask]"), { scale: 1, duration: 0.3, ease: "back.out(3)" })
      .to(q("[data-ask-label]"), { autoAlpha: 0, duration: 0.15 }, "<")
      .to(q("[data-asked-label]"), { autoAlpha: 1, duration: 0.2 }, "<0.1")
      .to(q("[data-insight]"), { x: -100, scale: 0.88, duration: 0.6, ease: "power3.inOut" }, "<");
    drawCurves(q, tl, "-=0.15");
    tl.fromTo(q("[data-row]"), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.08 }, "-=0.45")
      .fromTo(q("[data-answer]"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.12, ease: "back.out(2.5)" }, "+=0.05")
      .fromTo(q("[data-cancel]"), { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.3, stagger: 0.12, ease: "power2.inOut" }, "-=0.1");
    showMetric(q, tl, "<");
    tl.to(saved, { v: 9600, duration: 1, ease: "power2.out", onUpdate: render }, "<");
  });

  return (
    <article ref={ref} className="lin-tile" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <Stage>
        <Curves from={[252, 114]} to={ROW_Y.map((y) => [ROW_X - 4, y + 17] as [number, number])} />

        {/* the insight: the teaser */}
        <div data-insight="" className="lin-abs" style={{ left: 105, top: 58, width: 250 }}>
          <div className="lin-float">
            <div className="lin-card lin-ui" style={{ padding: "13px 14px 14px" }}>
              <p className="m-0 flex items-center gap-1.5 text-[11px] text-[color:var(--cb-soft)]">
                <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" fill="none" stroke="var(--cb)" strokeWidth="1.3" />
                  <path d="M6 1a5 5 0 0 1 0 10z" fill="var(--cb)" />
                </svg>
                Insight
              </p>
              <p className="lin-serif mt-2 mb-0 text-[17px] leading-snug">6 licences nobody uses</p>
              <p className="mt-0.5 mb-0 text-[11.5px] text-[color:var(--cb-soft)]">14 400 kr a year</p>
              <span data-ask="" className="lin-btn relative mt-3 inline-grid">
                <span data-ask-label="" className="[grid-area:1/1]">
                  Ask users
                </span>
                <span data-asked-label="" className="lin-hidden [grid-area:1/1]">
                  Asked ✓
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* the people and their answers */}
        {PEOPLE.map((p, i) => (
          <div key={p.name} data-row="" className="lin-abs lin-card lin-ui lin-hidden flex items-center gap-2" style={{ left: ROW_X, top: ROW_Y[i], width: 210, height: 34, padding: "0 8px" }}>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--cb-wash)] text-[10px] text-[color:var(--cb)]">{p.name[0]}</span>
            <span className="relative text-[12px]">
              {p.name}
              {p.answer === "No" && <span data-cancel="" className="absolute top-1/2 left-[-2px] right-[-2px] h-px bg-[var(--cb-soft)]" />}
            </span>
            <span data-answer="" className={`lin-chip ${p.answer === "No" ? "lin-chip-no" : ""}`}>
              {p.answer}
            </span>
            <span className="whitespace-nowrap text-[10.5px] text-[color:var(--cb-faint)]">via Slack · just now</span>
          </div>
        ))}
      </Stage>
      <CaseWords copy={copy} figureRef={figure} />
    </article>
  );
}
