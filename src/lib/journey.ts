"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/* Tiny shared store between the 3D scene and the HTML overlays. */

export type Vec3 = [number, number, number];
type Anchor = { el: HTMLElement; p: Vec3; q?: Vec3; cb?: (x: number, y: number) => void };

type State = {
  workIndex: number; // project in the frame
  step: number; // How-I-work stop the car has reached (-1 before)
  skyline: number[] | null; // footer mountain silhouette, screen-y (0..1) per x bucket
  ready: boolean; // scene rendered its first frame
  section: string; // open | hero | work | map | bring | valley
  bringIndex: number; // which "What I bring" row is current
};

let state: State = { workIndex: 0, step: -1, skyline: null, ready: false, section: "open", bringIndex: 0 };
const listeners = new Set<() => void>();
export const anchors = new Set<Anchor>();

export function setJourney(patch: Partial<State>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof State)[]) {
    if (state[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getJourney() {
  return state;
}

export function useJourney<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => pick(state),
    () => pick(state),
  );
}

/** Pin an HTML element to a point in the 3D world. Optional `q` rotates it along p→q on screen. */
export function useAnchor<T extends HTMLElement>(p: Vec3, q?: Vec3, cb?: (x: number, y: number) => void) {
  const ref = useRef<T>(null);
  const key = JSON.stringify([p, q]);
  useEffect(() => {
    if (!ref.current) return;
    const a: Anchor = { el: ref.current, p, q, cb };
    anchors.add(a);
    return () => {
      anchors.delete(a);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ref;
}
