"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useJourney } from "@/lib/journey";
import {
  about,
  bring,
  caseStudies,
  contact,
  intro,
  introMore,
  journey,
  pad,
  process as ideas,
  site,
} from "@/content/site";
import { EDGE_X } from "@/components/ui";
import { Morph } from "@/components/ui/Morph";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.075, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}

/* ==================================================================
   One letter that follows the whole journey. The sections below are only
   scroll distance; this fixed layer keeps its places on the page:
     label     — the chapter name (dissolves into the next)
     main line — the one sentence that re-types itself chapter to chapter
     below it  — either one action, or a list of containers that open one
                 at a time with a soft spring (projects, questions, skills)
   ================================================================== */

type Chapter = "open" | "hero" | "work" | "map" | "bring" | "valley";

const LINES: Record<Chapter, { label: string; line: string }> = {
  open: { label: site.role, line: site.name },
  hero: { label: "Introduction", line: intro },
  work: { label: "Selected work", line: "Work that shipped." },
  map: { label: "How I work", line: "I think in journeys." },
  bring: { label: "What I bring", line: "Design, build and ship." },
  valley: { label: "About & contact", line: about.hello },
};

const fade = "transition-opacity duration-500 ease-[var(--ease-paper)]";
// off-stage items keep their place in the grid only while shown, so the card hugs its content
const shown = (on: boolean) =>
  `${fade} [grid-area:1/1] ${on ? "opacity-100" : "pointer-events-none invisible absolute inset-x-0 top-0 opacity-0"}`;

/* containers open one at a time: measured, then sprung to their new size */
function useSpringBoxes(active: number) {
  const boxes = useRef<(HTMLLIElement | null)[]>([]);
  const first = useRef(true);
  const natural = (el: HTMLElement) => {
    const w = el.style.width;
    const h = el.style.height;
    el.style.width = "auto";
    el.style.height = "auto";
    const r = el.getBoundingClientRect();
    el.style.width = w;
    el.style.height = h;
    return r;
  };
  useLayoutEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    boxes.current.forEach((el) => {
      if (!el) return;
      const from = el.getBoundingClientRect();
      const to = natural(el);
      if (first.current || reduce)
        return void gsap.set(el, { width: to.width, height: to.height });
      if (
        Math.abs(from.width - to.width) < 0.5 &&
        Math.abs(from.height - to.height) < 0.5
      )
        return;
      gsap.fromTo(
        el,
        { width: from.width, height: from.height },
        {
          width: to.width,
          height: to.height,
          duration: 0.42,
          ease: "back.out(1.05)",
          overwrite: true,
        },
      );
    });
    first.current = false;
  }, [active]);
  useEffect(() => {
    const fit = () =>
      boxes.current.forEach(
        (el) =>
          el &&
          gsap.set(el, {
            width: natural(el).width,
            height: natural(el).height,
          }),
      );
    document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return boxes;
}

type Item = {
  key: string;
  label: string;
  title?: string;
  body: string;
  cta?: { label: string; href: string };
};

function Containers({
  items,
  active,
  on,
}: {
  items: Item[];
  active: number;
  on: boolean;
}) {
  const boxes = useSpringBoxes(active);
  return (
    <ol className={`flex flex-col items-start gap-1.5 ${shown(on)}`}>
      {items.map((it, i) => {
        const open = i === active;
        return (
          <li
            key={it.key}
            ref={(el) => void (boxes.current[i] = el)}
            aria-current={open ? "true" : undefined}
            className="tab overflow-hidden"
          >
            <div
              className={
                open
                  ? "w-[min(22rem,calc(100vw-2*var(--edge)-5rem))] p-5"
                  : "w-max"
              }
            >
              <p
                className={`t-meta flex items-center gap-3 whitespace-nowrap ${open ? "text-ink-soft" : "px-4 py-2.5 text-ink"}`}
              >
                <span className="tabular-nums text-ink-soft">{pad(i + 1)}</span>
                {it.label}
              </p>
              {open && (
                <div className="swap">
                  {it.title && (
                    <p className="t-meta mt-2 text-ink-soft">{it.title}</p>
                  )}
                  <p className="t-body mt-2 text-ink-soft">{it.body}</p>
                  {it.cta && (
                    <a
                      href={it.cta.href}
                      className="btn mt-4"
                      tabIndex={on ? 0 : -1}
                    >
                      {it.cta.label}
                      <span aria-hidden="true">→</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const WORK: Item[] = caseStudies.map((c) => ({
  key: c.slug,
  label: c.title,
  title: c.kind,
  body: c.outcome,
  cta: { label: "View case study", href: `/work/${c.slug}` },
}));
const BRING: Item[] = bring.map((b) => ({
  key: b.label,
  label: b.label,
  body: b.line,
}));

export function Letter() {
  const raw = useJourney((s) => s.section) as Chapter;
  const ch: Chapter = raw in LINES ? raw : "open";
  const wi = useJourney((s) => s.workIndex);
  const bi = useJourney((s) => s.bringIndex);
  const card = ch !== "open" && ch !== "map";

  return (
    <div className="pointer-events-none fixed inset-0 z-30 text-ink">
      {/* the opening: the name set in the sky, like the title of a travel print */}
      <div
        className={`absolute inset-x-[var(--edge)] top-[calc(var(--frame-t)+clamp(2rem,7vh,5rem))] text-center transition-[opacity,filter] duration-1000 ease-[var(--ease-paper)] ${
          ch === "open" ? "opacity-100" : "opacity-0 blur-[6px]"
        }`}
      >
        <p className="t-title text-ink/80">{site.role}</p>
        <p className="mt-4 font-display text-[clamp(2.75rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-ink">
          {site.name}
        </p>
      </div>

      {/* the letter: one paper card that carries every chapter's words */}
      <div
        className={`pointer-events-auto absolute left-[calc(var(--edge)+1rem)] top-[calc(var(--frame-t)+1rem)] w-[min(26rem,calc(100vw-2*var(--edge)-2rem))] rounded-[1.1rem] border border-white/50 bg-paper/[0.86] p-6 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_30px_80px_-40px_rgb(20_24_40/0.6)] backdrop-blur-xl backdrop-saturate-150 transition-[opacity,transform] duration-700 ease-[var(--ease-paper)] max-md:bottom-[calc(var(--frame-b)+1rem)] max-md:top-auto ${
          card ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <p key={ch} className="swap t-title text-ink-soft">
          {LINES[ch].label}
        </p>
        <h2 className="t-display-sm mt-3 text-balance !text-[1.75rem] !leading-[1.15]">
          <Morph text={LINES[ch].line} />
        </h2>
        <div className="relative mt-5 grid">
          <div className={shown(ch === "hero")}>
            <p className="t-body text-ink-soft">{introMore}</p>
            <p className="t-meta mt-4 flex items-center gap-2 text-ink">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#4f8a3c]"
              />
              {site.status}
            </p>
            <a
              href="#work"
              className="btn mt-5"
              tabIndex={ch === "hero" ? 0 : -1}
            >
              See the work <span aria-hidden="true">→</span>
            </a>
          </div>
          <Containers items={WORK} active={wi} on={ch === "work"} />
          <Containers items={BRING} active={bi} on={ch === "bring"} />
          <div className={shown(ch === "valley")}>
            <p className="t-body text-ink-soft">{about.body}</p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {about.makes.map((m) => (
                <li
                  key={m.src}
                  className="aspect-square overflow-hidden rounded-md bg-ink/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.src}
                    alt={m.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
            <p className="t-meta mt-5 border-t border-line pt-4 text-ink">
              {contact.note}
            </p>
            <div className="mt-5 flex items-center gap-5">
              <a
                href={`mailto:${site.email}`}
                className="btn"
                tabIndex={ch === "valley" ? 0 : -1}
              >
                Email me <span aria-hidden="true">→</span>
              </a>
              <span className="t-meta flex gap-4">
                <a
                  className="textlink"
                  href={site.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={ch === "valley" ? 0 : -1}
                >
                  LinkedIn
                </a>
                <a
                  className="textlink"
                  href={site.cv}
                  download
                  tabIndex={ch === "valley" ? 0 : -1}
                >
                  CV
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      <SkyWriting on={ch === "map"} />

      {/* the bottom line of the letter, on the paper below the print */}
      <div
        className={`t-meta absolute bottom-[calc(var(--edge)*0.45)] ${EDGE_X} grid text-ink-soft`}
      >
        <div className={`flex justify-between ${shown(ch === "open")}`}>
          <span>(Scroll to continue)</span>
          <span>
            {site.city} · {site.year}
          </span>
        </div>
        <div className={`flex justify-between ${shown(ch === "valley")}`}>
          <span>
            © {site.year} {site.name}
          </span>
          <a
            href="#top"
            className="textlink pointer-events-auto"
            tabIndex={ch === "valley" ? 0 : -1}
          >
            Back to start
          </a>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The journey, written in the sky. One CSS number (--sky, 0..1, set by */
/* the scene from scroll) drives every letter: no re-renders.            */
/* ------------------------------------------------------------------ */
const STANZAS = [
  { label: "How I work", text: journey.opening },
  ...ideas.map((q, i) => ({
    label: `${pad(i + 1)}  ${q.label}`,
    text: journey.lines[i],
  })),
];

function SkyWriting({ on }: { on: boolean }) {
  const n = STANZAS.length;
  return (
    <div
      aria-live="polite"
      className={`absolute inset-x-[calc(var(--edge)+1.5rem)] top-[calc(var(--frame-t)+clamp(2.5rem,12vh,8rem))] grid justify-items-center text-center text-paper transition-opacity duration-700 ${
        on ? "opacity-100" : "opacity-0"
      }`}
    >
      {STANZAS.map((st, k) => {
        const a = k / n; // this stanza's share of the flight
        const span = 1 / n;
        const writeEnd = a + span * 0.62;
        const out = k === n - 1 ? 9 : a + span * 0.97;
        const chars = [...st.text];
        let idx = 0;
        return (
          <div
            key={k}
            className="[grid-area:1/1] max-w-[46rem]"
            style={
              {
                opacity: `clamp(0, calc((${out} - var(--sky, 0)) * 40), 1)`,
              } as React.CSSProperties
            }
          >
            <p
              className="t-meta mb-5 text-paper/85"
              style={
                {
                  opacity: `clamp(0, calc((var(--sky, 0) - ${a + 0.004}) * 60), 1)`,
                } as React.CSSProperties
              }
            >
              {st.label}
            </p>
            <p className="sky-text font-display text-[clamp(1.7rem,3.3vw,3.1rem)] italic leading-[1.18]">
              <span className="sr-only">{st.text}</span>
              <span aria-hidden="true">
                {st.text.split(" ").map((word, wI) => (
                  <span key={wI} className="inline-block whitespace-nowrap">
                    {[...word].map((c) => {
                      const s =
                        a + 0.012 + (idx++ / chars.length) * (writeEnd - a);
                      return (
                        <span
                          key={idx}
                          className="sky-ch"
                          style={{ "--s": s.toFixed(4) } as React.CSSProperties}
                        >
                          {c}
                        </span>
                      );
                    })}
                    {wI < st.text.split(" ").length - 1 && (idx++, "\u00a0")}
                  </span>
                ))}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll distance for each chapter (anchors for the menu and links)    */
/* ------------------------------------------------------------------ */
export function Chapters() {
  return (
    <>
      <section id="top" aria-label="Introduction" className="h-[240vh]" />
      <section id="work" aria-label="Selected work" className="h-[300vh]" />
      <section id="process" aria-label="How I work" className="h-[400vh]" />
      <section id="bring" aria-label="What I bring" className="h-[260vh]" />
      <footer id="contact" aria-label="About and contact" className="h-dvh" />
    </>
  );
}
