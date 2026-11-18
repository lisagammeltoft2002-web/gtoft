"use client";

import { useEffect, useRef } from "react";

/* The sunflower field swaying in the wind. The clip (made with Kling from Lisa's photo)
   plays forward and then backward, so its end always meets its start and the loop never
   shows a seam. It's silent and starts by itself; with reduced motion it stays still. */
export function WindyField() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => (still.matches ? video.pause() : video.play().catch(() => {}));
    apply();
    still.addEventListener("change", apply);
    return () => still.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      poster="/images/sunflower-wind-poster.jpg"
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      aria-label="Sunflowers and tall grass swaying in the wind against a blue sky"
    >
      <source src="/videos/sunflower-wind.webm" type="video/webm" />
      <source src="/videos/sunflower-wind.mp4" type="video/mp4" />
    </video>
  );
}
