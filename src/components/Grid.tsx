"use client";

import { useLayoutEffect } from "react";
import { gridSize } from "./gridSize";

/* Keeps the net's cell size in step with the screen, and lets the page scroll when the
   screen is too small for the whole board. */
export function Grid() {
  useLayoutEffect(() => {
    const set = () => {
      const { w, h, scroll } = gridSize();
      document.documentElement.classList.toggle("net-scroll", scroll);
      const root = document.documentElement.style;
      root.setProperty("--cell-w", `${w}px`);
      root.setProperty("--cell-h", `${h}px`);
      // type grows with the rectangles on big screens, never shrinks below the design size
      root.setProperty("--ui", String(Math.min(1.5, Math.max(1, Math.min(w / 250, h / 350)))));
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  return null;
}
