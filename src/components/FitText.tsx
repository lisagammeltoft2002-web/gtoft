"use client";

import { useLayoutEffect, useRef } from "react";
import { gridSize } from "./gridSize";

const BASE = 100; // the text is laid out at 100px, then scaled

/* Stretches the text so its actual letter shapes (not the font's padding) fill exactly
   `cells` columns wide and exactly the first row tall: top of the L at the top edge,
   bottom of the p on the first horizontal line. */
export function FitText({ children, cells }: { children: string; cells: number }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;

    const fit = () => {
      const { w: cellW, h: cellH } = gridSize();
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontWeight} ${BASE}px ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      const m = ctx.measureText(children);

      // where the ink sits inside the element (line-height is 1, so the line box is BASE tall)
      const fontH = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
      const baseline = (BASE - fontH) / 2 + m.fontBoundingBoxAscent;
      const inkLeft = -m.actualBoundingBoxLeft;
      const inkTop = baseline - m.actualBoundingBoxAscent;
      const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;

      const sx = (cellW * cells) / inkW;
      const sy = cellH / inkH;
      el.style.transform = `translate(${-inkLeft * sx}px, ${-inkTop * sy}px) scale(${sx}, ${sy})`;
    };

    fit();
    document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [children, cells]);

  return (
    <h1 ref={ref} className="headline" style={{ fontSize: BASE }}>
      {children}
    </h1>
  );
}
