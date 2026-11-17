"use client";

import { useEffect, useRef, useState } from "react";
import { createFlow } from "./flow";

/* A lab for the sand flow on its own: the ball, the wind and the desert on one screen, with a
   scrubber (progress P), play and pause. ?p=0.4 sets the progress, ?t=12 freezes the clock,
   ?n=30000 sets the number of grains (for quick tests). */
export function SandLab() {
  const paper = useRef<HTMLCanvasElement>(null);
  const sand = useRef<HTMLCanvasElement>(null);
  /* the truth lives in a ref (read every frame); React state only mirrors it for the controls */
  const state = useRef({ P: 0, playing: false });
  const [ui, setUi] = useState({ P: 0, playing: false });
  const set = (next: Partial<{ P: number; playing: boolean }>) => {
    Object.assign(state.current, next);
    setUi({ ...state.current });
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fixedClock = q.has("t") ? Number(q.get("t")) : null;
    if (q.has("p")) state.current.P = Number(q.get("p"));
    const flow = createFlow(paper.current!, sand.current!, q.has("n") ? Number(q.get("n")) : 120000, true);
    if (!flow) return;
    const resize = () => flow.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = state.current;
      if (s.playing) {
        s.P = Math.min(1, s.P + dt / 16); /* the whole journey in 16 seconds */
        if (s.P >= 1) s.playing = false;
      }
      setUi({ P: s.P, playing: s.playing });
      flow.render(s.P, fixedClock ?? now / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    flow.onReady = () => (document.documentElement.dataset.ready = "1");
    return () => {
      cancelAnimationFrame(raf);
      flow.dispose();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-cream">
      <canvas ref={paper} aria-hidden className="absolute inset-0 h-full w-full" />
      <canvas ref={sand} aria-hidden className="absolute inset-0 h-full w-full" />
      <div className="absolute left-4 top-4 flex items-center gap-3 rounded-full bg-cream/85 px-4 py-2 text-sm text-moss backdrop-blur">
        <button type="button" className="w-12 text-left" onClick={() => set(ui.P >= 1 ? { P: 0, playing: true } : { playing: !ui.playing })}>
          {ui.playing ? "pause" : "play"}
        </button>
        <input type="range" min={0} max={1} step={0.001} value={ui.P} onChange={(e) => set({ playing: false, P: +e.target.value })} className="w-[40vw]" />
        <span className="w-10 tabular-nums">{ui.P.toFixed(2)}</span>
      </div>
    </main>
  );
}
