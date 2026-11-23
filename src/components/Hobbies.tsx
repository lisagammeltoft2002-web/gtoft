"use client";

import { CurvedText } from "./CurvedText";

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
      {/* the hobby's name, then the line, bent round the circle's edge from 9 o'clock */}
      <p className="sr-only" aria-live="polite">
        {NAMES[index]}. When I’m not designing, I design.
      </p>
      <div key={index} className="fade-up absolute inset-0">
        <CurvedText title={NAMES[index]} text="When I’m not designing, I design." />
      </div>
    </section>
  );
}
