"use client";

import type { CaseStudy } from "@/content/site";
import { pad } from "@/content/site";
import { useCaseFocus } from "./play";

/* One case study, two rectangles wide, in the work blue: its story drawn on the left; on
   the right its number and kind, the one figure that sums it up, and its name and one line.
   Pointing at it plays its story. */
export function CaseTile({
  index,
  total,
  study,
  figure,
  figureLabel,
  children,
}: {
  index: number;
  total: number;
  study: CaseStudy;
  figure: string;
  figureLabel: string;
  children: React.ReactNode;
}) {
  const focus = useCaseFocus(index);
  const kind = study.kind.split("·")[0].trim();
  return (
    <article className="tile tone-work" aria-label={`${study.title}: ${study.short}`} onPointerEnter={focus} onFocus={focus}>
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative">{children}</div>
        <div className="tile-grid" style={{ position: "relative", inset: "auto" }}>
          <p className="tile-label t-label">
            <span className="tabular-nums">
              {pad(index + 1)} / {pad(total)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{kind}</span>
          </p>
          <div className="self-center">
            <p className="t-figure m-0">{figure}</p>
            <p className="t-label mt-2 mb-0 opacity-85">{figureLabel}</p>
          </div>
          <div className="tile-foot">
            <p className="t-title">{study.title}</p>
            <p className="t-body">{study.short}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
