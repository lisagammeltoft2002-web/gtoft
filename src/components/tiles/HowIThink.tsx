"use client";

import { CurvedText } from "../CurvedText";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bloom } from "../Bloom";
import { growingShapes } from "../journeyShapes";

/* How I think: the four questions I always ask, told the hobbies' way. One dot sculpture
   builds itself for each question (people, a map, coins, a magnifier) and flows into the
   next; the question it belongs to and its one line change with it. */
export function HowIThink({ label, steps }: { label: string; steps: { question: string; line: string; shape: string }[] }) {
  const [i, setI] = useState(0);
  const make = useMemo(() => growingShapes(steps.map((s) => s.shape)), [steps]);
  // Bloom says which sculpture is next as soon as it starts forming; the words follow once
  // it has mostly formed, so a question never sits under the previous one's shape
  const timer = useRef(0);
  const next = useCallback((k: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setI(k), 1200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const s = steps[i];
  return (
    <section className="tile how-think">
      {/* the sculpture has its own space above the words, so they never overlap */}
      <div className="how-think-art">
        <Bloom make={make} onShape={next} marginY={10} label={steps.map((x) => x.question).join(" ")} />
      </div>
      {/* "How I think", then the question and its line, bent round the edge from 9 o'clock */}
      <div className="sr-only" aria-live="polite">
        <p>{label}</p>
        <p>{s.question}</p>
        <p>{s.line}</p>
      </div>
      <div key={i} className="fade-up absolute inset-0">
        <CurvedText title={label} text={`${s.question} ${s.line}`} />
      </div>
    </section>
  );
}
