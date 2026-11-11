"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import { useJourney } from "@/lib/journey";
import { caseStudies, site, pad } from "@/content/site";

/* The journey rail: the site's only progress UI. Four stops, one per home section. */
const stops = [
  { id: "hero", href: "/#top", label: "Introduction" },
  { id: "work", href: "/#work", label: "Selected work" },
  { id: "map", href: "/#process", label: "How I work" },
  { id: "bring", href: "/#bring", label: "What I bring" },
  { id: "valley", href: "/#contact", label: "About & contact" },
];
const elsewhere = [
  { href: site.linkedin, label: "LinkedIn" },
  { href: site.github, label: "GitHub" },
  { href: `mailto:${site.email}`, label: "Email" },
];

function Rail() {
  const section = useJourney((s) => s.section);
  const cur = Math.max(
    0,
    stops.findIndex((s) => s.id === (section === "open" ? "hero" : section)),
  );
  return (
    <nav
      aria-label="Journey"
      className="pointer-events-auto hidden items-center md:flex"
    >
      {stops.map((s, i) => (
        <div key={s.id} className="flex items-center">
          {i > 0 && (
            <span
              aria-hidden="true"
              className="relative mx-2 h-px w-10 bg-line-strong"
            >
              <span
                className="absolute inset-0 origin-left bg-ink transition-transform duration-700 ease-[var(--ease-paper)]"
                style={{ transform: `scaleX(${i <= cur ? 1 : 0})` }}
              />
            </span>
          )}
          <Link
            href={s.href}
            aria-current={i === cur ? "step" : undefined}
            className="group flex items-center gap-2 py-2"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full border border-ink transition-colors duration-500 ${i <= cur ? "bg-ink" : "bg-paper"}`}
            />
            <span
              className={`t-meta transition-colors duration-500 ${i === cur ? "text-ink" : "text-ink-soft/70 group-hover:text-ink"}`}
            >
              {pad(i + 1)}
            </span>
            <span
              className={`t-meta overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-500 ${i === cur ? "max-w-40 opacity-100" : "max-w-0 opacity-0"}`}
            >
              {s.label}
            </span>
          </Link>
        </div>
      ))}
    </nav>
  );
}

export function Menu() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const home = usePathname() === "/";

  useGSAP(
    () => {
      const reduce = !window.matchMedia(MOTION_OK).matches;
      const d = reduce ? 0 : 1;
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: "power3.inOut" } })
        .set(panel.current, { autoAlpha: 1 })
        .fromTo(
          panel.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4 * d },
        )
        .fromTo(
          "[data-menu-line]",
          { y: 8 * d, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5 * d,
            stagger: 0.03 * d,
            ease: "power3.out",
          },
          0.1 * d,
        );
    },
    { scope: panel },
  );

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const content = document.getElementById("content");
    if (open) {
      tl.current?.timeScale(1).play();
      document.documentElement.style.overflow = "hidden";
      content?.setAttribute("inert", "");
      panel.current
        ?.querySelector<HTMLElement>("a")
        ?.focus({ preventScroll: true });
    } else {
      tl.current?.timeScale(1.6).reverse();
      document.documentElement.style.overflow = "";
      content?.removeAttribute("inert");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-[var(--edge)] top-[calc(var(--edge)*0.6)] z-[60] flex items-center justify-between">
        <Link
          href="/"
          onClick={close}
          className="t-meta pointer-events-auto py-2 text-ink"
        >
          {site.name}
        </Link>
        {home && <Rail />}
        <div className="pointer-events-auto flex items-center gap-5">
          <a
            href={`mailto:${site.email}`}
            className="t-meta textlink hidden py-2 text-ink sm:inline"
          >
            Email
          </a>
          <a
            href={site.cv}
            download
            className="t-meta textlink hidden py-2 text-ink sm:inline"
          >
            CV
          </a>
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
            className="t-meta pointer-events-auto py-2 text-ink"
          >
            {open ? "(Close)" : "(Menu)"}
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="invisible fixed inset-0 z-50 overflow-y-auto bg-paper text-ink"
      >
        <div className="grid min-h-full grid-cols-1 gap-12 px-[var(--edge)] pb-[var(--edge)] pt-[calc(var(--edge)+3.25rem)] md:grid-cols-12">
          <nav aria-label="Primary" className="md:col-span-6">
            <p className="t-meta border-b border-line-strong pb-2.5 text-ink-soft">
              Index
            </p>
            <ol>
              {stops.map((l, i) => (
                <li key={l.href} className="border-b border-line">
                  <Link
                    href={l.href}
                    onClick={close}
                    data-menu-line
                    className="flex items-baseline gap-6 py-3"
                  >
                    <span className="t-meta w-6 text-ink-soft">
                      {pad(i + 1)}
                    </span>
                    <span className="t-display-sm">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-10 md:col-span-5 md:col-start-8">
            <div>
              <p className="t-meta border-b border-line-strong pb-2.5 text-ink-soft">
                Case studies
              </p>
              <ol>
                {caseStudies.map((c, i) => (
                  <li key={c.slug} className="border-b border-line">
                    <Link
                      href={`/work/${c.slug}`}
                      onClick={close}
                      data-menu-line
                      className="flex items-baseline gap-6 py-2.5"
                    >
                      <span className="t-meta w-6 text-ink-soft">
                        {pad(i + 1)}
                      </span>
                      <span className="t-body">{c.title}</span>
                      <span className="t-meta ml-auto text-ink-soft">
                        {c.year}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="t-meta border-b border-line-strong pb-2.5 text-ink-soft">
                Elsewhere
              </p>
              <ol>
                {elsewhere.map((l) => (
                  <li key={l.label} className="border-b border-line">
                    <a
                      href={l.href}
                      data-menu-line
                      className="t-body flex items-baseline py-2.5"
                      {...(l.href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                    >
                      {l.label}
                      <span
                        aria-hidden="true"
                        className="ml-auto text-ink-soft"
                      >
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
            <p className="t-meta mt-auto text-ink-soft">
              {site.city} · {site.coords.lat} · {site.coords.lng}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
