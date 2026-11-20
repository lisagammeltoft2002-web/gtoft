"use client";

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
            <Bloom make={journeyShape(s.shape)} dots={4200} marginY={6} label={`${s.label}, drawn in dots`} />
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
