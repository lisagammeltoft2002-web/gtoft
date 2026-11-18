"use client";

import { useLayoutEffect, useRef } from "react";
import { gridSize } from "./gridSize";

const BASE = 100; // the text is laid out at 100px, then scaled
const NAME_SHARE = 0.6; // the name takes this much of the first row's height, the role (above it) the rest
const GAP = 0.05; // space between the two lines, as a share of the row height
/* the photo's oval as a share of the "o"'s ink: bigger than the hole inside the letter but
   smaller than the letter, so the letter's own strokes frame it exactly (the photo sits behind) */
const HOLE_W = 0.68, HOLE_H = 0.86;

/* The headline across the first `cells` rectangles of the first row: the role on top, the
   name below, each stretched so its actual letter shapes fill the full width.
   The portrait sits behind the "o" of the name, showing through the hole in the letter. */
export function Headline({ name, role, cells, photo, alt }: { name: string; role: string; cells: number; photo: string; alt: string }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const roleRef = useRef<HTMLParagraphElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const nameEl = nameRef.current, roleEl = roleRef.current, hole = holeRef.current;
    if (!nameEl || !roleEl || !hole) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;

    /* stretch one line into the box (top, height); returns how to map its own coordinates to the page */
    const fitLine = (el: HTMLElement, text: string, width: number, top: number, height: number) => {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontWeight} ${BASE}px ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      const m = ctx.measureText(text);
      // where the ink sits inside the element (line-height is 1, so the line box is BASE tall)
      const baseline = (BASE - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      const inkLeft = -m.actualBoundingBoxLeft, inkTop = baseline - m.actualBoundingBoxAscent;
      const sx = width / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
      const sy = height / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
      el.style.transform = `translate(${-inkLeft * sx}px, ${top - inkTop * sy}px) scale(${sx}, ${sy})`;
      return { baseline, x: (x: number) => (x - inkLeft) * sx, y: (y: number) => top + (y - inkTop) * sy };
    };

    const fit = () => {
      const { w, h } = gridSize();
      const width = w * cells, gap = h * GAP;
      // the role on top, the name (bigger) below it
      const nameH = (h - gap) * NAME_SHARE, roleH = h - gap - nameH;
      fitLine(roleEl, role, width, 0, roleH);
      const map = fitLine(nameEl, name, width, roleH + gap, nameH);

      // the "o" in the name: where its ink is, then the hole inside it
      const cs = getComputedStyle(nameEl);
      ctx.font = `${cs.fontWeight} ${BASE}px ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      const at = name.lastIndexOf("o");
      const before = ctx.measureText(name.slice(0, at)).width, o = ctx.measureText("o");
      const x0 = map.x(before - o.actualBoundingBoxLeft), x1 = map.x(before + o.actualBoundingBoxRight);
      const y0 = map.y(map.baseline - o.actualBoundingBoxAscent), y1 = map.y(map.baseline + o.actualBoundingBoxDescent);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rw = (x1 - x0) * HOLE_W, rh = (y1 - y0) * HOLE_H;
      Object.assign(hole.style, { left: `${cx - rw / 2}px`, top: `${cy - rh / 2}px`, width: `${rw}px`, height: `${rh}px` });
    };

    fit();
    document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [name, role, cells]);

  return (
    <header>
      <div ref={holeRef} className="headline-photo" role="img" aria-label={alt} style={{ backgroundImage: `url(${photo})` }} />
      <p ref={roleRef} className="headline" style={{ fontSize: BASE }}>
        {role}
      </p>
      <h1 ref={nameRef} className="headline" style={{ fontSize: BASE }}>
        {name}
      </h1>
    </header>
  );
}
