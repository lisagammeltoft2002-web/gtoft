import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Arrow } from "@/components/cases/Film";
import { Journey } from "./Journey";
import { BackHome } from "./BackHome";
import { VeloryComCase } from "@/components/cases/VeloryComCase";
import { StudioCase } from "@/components/cases/StudioCase";
import { InsightsCase } from "@/components/cases/InsightsCase";
import { board, caseStudies } from "@/content/site";

/* A case study's own page: the home page tile, opened. Going in, the blue tile grows until it
   fills the window, its video, name and number staying where they were; the whole page is
   that blue. Under it, one calm column of containers in the home page's other colours
   (paper, leaf green, the deep work blue, sunflower yellow): what it is, the facts, the
   problem, the insight, the decisions, the numbers, what I learned, and the next case. */

const ORDER = ["velory-com", "velory-studio", "actionable-insights"];
const HERO = { "velory-com": VeloryComCase, "velory-studio": StudioCase, "actionable-insights": InsightsCase } as const;

export function caseMetadata(slug: string) {
  const c = caseStudies.find((x) => x.slug === slug);
  return { title: c ? `${c.title} · Lisa Gammeltoft` : "Lisa Gammeltoft", description: c?.outcome };
}

/* each case has its own small, fully static page file under app/work/ that renders this */
export function CasePage({ slug }: { slug: string }) {
  const c = caseStudies.find((x) => x.slug === slug);
  if (!c || !(slug in HERO)) notFound();
  const Hero = HERO[slug as keyof typeof HERO];
  const next = caseStudies.find((x) => x.slug === ORDER[(ORDER.indexOf(slug) + 1) % ORDER.length])!;

  return (
    <main className="case-page">
      <nav className="case-top">
        <BackHome slug={slug} />
      </nav>
      <span className="t-label case-kind">{c.kind}</span>

      <Hero copy={board.cases[slug]} hero />

      <ViewTransition enter="case-rise" default="none">
        <div className="case-body" id="story">
          <header className="case-head">
            <p className="case-lead">{c.outcome}</p>
          </header>

          <dl className="case-card tone-paper case-facts">
            {c.meta.map((m) => (
              <div key={m.label}>
                <dt className="t-label">{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>

          <section className="case-section">
            <div className="case-split">
              <div className="case-card tone-paper case-text">
                <p className="case-eyebrow">The problem</p>
                {c.problem.map((p, i) => (
                  <p key={i} className="case-p">
                    {p}
                  </p>
                ))}
              </div>
              <Media image={c.problemImage} hint="Before: the old version" />
            </div>
          </section>

          <figure className="case-card case-quote">
            <blockquote>“{c.insight.quote.replace(/^“|”$/g, "")}”</blockquote>
            <figcaption className="t-label">{c.insight.note}</figcaption>
          </figure>

          {c.journey.length > 0 && (
            <section className="case-section">
              <SectionHead eyebrow="The journey" title="How it came together" />
              <Journey steps={c.journey} />
            </section>
          )}

          <section className="case-section">
            <SectionHead eyebrow="Key decisions" title="What I chose, and why" />
            <div className="case-stack">
              {c.decisions.map((d, i) => (
                <div key={d.title} className={`case-split ${i % 2 ? "case-split-flip" : ""}`}>
                  <div className="case-card tone-paper case-text">
                    <span className="case-num">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="case-h3">{d.title}</h3>
                    <p className="case-p">{d.body}</p>
                  </div>
                  <Media image={d.image} hint={d.title} />
                </div>
              ))}
            </div>
          </section>

          <section className="case-section">
            <SectionHead eyebrow="Results" title="What it changed" />
            <div className="case-results">
              {c.results.map((r) => (
                <div key={r.label} className="case-card case-result">
                  <span className="case-figure">{r.value}</span>
                  <span className="t-label">{r.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="case-section">
            <div className="case-card tone-paper case-text case-learned">
              <p className="case-eyebrow">What I learned</p>
              {c.reflection.map((p, i) => (
                <p key={i} className="case-p case-p-big">
                  {p}
                </p>
              ))}
            </div>
          </section>

          <Link href={`/work/${next.slug}`} transitionTypes={["nav-forward"]} className="case-card tone-sun case-next">
            <span>
              <span className="t-label">Next case</span>
              <span className="case-next-title">{next.title}</span>
            </span>
            <span className="case-cta case-cta-dark" aria-hidden="true">
              <Arrow />
            </span>
          </Link>
        </div>
      </ViewTransition>
    </main>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="case-section-head">
      <p className="case-eyebrow">{eyebrow}</p>
      <h2 className="case-h2">{title}</h2>
    </header>
  );
}

/* a screenshot in a home-page container; until Lisa adds one, a calm placeholder that says
   what belongs there */
function Media({ image, hint }: { image?: { src: string; alt: string }; hint: string }) {
  if (image)
    return (
      <div className="case-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} />
      </div>
    );
  return (
    <div className="case-media case-media-empty" aria-hidden="true">
      <span className="case-media-frame">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
        <span className="t-label">Image · {hint}</span>
      </span>
    </div>
  );
}
