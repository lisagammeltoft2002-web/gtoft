import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { Arrow } from "@/components/cases/Film";
import { Journey } from "./Journey";
import { HoverVideo } from "./HoverVideo";
import { InViewVideo } from "./InViewVideo";
import { ThemePair } from "./ThemePair";
import { VeloryComCase } from "@/components/cases/VeloryComCase";
import { StudioCase } from "@/components/cases/StudioCase";
import { InsightsCase } from "@/components/cases/InsightsCase";
import { board, caseStudies, site, type CaseMedia, type ImageSystem } from "@/content/site";

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
                {c.problemTitle && <h2 className="case-h3">{c.problemTitle}</h2>}
                {c.problem.map((p, i) => (
                  <p key={i} className="case-p">
                    {p}
                  </p>
                ))}
              </div>
              <Media image={c.problemImage} hint="Before: the old version" />
            </div>
            {c.problemStrip && (
              <ul className="case-pains" aria-label="The five pains the new page opens with">
                {c.problemStrip.map((p) => (
                  <li key={p.src} className="case-pain">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt="" loading="lazy" />
                    <span>“{p.quote.replace(/\.$/, "")}”</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <figure className="case-card case-quote">
            <blockquote>“{c.insight.quote.replace(/^“|”$/g, "")}”</blockquote>
            <figcaption className="t-label">{c.insight.note}</figcaption>
          </figure>

          {c.salesMap && (
            <section className="case-section">
              <SectionHead eyebrow="From sales call to page" title={c.salesMap.title} />
              <ol className="case-map">
                {c.salesMap.steps.map((st, i) => (
                  <li key={st.call} className="case-card tone-paper case-map-step">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={st.image.src} alt={st.image.alt} width={960} height={600} loading="lazy" />
                    <span className="case-num">{String(i + 1).padStart(2, "0")}</span>
                    <p className="case-map-call">{st.call}</p>
                    <p className="case-map-page">{st.page}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

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
                    <h3 className="case-h3">{d.title}</h3>
                    <p className="case-p">{d.body}</p>
                  </div>
                  <Media image={d.image} hint={d.title} />
                </div>
              ))}
            </div>
          </section>

          {c.imageSystem && <ImageSystemSection s={c.imageSystem} />}

          {c.underHood && (
            <section className="case-section">
              <SectionHead eyebrow="Under the hood" title={c.underHood.title} />
              <p className="case-p case-p-big case-hood-lead">{c.underHood.lead}</p>
              <div className="case-results">
                {c.underHood.facts.map((f) => (
                  <div key={f.value} className="case-card tone-paper case-result case-result-paper">
                    <span className="case-figure">{f.value}</span>
                    <span className="t-label">{f.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="case-section">
            <SectionHead eyebrow="Results" title="What it changed" />
            <div className="case-results">
              {c.estimate && (
                <div className="case-card case-result case-estimate">
                  <span className="case-figure">{c.estimate.value}</span>
                  <span className="t-label">{c.estimate.label}</span>
                  <details className="case-sum">
                    <summary>How I counted</summary>
                    <ul>
                      {c.estimate.rows.map((r) => (
                        <li key={r.piece}>
                          <span>{r.piece}</span>
                          <span>{r.hours} h</span>
                        </li>
                      ))}
                    </ul>
                    <p>{c.estimate.note}</p>
                  </details>
                </div>
              )}
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

          {c.live && (
            <a href={c.live.url} target="_blank" rel="noopener noreferrer" className="case-card tone-paper case-next case-visit">
              <span>
                <span className="t-label">See it live</span>
                <span className="case-next-title">{c.live.label}</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
              <span className="case-cta case-visit-arrow" aria-hidden="true">
                <Arrow />
              </span>
            </a>
          )}

          <a href={`mailto:${site.email}`} className="case-card tone-leaf case-next case-talk">
            <span>
              <span className="t-label">Want to hear more about this one?</span>
              <span className="case-next-title">Let’s talk</span>
            </span>
            <span className="case-cta case-cta-dark" aria-hidden="true">
              <Arrow />
            </span>
          </a>

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

/* a section opens with its claim; the small label above it only repeated the heading, so it
   stays out of sight and is read only by screen readers */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="case-section-head">
      <h2 className="case-h2">
        <span className="sr-only">{eyebrow}: </span>
        {title}
      </h2>
    </header>
  );
}

/* How the velory.com images were made: what they are, how they're made, both themes, the
   close-ups, the films and the numbers. */
function ImageSystemSection({ s }: { s: ImageSystem }) {
  return (
    <section className="case-section" aria-labelledby="images-title">
      <header className="case-section-head">
        <p className="case-eyebrow">The images</p>
        <h2 className="case-h2" id="images-title">How the images are made</h2>
      </header>
      <div className="case-stack">
        <div className="case-split">
          <div className="case-card tone-paper case-text">
            <p className="case-p case-p-big">{s.lead}</p>
            <p className="case-p">{s.why}</p>
          </div>
          <ThemePair {...s.pair} />
        </div>

        <ol className="case-recipe">
          {s.steps.map((st, i) => (
            <li key={st.title} className="case-card tone-paper">
              <span className="case-num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{st.title}</h3>
              <p>{st.body}</p>
            </li>
          ))}
        </ol>

        <ul className="case-closeups" aria-label="Close-ups from the feature scroll">
          {s.closeUps.map((x) => (
            <li key={x.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.src} alt={`Product close-up: ${x.label}`} loading="lazy" />
              <span className="t-label">{x.label}</span>
            </li>
          ))}
        </ul>

        <div className="case-films">
          {s.films.map((f) => (
            <HoverVideo key={f.src} {...f} />
          ))}
        </div>

        <div className="case-results">
          {s.stats.map((r) => (
            <div key={r.label} className="case-card case-result">
              <span className="case-figure">{r.value}</span>
              <span className="t-label">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* a screenshot in a home-page container; until Lisa adds one, a calm placeholder that says
   what belongs there. Page screenshots ("shot") sit framed on light blue, product stills on white. */
function Media({ image, hint }: { image?: CaseMedia; hint: string }) {
  if (image?.kind === "video" && image.video)
    return (
      <figure className="case-media case-media-shot">
        <div className="case-shot-frame">
          <InViewVideo base={image.video} poster={image.src} label={image.alt} />
        </div>
        {image.caption && <figcaption className="t-label">{image.caption}</figcaption>}
      </figure>
    );
  if (image?.kind === "pair" && image.dark) return <ThemePair light={image.src} dark={image.dark} alt={image.alt} caption={image.caption ?? ""} />;
  if (image?.kind === "shot")
    return (
      <figure className="case-media case-media-shot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} loading="lazy" />
        {image.caption && <figcaption className="t-label">{image.caption}</figcaption>}
      </figure>
    );
  if (image)
    return (
      <div className={`case-media ${image.kind === "still" ? "case-media-still" : ""}`}>
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
