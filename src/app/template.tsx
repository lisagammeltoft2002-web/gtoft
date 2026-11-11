"use client";

import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

/** Soft page transition: each route settles in like a sheet of paper. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.matchMedia().add(MOTION_OK, () => {
      // Opacity only: a transform here would break pinned sections (position: fixed).
      gsap.from(ref.current, { autoAlpha: 0, duration: 1, ease: "power2.out" });
    });
  });
  return <div ref={ref}>{children}</div>;
}
