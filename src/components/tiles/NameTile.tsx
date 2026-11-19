"use client";

import { useLayoutEffect, useRef } from "react";

/* The name, across two rectangles: the biggest words on the page, on two lines, as wide as
   the rectangles allow (scaled evenly, never stretched), with a slow caret after it,
   because the designer also writes the code. Below: what she is, and her one line. */
const BASE = 100; // measured at 100px, then scaled
const HEIGHT_SHARE = 0.58; // the name takes at most this much of the rectangle's height

export function NameTile({ first, last, title, line }: { first: string; last: string; title: string; line: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current, name = nameRef.current;
    if (!box || !name) return;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;
    const fit = () => {
      const cs = getComputedStyle(name);
      const pad = parseFloat(getComputedStyle(box).getPropertyValue("--pad")) || 20;
      ctx.font = `600 ${BASE}px ${cs.fontFamily}`;
      ctx.letterSpacing = "-0.04em";
      const widest = Math.max(ctx.measureText(first).width, ctx.measureText(last + "|").width);
      const byWidth = ((box.clientWidth - pad * 2) / widest) * BASE;
      const byHeight = (box.clientHeight * HEIGHT_SHARE) / 1.8; // two lines at 0.9 line height
      name.style.fontSize = `${Math.min(byWidth, byHeight)}px`;
    };
    fit();
    document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [first, last]);

  // each letter rises in once, one after another
  const letters = (word: string, from: number) =>
    [...word].map((ch, i) => (
      <span key={i} className="name-letter" style={{ animationDelay: `${(from + i) * 45}ms` }}>
        {ch}
      </span>
    ));

  return (
    <div ref={boxRef} className="tile tone-paper">
      <h1 ref={nameRef} className="name-big" aria-label={`${first} ${last}`}>
        <span aria-hidden="true" className="block">
          {letters(first, 0)}
        </span>
        <span aria-hidden="true" className="block">
          {letters(last, first.length)}
          <span className="name-caret" />
        </span>
      </h1>
      <div className="tile-foot absolute left-[var(--pad)] right-[var(--pad)] bottom-[var(--pad)] max-w-[30rem]">
        <p className="t-title">{title}</p>
        <p className="t-body opacity-90">{line}</p>
      </div>
    </div>
  );
}
