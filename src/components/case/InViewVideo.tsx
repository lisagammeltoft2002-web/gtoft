"use client";

import { useEffect, useRef, useState } from "react";

/* A screen recording that plays quietly while it is on screen and stops when it leaves.
   Muted and looping, with a small pause button in the corner: once you pause it, it stays
   paused. With reduced motion it waits on its first frame until you press play. */
export function InViewVideo({ base, poster, label }: { base: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const held = useRef(false); // paused by you (or by reduced motion), so scrolling won't restart it
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) held.current = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !held.current) void v.play().catch(() => {});
        else if (!e.isIntersecting) v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      held.current = false;
      void v.play().catch(() => {});
    } else {
      held.current = true;
      v.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="case-shot-video"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
      <button type="button" className="case-shot-pause" aria-label={playing ? "Pause video" : "Play video"} onClick={toggle}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
          {playing ? (
            <path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" />
          ) : (
            <path d="M3 1.2v9.6L10.6 6z" />
          )}
        </svg>
      </button>
    </>
  );
}
