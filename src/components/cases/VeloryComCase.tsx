"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import type { CaseCopy } from "@/content/site";
import { CaseFrame, useFilm } from "./Film";

/* velory.com, before and after. A new browser tab, its search field empty. The cursor clicks
   it, types velory.com and presses enter; the OLD site loads, then a line sweeps in from the
   right to wherever your arrow is and from then on follows it, pixel by pixel. Left of the
   line is the old velory.com, right of it the new one: arrow fully right = all old, fully
   left = all new. On the case page hero, the line drifts by itself until you point at it. */

const FIELD = [300, 156]; // the new tab's search field, in the world
/* both sites captured at 1440 wide and each of these heights, the way the real pages lay out on
   screens from very wide (2.9) to fairly tall (1.3). The window plays the capture nearest its own
   shape, stretched the last few percent to fit, so the whole hero, every edge, shows like on the
   real page at that size. */
const HEIGHTS = [497, 533, 576, 618, 664, 720, 770, 828, 889, 960, 1029, 1108];
const FIRST = 720;
const heightFor = (aspect: number) =>
  HEIGHTS.reduce((a, b) => (Math.abs(Math.log(1440 / b / aspect)) < Math.abs(Math.log(1440 / a / aspect)) ? b : a));
const ASSETS = "/images/work/velory-com/split";

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
    // the new site's recording (its file follows the window's shape, see the effect below)
    const film = q("[data-new]")[0] as HTMLVideoElement;
    const clip = q("[data-clip]")[0] as HTMLElement;
    const bar = q("[data-line]")[0] as HTMLElement;
    const which = q("[data-which]")[0] as HTMLElement;
    const line = { s: 100 };
    /* only transforms move: the window onto the new site slides right by s%, the new site
       inside it slides back by the same, and the line rides on the edge. Nothing is clipped or
       repainted while you move, the layers just shift (the site is 560 wide in the world) */
    const draw = () => {
      clip.style.transform = `translate3d(${line.s}%,0,0)`;
      film.style.transform = `translate3d(${-line.s}%,0,0)`;
      bar.style.transform = `translate3d(${line.s * 5.6}px,0,0)`;
      // the switch in the browser bar lights the site you mostly see
      const side = line.s >= 50 ? "before" : "after";
      if (which.dataset.on !== side) which.dataset.on = side;
    };
    const glide = gsap.quickTo(line, "s", { duration: 0.07, ease: "power2.out", onUpdate: draw });
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
    k.show("[data-which]", 2.9, { duration: 0.4 });
    tl.call(() => void film.play().catch(() => {}), undefined, 2.4);

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
    tl.set({}, {}, 4.6);

    // back to the first frame: the old site whole, the line waiting at the right edge
    return () => {
      still();
      live(false);
      film.pause();
      film.currentTime = 0;
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
      const aspect = site.offsetWidth / Math.max(1, site.offsetHeight);
      // beyond the captures (an unusually tall or flat window) stretching would show: crop instead
      site.toggleAttribute("data-crop", Math.abs(Math.log(1440 / heightFor(aspect) / aspect)) > 0.05);
      const h = heightFor(aspect);
      if (String(h) === (site.dataset.h ?? String(FIRST))) return;
      site.dataset.h = String(h);
      const old = site.querySelector<HTMLImageElement>("[data-old]");
      const video = site.querySelector<HTMLVideoElement>("[data-new]");
      if (old) old.src = `${ASSETS}-old-${h}.webp`;
      if (!video) return;
      // keep the film where it was, so swapping shapes mid-play doesn't jump
      const at = video.currentTime;
      const playing = !video.paused;
      video.poster = `${ASSETS}-new-${h}.webp`;
      video.src = `${ASSETS}-new-${h}.mp4`;
      video.currentTime = at;
      if (playing) void video.play().catch(() => {});
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
        <div
          className="f-win"
          // the browser bar: 36 in the world on the tile; on the case page a steady ~40px on
          // screen, however big the screen (--s0 is the world's scale, set by the film)
          style={{ left: 20, top: 14, width: 560, height: "var(--win-h, 312px)", "--bar-k": hero ? "calc(40 / 36 / var(--s0, 1))" : "1", "--bar": "calc(36px * var(--bar-k))" } as CSSProperties}
        >
          {/* browser bar, full width at the top; its contents are drawn at 36 and scaled to fit */}
          <div className="f-abs z-10 overflow-hidden border-b border-[var(--f-line)] bg-[var(--f-soft)]" style={{ left: 0, top: 0, width: 560, height: "var(--bar)" }}>
          <div className="absolute left-0 top-0 flex items-center gap-3 px-3" style={{ width: "calc(560px / var(--bar-k))", height: 36, transformOrigin: "0 0", transform: "scale(var(--bar-k))" }}>
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
            {/* which site you're looking at: the old one left of the line, the new one right */}
            <span data-which="" data-on="before" className="f-which f-hidden" aria-hidden="true">
              <span data-side="before">Before</span>
              <span data-side="after">After</span>
            </span>
            <span className="block h-[20px] w-[20px] rounded-full bg-[var(--f-accent-wash)]" />
            {/* the page loading */}
          </div>
            <span data-load="" className="absolute bottom-[-1px] left-0 h-[1.5px] w-full origin-left bg-[var(--f-accent)] opacity-0" />
          </div>

          {/* a new tab: one search field */}
          <div data-newtab="" className="f-abs grid justify-items-center content-start" style={{ left: 0, top: "var(--bar)", width: 560, height: "calc(var(--win-h, 312px) - var(--bar))", paddingTop: 103 }}>
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
          <div data-site="" className="f-abs f-hidden f-split overflow-hidden" style={{ left: 0, top: "var(--bar)", width: 560, height: "calc(var(--win-h, 312px) - var(--bar))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img data-old="" src={`${ASSETS}-old-${FIRST}.webp`} alt="The old velory.com" className="f-split-img" draggable={false} />
            {/* the new site plays, its hero film running, like the real page */}
            <div data-clip="" className="f-split-clip">
              <video data-new="" className="f-split-img f-split-new" src={`${ASSETS}-new-${FIRST}.mp4`} poster={`${ASSETS}-new-${FIRST}.webp`} muted loop playsInline preload="metadata" aria-label="The new velory.com" />
            </div>
            <span data-line="" className="f-split-line" aria-hidden="true">
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
