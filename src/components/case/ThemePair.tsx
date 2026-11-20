"use client";

import { useState } from "react";

/* One Studio scene in both themes. The round toggle cross-fades light to dark, the same
   way the image follows the theme switch on velory.com. */
export function ThemePair({ light, dark, alt }: { light: string; dark: string; alt: string }) {
  const [isDark, setDark] = useState(false);
  return (
    <div className={`case-media case-pair ${isDark ? "is-dark" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light} alt={alt} className="case-pair-light" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark} alt="" aria-hidden="true" className="case-pair-dark" />
      <button
        type="button"
        className="case-pair-toggle"
        aria-pressed={isDark}
        aria-label={isDark ? "Show the light version" : "Show the dark version"}
        onClick={() => setDark((d) => !d)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
        </svg>
        <span>{isDark ? "Dark" : "Light"}</span>
      </button>
    </div>
  );
}
