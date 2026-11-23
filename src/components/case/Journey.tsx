"use client";

import { useEffect, useRef, useState } from "react";
import { Bloom } from "@/components/Bloom";
import { journeyShape } from "@/components/journeyShapes";

/* The journey as a row of green tiles, like the hobbies tile: each step a small 3D dot
   sculpture that rocks gently and scatters when you point at it, its number, name and line. */
export function Journey({ steps }: { steps: { label: string; note: string; shape: string }[] }) {
  return (
    <ol className="case-journey">
      {steps.map((s, i) => (
        <li key={s.label} className="tone-leaf linen case-step">
          <div className="case-step-art">
            <Later>
              <Bloom make={journeyShape(s.shape)} dots={4200} marginY={6} label={`${s.label}, drawn in dots`} />
            </Later>
          </div>
          <div className="case-step-words">
            <span className="case-step-num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{s.label}</h3>
            <p>{s.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* Each sculpture is a WebGL canvas with thousands of dots worked out up front. Building all of
   them the moment the page opens made the opening (the tile growing into the page) stutter,
   so each one is only made once it is about a screen away from being seen. */
function Later({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return (
    <div ref={ref} style={{ width: "100%", height: "100%" }}>
      {near && children}
    </div>
  );
}
