/* The way to reach Lisa: the only yellow on the page, so the eye ends here. One warm line,
   then email, LinkedIn and the CV as big, easy links (44px tall). A small paper plane
   drifts and takes off when you point at a link. (The addresses come from site.ts.) */
export function ContactTile({ title, email, linkedin, cv, note }: { title: string; email: string; linkedin: string; cv: string; note: string }) {
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
        <p className="tile-label t-label">Contact</p>
        <div className="tile-stage overflow-hidden">
          <svg viewBox="0 0 60 40" className="contact-plane mt-2 w-14" aria-hidden="true">
            <path d="M2 22 L56 4 L36 36 L28 25 Z M28 25 L56 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M2 30 q10 6 20 0" fill="none" stroke="currentColor" strokeWidth="0.9" strokeDasharray="1.5 2.5" />
          </svg>
        </div>
        <div className="tile-foot pointer-events-auto">
          <p className="t-title mb-3">{title}</p>
          {link(`mailto:${email}`, "Email", "→")}
          {link(linkedin, "LinkedIn", "↗", { target: "_blank", rel: "noreferrer" })}
          {link(cv, "CV", "↓", { download: true }, true)}
          <p className="t-label mt-3 opacity-85">{note}</p>
        </div>
      </div>
    </section>
  );
}
