"use client";

import { useLayoutEffect } from "react";
import { gridSize } from "./gridSize";

/* Keeps the net's cell size in step with the screen. */
export function Grid() {
  useLayoutEffect(() => {
    const set = () => {
      const { w, h } = gridSize();
      const root = document.documentElement.style;
      root.setProperty("--cell-w", `${w}px`);
      root.setProperty("--cell-h", `${h}px`);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  return null;
}
