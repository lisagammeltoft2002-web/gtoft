"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { CaseCopy } from "@/content/site";
import { CaseFrame, useFilm } from "./Film";

/* velory.com, before and after. A new browser tab, its search field empty. The cursor clicks
   it, types velory.com and presses enter; the OLD site loads, then a line sweeps in from the
   right to wherever your arrow is and from then on follows it, pixel by pixel. Left of the
   line is the old velory.com, right of it the new one: arrow fully right = all old, fully
   left = all new. On the case page hero, the line drifts by itself until you point at it. */

const FIELD = [300, 156]; // the new tab's search field, in the world
const SHAPES = ["short", "wide", "tall"] as const;
/* which capture fits a window of this shape (width / height): the captures are 2.57, 2.03 and
   1.33, and each takes the shapes nearest to it */
const shapeOf = (aspect: number) => (aspect >= 2.29 ? "short" : aspect < 1.64 ? "tall" : "wide");

type Split = {
  /** where the arrow is, 0–100 across the site */
  target: number;
  /** the line follows the arrow (after the sweep) */
  follow: boolean;
  /** an arrow is over the tile */
  over: boolean;
  move: (to: number) => void;
  idle: () => void;
};

export function VeloryComCase({ copy, hero = false }: { copy: CaseCopy; hero?: boolean }) {
  const split = useRef<Split>({ target: 50, follow: false, over: false, move: () => {}, idle: () => {} });

  const { ref, handlers } = useFilm((k) => {
    const { tl, q } = k;
    const st = split.current;
    const site = q("[data-site]")[0] as HTMLElement;
    const before = q("[data-before]")[0] as HTMLElement;
    const after = q("[data-after]")[0] as HTMLElement;
    // the wide or the tall recording, whichever matches the window's shape (see the effect below)
    const films = q("[data-new]") as HTMLVideoElement[];
    const film = () => films.find((v) => v.offsetParent !== null) ?? films[0];
    const line = { s: 100 };
    const draw = () => {
      site.style.setProperty("--split", `${line.s}%`);
      before.style.opacity = String(Math.min(1, line.s / 18));
      after.style.opacity = String(Math.min(1, (100 - line.s) / 18));
    };
    const glide = gsap.quickTo(line, "s", { duration: 0.18, ease: "power3.out", onUpdate: draw });
    let sweep: gsap.core.Tween | null = null;
    let drift: gsap.core.Timeline | null = null;
    const still = () => {
      sweep?.kill();
      drift?.kill();
      glide.tween.kill();
    };
    // the hero, with nobody pointing: the line wanders slowly between the two sites
    const wander = () => {
      drift?.kill();
      drift = gsap
        .timeline({ repeat: -1, defaults: { ease: "sine.inOut", onUpdate: draw } })
        .to(line, { s: 70, duration: 2.6 })
        .to(line, { s: 30, duration: 4 })
        .to(line, { s: 50, duration: 2 });
    };
    const live = (on: boolean) => {
      st.follow = on;
      site.classList.toggle("is-live", on);
    };
    st.move = (to) => {
      st.target = to;
      if (!st.follow) return;
      drift?.kill();
      glide(to);
    };
    st.idle = () => {
      if (hero && st.follow) wander();
    };
    draw();

    // one camera for the whole film: the browser, filling the screen, its bar at the top
    k.start(300, 0, 1);
    k.cursorStart(420, 250);

    // 1. lean in on the search field, click it and type
    k.cam(FIELD[0], FIELD[1] - 10, 1.7, 0.2, 1.0);
    k.cursor(FIELD[0] - 40, FIELD[1] + 4, 0.3, 0.8);
    k.click("[data-field]", 1.15);
    tl.to(q("[data-field]"), { boxShadow: "0 0 0 1.5px var(--f-accent), 0 8px 20px -12px rgb(20 40 90 / 0.3)", duration: 0.2 }, 1.2);
    k.hide("[data-url-ph]", 1.2, 0.1);
    tl.fromTo(q("[data-caret]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 1.2);
    k.type("[data-url]", "velory.com", 1.35, 0.7);

    // 2. enter: the old site loads
    k.hide("[data-caret]", 2.2, 0.01);
    tl.to(q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 2.25);
    tl.fromTo(q("[data-load]"), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 2.2).to(q("[data-load]"), { autoAlpha: 0, duration: 0.2 }, 2.8);
    k.show("[data-addr]", 2.3, { y: 0, duration: 0.3 });
    k.cam(300, 0, 1, 2.1, 1.0);
    k.hide("[data-newtab]", 2.3, 0.25);
    k.show("[data-site]", 2.5, { duration: 0.6 });
    tl.call(() => void film().play().catch(() => {}), undefined, 2.4);

    // 3. the line sweeps in from the right to the arrow, then follows it
    tl.call(
      () => {
        still();
        const to = hero && !st.over ? 50 : st.target;
        sweep = gsap.to(line, {
          s: to,
          duration: 0.9,
          ease: "power3.out",
          onUpdate: draw,
          onComplete: () => {
            live(true);
            if (st.over) glide(st.target);
            else st.idle();
          },
        });
      },
      undefined,
      3.0,
    );
    k.done(3.9);
    tl.set({}, {}, hero ? 12 : 4.6);

    // back to the first frame: the old site whole, the line waiting at the right edge
    return () => {
      still();
      live(false);
      for (const v of films) {
        v.pause();
        v.currentTime = 0;
      }
      line.s = 100;
      draw();
    };
  }, { auto: hero, stretch: true });

  /* your arrow, measured against the site as it is drawn (the camera's zoom included) */
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const st = split.current;
    const site = root.querySelector<HTMLElement>("[data-site]");
    const ro = new ResizeObserver(() => {
      if (!site) return;
      // the site's own size, in world units (the window's shape, before the camera's zoom)
      const shape = shapeOf(site.offsetWidth / Math.max(1, site.offsetHeight));
      const before = site.dataset.shape ?? "wide";
      if (shape === before) return;
      const was = site.querySelector<HTMLVideoElement>(`.f-split-${before} video`);
      site.dataset.shape = shape;
      if (was && !was.paused) {
        was.pause();
        void site.querySelector<HTMLVideoElement>(`.f-split-${shape} video`)?.play().catch(() => {});
      }
    });
    if (site) ro.observe(site);
    const move = (e: PointerEvent) => {
      if (!site || (e.pointerType !== "mouse" && e.buttons === 0)) return;
      const r = site.getBoundingClientRect();
      if (!r.width) return;
      st.over = true;
      st.move(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      st.over = false;
      st.idle();
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);
    return () => {
      ro.disconnect();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
    };
  }, [ref]);

  return (
    <CaseFrame slug="velory-com" copy={copy} hero={hero} frameRef={ref} handlers={handlers}>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: "var(--win-h, 312px)" }}>
          {/* browser bar, full width at the top */}
          <div className="f-abs z-10 flex items-center gap-3 border-b border-[var(--f-line)] bg-[var(--f-soft)] px-3" style={{ left: 0, top: 0, width: 560, height: 36 }}>
            <span className="flex gap-1.5">
              {["#f0b4ad", "#f3d79a", "#b8dcb0"].map((c) => (
                <span key={c} className="block h-[10px] w-[10px] rounded-full" style={{ background: c }} />
              ))}
            </span>
            <svg width="52" height="13" viewBox="0 0 40 10" aria-hidden="true" fill="none" stroke="var(--f-faint)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 1.5 1.5 5 5 8.5M20 1.5 23.5 5 20 8.5" />
              <path d="M38 5a3.6 3.6 0 1 1-1.1-2.6M38 1v2.4h-2.4" />
            </svg>
            <span className="flex flex-1 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] shadow-[0_0_0_1px_var(--f-line)]" style={{ height: 24 }}>
              <svg width="7" height="8" viewBox="0 0 7 8" aria-hidden="true">
                <rect x="0.5" y="3.3" width="6" height="4.2" rx="1" fill="var(--f-faint)" />
                <path d="M1.8 3.4V2.4a1.7 1.7 0 0 1 3.4 0v1" fill="none" stroke="var(--f-faint)" strokeWidth="0.9" />
              </svg>
              <span data-addr="" className="f-hidden">velory.com</span>
            </span>
            <span className="block h-[20px] w-[20px] rounded-full bg-[var(--f-accent-wash)]" />
            {/* the page loading */}
            <span data-load="" className="absolute bottom-[-1px] left-0 h-[1.5px] w-full origin-left bg-[var(--f-accent)] opacity-0" />
          </div>

          {/* a new tab: one search field */}
          <div data-newtab="" className="f-abs grid justify-items-center content-start" style={{ left: 0, top: 36, width: 560, height: "calc(var(--win-h, 312px) - 36px)", paddingTop: 103 }}>
            <span data-field="" className="flex items-center gap-2 rounded-full bg-white px-4 text-[11px] shadow-[0_0_0_1px_var(--f-line),0_8px_20px_-14px_rgb(20_40_90/0.25)]" style={{ width: 300, height: 34 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="var(--f-grey)" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="5.2" cy="5.2" r="3.8" />
                <path d="M8 8l2.8 2.8" />
              </svg>
              <span className="relative flex-1">
                <span data-url-ph="" className="f-faint absolute left-0 whitespace-nowrap">
                  Search or type a URL
                </span>
                <span data-url="" />
                <span data-caret="" className="f-caret f-hidden" />
              </span>
            </span>
          </div>

          {/* the site: the old velory.com and the new one on top of each other, split by a
              line that follows your arrow. Left of the line is the old site, right is the new. */}
          <div data-site="" className="f-abs f-hidden f-split overflow-hidden" style={{ left: 0, top: 36, width: 560, height: "calc(var(--win-h, 312px) - 36px)" }}>
            {/* each site captured at three window shapes (1440×560, ×710 and ×1080), like the real
                page on a short, a wide and a tall screen; the window shows the one closest to its shape */}
            {SHAPES.map((v) => {
              const end = v === "wide" ? "" : `-${v}`;
              return (
                <div key={v} className={`f-split-${v}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/work/velory-com/split-old${end}.webp`} alt="The old velory.com" className="f-split-img" draggable={false} />
                  {/* the new site plays, its hero film running, like the real page */}
                  <video data-new="" className="f-split-img f-split-new" poster={`/images/work/velory-com/split-new${end}.webp`} muted loop playsInline preload="metadata" aria-label="The new velory.com">
                    <source src={`/images/work/velory-com/split-new${end}.webm`} type="video/webm" />
                    <source src={`/images/work/velory-com/split-new${end}.mp4`} type="video/mp4" />
                  </video>
                </div>
              );
            })}
            <span data-before="" className="f-split-pill" style={{ left: 10 }}>
              Before
            </span>
            <span data-after="" className="f-split-pill" style={{ right: 10 }}>
              After
            </span>
            <span className="f-split-line" aria-hidden="true">
              <span className="f-split-knob">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 1 .8 4l2.7 3M8.5 1 11.2 4 8.5 7" />
                </svg>
              </span>
            </span>
          </div>
        </div>
    </CaseFrame>
  );
}
