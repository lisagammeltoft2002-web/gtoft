"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type gsap from "gsap";

/* Only one case study plays at a time, so the page never has everything moving at once:
   01, then 02, then 03, and round again. The others rest on their nicest frame (the label
   "rest" in their timeline). Pointing at a case plays it straight away. */

const PlayCtx = createContext({ active: 0, count: 1, setActive: (() => {}) as React.Dispatch<React.SetStateAction<number>> });

export function CasePlay({ count, children }: { count: number; children: React.ReactNode }) {
  const [active, setActive] = useState(0);
  return <PlayCtx.Provider value={{ active, count, setActive }}>{children}</PlayCtx.Provider>;
}

/* for the rectangle: play this case while it's pointed at */
export function useCaseFocus(index: number) {
  const { setActive } = useContext(PlayCtx);
  return () => setActive(index);
}

/* for the animation: give it the timeline (built paused, with a "rest" label and repeat 0);
   it plays from "rest" (clearing, building up again) and hands over when it gets back there */
export function useCaseTimeline(index: number) {
  const { active, count, setActive } = useContext(PlayCtx);
  const playing = active === index;
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(0);

  const handOver = () => {
    if (performance.now() - startedRef.current < 200) return; // just started from here
    setActive((a) => (a === index ? (index + 1) % count : a));
  };
  const handOverRef = useRef(handOver);
  useEffect(() => {
    handOverRef.current = handOver;
  });

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (playing) {
      startedRef.current = performance.now();
      tl.play("rest");
    } else {
      tl.pause();
      tl.seek("rest", true);
    }
  }, [playing]);

  /* call when the timeline is built; call what it returns when the animation is cleaned up */
  const attach = (tl: gsap.core.Timeline) => {
    tlRef.current?.kill();
    tlRef.current = tl;
    tl.call(() => handOverRef.current(), [], "rest");
    tl.eventCallback("onComplete", () => tl.restart());
    if (playing) {
      startedRef.current = performance.now();
      tl.play("rest");
    } else tl.seek("rest", true);
    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
    };
  };
  return attach;
}
