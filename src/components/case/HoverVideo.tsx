"use client";

import { useRef, useState } from "react";

/* A Velory Studio film that rests on its first frame and plays only while you hover it
   (tap toggles on touch). It rests on `start`, the same frame as the poster, and leaving
   goes back there, like the home page tiles. */
export function HoverVideo({ src, poster, label, start = 0 }: { src: string; poster: string; label: string; start?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused && v.currentTime < start) v.currentTime = start;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = start;
    setPlaying(false);
  };

  return (
    <button
      type="button"
      className={`case-film ${playing ? "is-playing" : ""}`}
      aria-label={`${playing ? "Stop" : "Play"} film: ${label}`}
      aria-pressed={playing}
      onPointerEnter={(e) => e.pointerType === "mouse" && play()}
      onPointerLeave={(e) => e.pointerType === "mouse" && stop()}
      onClick={() => (playing ? stop() : play())}
    >
      <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" />
      <span className="case-film-tag t-label">
        <span className="case-film-dot" aria-hidden="true" />
        {label}
      </span>
    </button>
  );
}
