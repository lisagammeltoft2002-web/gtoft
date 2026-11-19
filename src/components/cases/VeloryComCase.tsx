"use client";

import type { CaseCopy } from "@/content/site";
import { CaseWords, Stage, showMetric, useReveal } from "./Reveal";

/* velory.com. Still: a small browser floats with the old page, a generic headline in grey.
   Reveal: the old page slides away and the fresh one arrives: problems first, one action,
   and the lifecycle turning. Same brand, made fresher. */

export function VeloryComCase({ copy }: { copy: CaseCopy }) {
  const { ref, handlers } = useReveal((q, tl) => {
    tl.to(q("[data-old]"), { autoAlpha: 0, y: -14, duration: 0.4, stagger: 0.05, ease: "power2.in" })
      .to(q("[data-url]"), { color: "var(--cb)", duration: 0.3 }, "<")
      .fromTo(q("[data-new]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 }, "-=0.1")
      .fromTo(q("[data-cycle]"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, "<0.15");
    showMetric(q, tl, "<0.1");
  });

  return (
    <article ref={ref} className="lin-tile" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <Stage>
        <div className="lin-abs" style={{ left: 66, top: 30, width: 330 }}>
          <div className="lin-float">
            <div className="lin-card lin-ui overflow-hidden" style={{ height: 250 }}>
              {/* the browser bar */}
              <div className="flex items-center gap-1.5 border-b border-[var(--cb-wash)] px-3" style={{ height: 26 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="block h-[7px] w-[7px] rounded-full bg-[var(--cb-wash)]" />
                ))}
                <span data-url="" className="mx-auto rounded-md bg-[var(--cb-wash)] px-6 py-[2px] text-[10.5px] text-[color:var(--cb-faint)]">
                  velory.com
                </span>
              </div>

              <div className="relative" style={{ height: 224 }}>
                {/* the old page */}
                <div className="absolute inset-0 px-6 pt-7">
                  <p data-old="" className="m-0 text-[19px] font-medium leading-tight tracking-[-0.01em] text-[color:var(--cb-faint)]">
                    IT Lifecycle on Autopilot
                  </p>
                  <div data-old="" className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {[86, 70, 92, 64, 78, 88].map((w, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-[var(--cb-faint)]" />
                        <span className="block h-[5px] rounded-full bg-[var(--cb-wash)]" style={{ width: w }} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* the fresh page */}
                <div className="absolute inset-0 px-6 pt-6">
                  <p data-new="" className="lin-hidden lin-serif m-0 text-[25px] leading-[1.08]">
                    Someone left.
                    <br />
                    Licences stayed.
                  </p>
                  <span data-new="" className="lin-hidden lin-btn mt-5 inline-block">
                    See how
                  </span>
                  <svg data-cycle="" className="lin-hidden absolute" style={{ right: 22, top: 30 }} width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
                    <circle cx="38" cy="38" r="30" fill="none" stroke="var(--cb-wash)" strokeWidth="1" />
                    {[0, 1, 2, 3].map((i) => (
                      <circle key={i} cx={38 + 30 * Math.round(Math.cos((i * Math.PI) / 2))} cy={38 + 30 * Math.round(Math.sin((i * Math.PI) / 2))} r="2.6" fill="var(--cb-faint)" />
                    ))}
                    <g className="lin-orbit">
                      <circle cx="38" cy="8" r="6" fill="var(--cb)" fillOpacity="0.15" />
                      <circle cx="38" cy="8" r="3" fill="var(--cb)" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Stage>
      <CaseWords copy={copy} />
    </article>
  );
}
