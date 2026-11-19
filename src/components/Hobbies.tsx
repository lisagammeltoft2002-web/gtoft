"use client";

import { useState } from "react";
import { Bloom } from "./Bloom";
import { NAMES } from "./sculptures";

/* The hobbies rectangle: a fine linen weave on the green, the turning 3D dot sculptures,
   the name of the hobby showing right now as a small label at the top and the line at the bottom. */
export function Hobbies() {
  const [index, setIndex] = useState(0);

  return (
    <section className="tile tone-leaf linen">
      <Bloom onShape={setIndex} />
      <p className="tile-label t-label absolute top-[var(--pad)] left-[var(--pad)] right-[var(--pad)] m-0 pointer-events-none" aria-live="polite">
        <span key={index} className="fade-up inline-block">
          {NAMES[index]}
        </span>
      </p>
      <p className="t-body absolute bottom-[var(--pad)] left-[var(--pad)] right-[var(--pad)] m-0 pointer-events-none">When I’m not designing, I design.</p>
    </section>
  );
}
