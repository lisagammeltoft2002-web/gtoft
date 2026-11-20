"use client";

import { useLayoutEffect } from "react";
import { gridSize } from "./gridSize";

/* Keeps the net's cell size in step with the screen, and lets the page scroll when the
   screen is too small for the whole board. Every rectangle is a rounded container with an
   even gap around it (the screen edges too), so the net shrinks a little to make room for
   one more gap. */
const GAP = 10;

export function Grid() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const set = () => {
      const { cols, rows, w: cw, h: ch, scroll } = gridSize();
      const w = (cw * cols - GAP) / cols;
      const h = scroll ? ch : (ch * rows - GAP) / rows;
      html.classList.toggle("net-scroll", scroll);
      const root = html.style;
      root.setProperty("--cell-w", `${w}px`);
      root.setProperty("--cell-h", `${h}px`);
      root.setProperty("--cell-in", `${GAP}px`);
      // type grows with the rectangles on big screens, never shrinks below the design size
      root.setProperty("--ui", String(Math.min(1.5, Math.max(1, Math.min(w / 250, h / 350)))));
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  return null;
}
