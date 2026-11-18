"use client";

import { useState } from "react";
import { Bloom } from "./Bloom";
import { NAMES } from "./sculptures";

/* The hobbies rectangle: a fine linen weave on the green, the turning 3D dot sculptures, with a small heading at the top and,
   at the bottom, the name of the hobby showing right now. Same blue as the dots. */
export function Hobbies() {
  const [index, setIndex] = useState(0);
  const count = String(NAMES.length).padStart(2, "0");

  return (
    <div className="hobbies-linen relative h-full w-full">
      <Bloom onShape={setIndex} />
      <p className="hobbies-text top-4">When I’m not designing, I design</p>
      <p className="hobbies-text bottom-4" aria-live="polite">
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")} / {count}
        </span>
        <span aria-hidden="true">·</span>
        <span key={index} className="hobbies-name">
          {NAMES[index]}
        </span>
      </p>
    </div>
  );
}
