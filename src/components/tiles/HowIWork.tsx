"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* How Lisa works, as one slow line: a pen draws a single winding line down the rectangle,
   and each step it passes appears beside it (journeys, people, business, build). Then
   the line lets go from its start and draws again. Calm on purpose. */

const STEPS = [
  { x: 42, y: 28, at: 0.06 },
  { x: 118, y: 72, at: 0.37 },
  { x: 42, y: 116, at: 0.66 },
  { x: 118, y: 160, at: 0.95 },
];
const LINE = "M14 28 C 30 28, 34 28, 42 28 S 100 40, 118 72 S 60 96, 42 116 S 104 136, 118 160 S 140 168, 148 168";
const DRAW = 6, REST = 1.2, LET_GO = 3;

export function HowIWork({ steps }: { steps: string[] }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    const line = svg?.querySelector<SVGPathElement>("[data-line]");
    const pen = svg?.querySelector<SVGCircleElement>("[data-pen]");
    if (!svg || !line || !pen) return;
    const q = gsap.utils.selector(svg);
    const L = line.getTotalLength();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      gsap.set(line, { strokeDasharray: `${L} ${L}` });
      if (still) {
        gsap.set(line, { strokeDashoffset: 0 });
        gsap.set(q("[data-step]"), { autoAlpha: 1 });
        gsap.set(pen, { autoAlpha: 0 });
        return;
      }
      const head = { v: 0 };
      const movePen = () => {
        const p = line.getPointAtLength(head.v * L);
        pen.setAttribute("cx", String(p.x));
        pen.setAttribute("cy", String(p.y));
      };
      const tl = gsap.timeline({ repeat: -1 });
      tl.set(line, { strokeDashoffset: L })
        .set(q("[data-step]"), { autoAlpha: 0, y: 3 })
        .set(head, { v: 0 })
        .set(pen, { autoAlpha: 1 })
        .to(line, { strokeDashoffset: 0, duration: DRAW, ease: "sine.inOut" })
        .to(head, { v: 1, duration: DRAW, ease: "sine.inOut", onUpdate: movePen }, "<");
      // each step appears as the pen passes it
      STEPS.forEach((s, i) => {
        // sine.inOut: when does progress reach s.at?
        const t = (Math.acos(1 - 2 * s.at) / Math.PI) * DRAW;
        tl.to(q(`[data-step="${i}"]`), { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, t - 0.1);
      });
      tl.to(pen, { autoAlpha: 0, duration: 0.4 }, DRAW)
        // the line lets go from its start, and the steps fade in the same order
        .to(line, { strokeDashoffset: -L, duration: LET_GO, ease: "sine.inOut" }, DRAW + REST)
        .to(q("[data-step]"), { autoAlpha: 0, duration: 0.6, stagger: LET_GO / 4 }, DRAW + REST + 0.2);
    }, svg);
    return () => ctx.revert();
  }, []);

  const icon = (i: number, x: number, y: number) => {
    const s = { fill: "none", stroke: "currentColor", strokeWidth: 0.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (i === 0) // journeys: a winding path from a start to a pin
      return (
        <g {...s}>
          <circle cx={x - 7} cy={y + 5} r="1.4" />
          <path d={`M${x - 5.6} ${y + 4.4} q5 -6 9 -2 t6 -6`} strokeDasharray="1.2 1.4" />
          <path d={`M${x + 9.5} ${y - 9} a2.4 2.4 0 1 1 0.01 0 M${x + 9.5} ${y - 6.6} v3`} />
        </g>
      );
    if (i === 1) // people: two of them
      return (
        <g {...s}>
          <circle cx={x - 4} cy={y - 5} r="2.6" />
          <path d={`M${x - 9} ${y + 4} q5 -6 10 0`} />
          <circle cx={x + 5} cy={y - 4} r="2.3" />
          <path d={`M${x + 1} ${y + 4} q4 -5 9 0`} />
        </g>
      );
    if (i === 2) // business: it grows
      return (
        <g {...s}>
          <path d={`M${x - 9} ${y + 5} h18`} />
          <path d={`M${x - 6} ${y + 5} v-4 M${x - 1} ${y + 5} v-7 M${x + 4} ${y + 5} v-10`} strokeWidth="2" />
          <path d={`M${x - 8} ${y - 3} l5 -4 4 2 6 -5 m-3 0 h3 v3`} />
        </g>
      );
    return ( // build: the code brackets
      <text x={x} y={y + 3} textAnchor="middle" fontSize="10" fill="currentColor" fontFamily="ui-monospace, Menlo, monospace">
        {"</>"}
      </text>
    );
  };

  return (
    <svg ref={ref} viewBox="0 0 160 190" className="case-svg absolute inset-0 m-auto h-full w-[88%]" role="img" aria-label={`How I work: ${steps.join(", ")}`}>
      <path data-line="" d={LINE} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <circle data-pen="" r="1.6" fill="currentColor" />
      {STEPS.map((s, i) => {
        const left = s.x < 80;
        return (
          <g key={i} data-step={i}>
            <circle cx={s.x} cy={s.y} r="2" fill="currentColor" />
            {icon(i, left ? s.x + 34 : s.x - 34, s.y - 2)}
            <text x={left ? s.x + 8 : s.x - 8} y={s.y + 14} textAnchor={left ? "start" : "end"} fontSize="8" fill="currentColor">
              {String(i + 1).padStart(2, "0")} {steps[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
