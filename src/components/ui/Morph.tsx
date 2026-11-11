"use client";

import { useEffect, useRef, useState } from "react";

/* Text that turns into other text. When `text` changes, the letters resolve left to
   right into the new copy; the not-yet-resolved tail flickers through a few quiet
   glyphs at low opacity. Nothing moves, so the page never jumps. */

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = LOWER.toUpperCase();
const glyph = (target: string) => {
  const set = target === target.toUpperCase() && target !== target.toLowerCase() ? UPPER : LOWER;
  return set[(Math.random() * set.length) | 0];
};

export function Morph({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState({ done: text, tail: "" });
  const from = useRef(text);

  useEffect(() => {
    const a = from.current;
    from.current = text;
    if (a === text) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const L = Math.max(a.length, text.length);
    const step = reduce ? 1e-6 : Math.min(26, 520 / Math.max(L, 1)); // ms per letter, whole morph ≤ ~0.7s
    const lead = reduce ? -1 : 90; // a short beat of scramble before the first letter lands
    const t0 = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const resolved = Math.min(L, Math.max(0, Math.floor((now - t0 - lead) / step)));
      if (now - last > 45 || resolved === L) {
        last = now;
        let tail = "";
        for (let i = resolved; i < L; i++) {
          const ch = text[i] ?? a[i] ?? "";
          tail += ch === " " || ch === "" ? ch : glyph(ch);
        }
        // the tail shrinks toward the target length as it resolves
        const keep = Math.max(text.length - resolved, Math.round((L - resolved) * (1 - (now - t0) / (lead + step * L))));
        setShown({ done: text.slice(0, resolved), tail: tail.slice(0, Math.max(0, keep)) });
      }
      if (resolved < L) raf = requestAnimationFrame(tick);
      else setShown({ done: text, tail: "" });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {shown.done}
        <span className="opacity-35">{shown.tail}</span>
      </span>
    </span>
  );
}
