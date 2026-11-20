"use client";

import { Bloom } from "../Bloom";
import { paperPlane } from "../sculptures";

const plane = (n: number) => [paperPlane(n)];

/* The way to reach Lisa: the only yellow on the page, so the eye ends here. A paper plane
   drawn by the hobbies' own engine (Bloom: tiny sky-blue dots that build themselves, turn,
   lean toward the cursor and scatter when you point at them) is always there, finished,
   then one warm line and email, LinkedIn and the CV as big, easy links (44px tall).
   (The addresses come from site.ts.) */

export function ContactTile({ title, email, linkedin, cv }: { title: string; email: string; linkedin: string; cv: string }) {
  const link = (href: string, text: string, arrow: string, props: React.AnchorHTMLAttributes<HTMLAnchorElement> = {}, down = false) => (
    <a className="contact-link t-body" href={href} {...props}>
      <span>{text}</span>
      <span className={`contact-arrow ${down ? "contact-arrow-down" : ""}`} aria-hidden="true">
        {arrow}
      </span>
    </a>
  );
  return (
    <section className="tile tone-sun">
      <div className="tile-grid">
        <span aria-hidden="true" />
        {/* the plane fills the space above the words, centred in it */}
        <div className="tile-stage pointer-events-none">
          <div className="contact-plane absolute inset-x-0 -inset-y-6">
            <Bloom make={plane} dots={6000} marginY={0} leanPitch={0.12} label="A paper plane made of tiny blue dots, rocking gently" />
          </div>
        </div>
        <div className="tile-foot pointer-events-auto">
          <p className="t-title mb-3">{title}</p>
          {link(`mailto:${email}`, "Email", "→")}
          {link(linkedin, "LinkedIn", "↗", { target: "_blank", rel: "noreferrer" })}
          {link(cv, "CV", "↓", { download: true }, true)}
        </div>
      </div>
    </section>
  );
}
