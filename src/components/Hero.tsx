"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { caseStudies } from "@/content/site";
import { WorkFilters } from "./Work";
import { carvedPath, type Rect } from "./carve";
import { applyPaletteCss, livePalette, onPalette } from "./palette";
import { createFlow, discAt, LAND_FIRST, PEEL_START } from "./flow";

/* The hero: cream paper with one big grainy green disc, and the case studies standing around
   it, carved by its curve. Scrolling plays one journey (see flow.ts), from the top of the page
   to the bottom:
   1. held (the hero is pinned): the wind peels the ball from the top while the cards stop making
      room for it and grow to full height;
   2. open sky: the cards scroll away and the sand flows on the wind across the empty paper;
   3. About: the sand descends behind the text and settles into the dunes under it.
   Sand in the air keeps drifting gently even when the scroll stops.

   Two fixed canvases behind all the content: the paper (ball + dunes) and the sand. */

/* the radius the disc carves out of the cards: its soft edge plus a little air */
const carveR = (r: number, H: number) => r + 0.035 * H * 0.6 + 18;

/* the cards: where each one sits while the ball is whole (from) and once it has grown to full
   height as the ball lets go (to).
   - wide screens: three across the bottom, tall ones at the sides, a shorter one in the middle;
     they grow upwards to the top of the screen;
   - phones (under 640px, Tailwind's sm): stacked, full width, starting just under the ball and
     sliding up to fill the screen. Each phone card is a row: photo left, text right. */
const M = 28; /* clear of the page frame (inset 12px) */
const NARROW = 640;
const TOPS = [0.3, 0.52, 0.3];
type Slot = { from: Rect; to: Rect };
function cardSlots(W: number, H: number): Slot[] {
  if (W < NARROW) {
    const g = 10;
    const n = TOPS.length;
    const stack = (top: number, bottom: number) => {
      const h = (bottom - top - g * (n - 1)) / n;
      return TOPS.map((_, i) => ({ x0: M, x1: W - M, y0: top + i * (h + g), y1: top + i * (h + g) + h }));
    };
    /* full size from the start, just under the ball (running off the bottom of the screen),
       then the whole stack slides up into place as the ball lets go */
    const d = discAt(W, H);
    const shift = Math.max(0, Math.min(H - 2 * M - 140, d.cy + carveR(d.r, H) + 6) - M);
    return stack(M, H - M).map((to) => ({ from: { ...to, y0: to.y0 + shift, y1: to.y1 + shift }, to }));
  }
  const g = 14;
  const xs = [M, 0.36 * W, 0.66 * W, W - M];
  const last = TOPS.length - 1;
  return TOPS.map((t, i) => {
    const from = { x0: xs[i] + (i ? g / 2 : 0), x1: xs[i + 1] - (i < last ? g / 2 : 0), y0: t * H, y1: H - M };
    return { from, to: { ...from, y0: M } };
  });
}

const RADIUS = 22; /* every corner of every card, including where the curve meets an edge */
const RIM = 8; /* the glass around each photo (the cards' p-2) */
const GRAINS = 120000; /* on a 1440×900 screen; fewer on smaller ones */
/* once the ball has started to let go the clock keeps it alive: sand in the air drifts, and in the
   finished desert the wind blows wisps off the crests */
/* progress at the end of the hold, when the cards have left the screen, and when the landing starts */
const PHASE = [0.4, 0.58, LAND_FIRST];

/* the case studies on the hero (the Velory portal is left out for now) */
const work = caseStudies.filter((c) => c.slug !== "velory-portal");
const kind = (k: string) => k.split(" · ")[0];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function Hero() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const cards = useRef<(HTMLAnchorElement | null)[]>([]);
  const photos = useRef<(HTMLDivElement | null)[]>([]);
  const words = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyPaletteCss(livePalette());
    const paperCanvas = back.current!;
    const sandCanvas = front.current!;
    const flow = createFlow(paperCanvas, sandCanvas, GRAINS);
    if (!flow) return;
    const pinned = paperCanvas.closest("section")!;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let builtFor = "";
    let slots: Slot[] = [];
    let narrow = false;
    /* measured on resize (no layout reads per frame): each card's caption height (wide cards) and
       photo width (phone cards, where the photo is a fixed share of the row) */
    let captionH: number[] = [];
    let photoW: number[] = [];
    let pinLen = 1; /* how long the hero is held, px of scroll */
    let total = 1; /* the whole journey, px of scroll */
    const pos = { x: 0, y: 0 }; /* the disc's drift towards the cursor */
    const st = { P: 0 }; /* the journey's progress, smoothed */
    let dirty = true;

    const render = (time: number) => {
      const alive = !still && flow.ready && st.P > PEEL_START;
      if (!dirty && !alive) return;
      dirty = false;
      /* the ground is the bottom of the screen: the waiting sand drifts there, low behind the
         text, and the dunes form there (only the lowest third of the screen) */
      flow.render(st.P, still ? 0 : time, pos);

      const d = discAt(W, H);
      const cx = d.cx + pos.x;
      const cy = d.cy + pos.y;
      /* the title lives inside the disc and goes with the first of the peel */
      if (words.current) {
        words.current.style.clipPath = `circle(${(d.r - 0.01 * H).toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
        words.current.style.opacity = String(1 - smooth(PEEL_START, PEEL_START + 0.08, st.P));
      }

      /* the cards stop making room for the ball and grow to full height, a little behind the peel,
         so its top and the first streams stay in view above them */
      const held = Math.min(1, Math.max(0, window.scrollY / pinLen));
      const e = smooth(0.6, 1, held);
      const R = carveR(d.r, H);
      const lift = Math.min(1, e * 1.6) ** 1.5 * (cy + R + 10); /* until the carve has left the screen */
      slots.forEach(({ from, to }, i) => {
        const el = cards.current[i];
        if (!el) return;
        const x0 = from.x0;
        const y0 = from.y0 + (to.y0 - from.y0) * e;
        const y1 = from.y1 + (to.y1 - from.y1) * e;
        el.style.top = `${y0}px`;
        el.style.height = `${y1 - y0}px`;
        const local = { x0: 0, y0: 0, x1: from.x1 - x0, y1: y1 - y0 };
        el.style.clipPath = `path("${carvedPath(local, cx - x0, cy - lift - y0, R, RADIUS) || "M0 0Z"}")`;
        /* the photo is carved by the same curve pushed out by the glass rim, so the rim runs all round */
        const ph = photos.current[i];
        if (ph) {
          const pr = narrow
            ? { x0: 0, y0: 0, x1: photoW[i] ?? 0, y1: y1 - y0 - 2 * RIM }
            : { x0: 0, y0: 0, x1: from.x1 - x0 - 2 * RIM, y1: y1 - y0 - 2 * RIM - (captionH[i] ?? 0) };
          const ox = x0 + RIM;
          const oy = y0 + RIM;
          ph.style.clipPath = `path("${carvedPath(pr, cx - ox, cy - lift - oy, R + RIM, RADIUS - RIM) || "M0 0Z"}")`;
        }
      });
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      pinLen = Math.max(1, pinned.offsetHeight - H);
      total = Math.max(1, document.documentElement.scrollHeight - H);
      narrow = W < NARROW;
      slots = cardSlots(W, H);
      slots.forEach(({ from }, i) => {
        const el = cards.current[i];
        if (el) Object.assign(el.style, { left: `${from.x0}px`, width: `${from.x1 - from.x0}px` });
      });
      captionH = cards.current.map((el) => (narrow ? 0 : ((el?.lastElementChild as HTMLElement | null)?.offsetHeight ?? 0)));
      photoW = photos.current.map((ph) => ph?.offsetWidth ?? 0);
      /* rebuild the flow only when the screen really changes (not when a phone's URL bar moves) */
      const key = `${W}x${Math.round(H / 40)}`;
      if (key !== builtFor) {
        builtFor = key;
        flow.resize(W, H, Math.min(window.devicePixelRatio || 1, 2));
      }
      dirty = true;
    };
    resize();
    flow.onReady = () => (dirty = true);
    const offPalette = onPalette(() => (dirty = true)); /* the colour picker: redraw in the new colours */
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    /* scroll → progress, each phase tied to the layout so it's in view (smoothed a little; it
       follows the scroll and reverses):
       - while the hero is held: the peel (the cards only grow at the end of it);
       - while the cards scroll away over the open sky: the sand flows on the wind;
       - while About comes up: the sand sinks and drifts low along the ground, behind the text;
       - over the last screen: the landing, done when About is in place */
    const tick = () => (dirty = true);
    const target = () => {
      const y = window.scrollY;
      const sky = pinLen + H; /* the cards have left the screen */
      const land = Math.max(sky, total - 0.9 * H); /* the landing starts */
      if (y < pinLen) return (PHASE[0] * y) / pinLen;
      if (y < sky) return PHASE[0] + ((PHASE[1] - PHASE[0]) * (y - pinLen)) / H;
      if (y < land) return PHASE[1] + ((PHASE[2] - PHASE[1]) * (y - sky)) / (land - sky);
      return Math.min(1, PHASE[2] + ((1 - PHASE[2]) * (y - land)) / Math.max(1, total - land));
    };
    const toP = gsap.quickTo(st, "P", { duration: still ? 0.01 : 0.7, ease: "power2.out", onUpdate: tick });
    st.P = target();

    const ease = { duration: 1.6, ease: "power3.out", onUpdate: tick };
    const toX = gsap.quickTo(pos, "x", ease);
    const toY = gsap.quickTo(pos, "y", ease);
    const onScroll = () => {
      dirty = true;
      toP(target());
      /* once it lets go the disc holds still */
      if (window.scrollY > 4) {
        toX(0);
        toY(0);
      }
    };
    const move = (e: PointerEvent) => {
      if (still || window.scrollY > 4) return;
      toX(((e.clientX / window.innerWidth) * 2 - 1) * 0.03 * window.innerWidth);
      toY(((e.clientY / window.innerHeight) * 2 - 1) * 0.025 * window.innerHeight);
    };
    const leave = () => {
      toX(0);
      toY(0);
    };

    gsap.ticker.add(render);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      ro.disconnect();
      offPalette();
      flow.dispose();
      gsap.ticker.remove(render);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    /* the hero is held for a screen of scroll while the ball lets go */
    <section className="relative h-[200dvh] w-full">
      <div className="sticky top-0 h-dvh w-full overflow-hidden">
        <WorkFilters />
        {/* the paper (ball + dunes) and the sand, fixed behind everything */}
        <canvas ref={back} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-lvh w-full" />
        <canvas ref={front} aria-hidden className="pointer-events-none fixed inset-0 -z-[5] h-lvh w-full" />

        {/* the title, too big for the disc: cut by its curve on the sides and by the top of the screen */}
        <div ref={words} className="pointer-events-none absolute inset-0">
          <div className="absolute left-[42vw] top-0 flex w-max -translate-x-1/2 flex-col items-center">
            {/* cream, like letters cut out of the ink */}
            <h1 className="-mt-[0.07em] whitespace-nowrap text-[min(33vh,20vw)] leading-[0.85] tracking-[-0.05em] text-cream">Lorem ipsum</h1>
            <p className="mt-[6vh] max-w-[36ch] text-center text-[clamp(0.95rem,1.2vw,1.2rem)] leading-snug text-cream">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </div>

        <ul>
          {work.map((c, i) => (
            <li key={c.slug}>
              <a
                ref={(el) => {
                  cards.current[i] = el;
                }}
                href="#"
                className="glass group @container absolute flex flex-col rounded-[22px] p-2 max-sm:flex-row outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss"
              >
                {/* the photo sits inside the glass with a little air around it, in full colour */}
                <div
                  ref={(el) => {
                    photos.current[i] = el;
                  }}
                  className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] max-sm:w-[42%] max-sm:flex-none"
                >
                  <img
                    src={c.image.src}
                    alt={c.image.alt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2.5 max-sm:min-w-0 max-sm:flex-1 max-sm:flex-col max-sm:items-start max-sm:py-1 max-sm:pl-3.5 max-sm:pr-1">
                  <div className="min-w-0 max-sm:w-full">
                    <h3 className="truncate text-[clamp(1rem,1.25vw,1.25rem)] font-normal leading-tight">{c.title}</h3>
                    <span className="text-[0.72rem] opacity-60">{kind(c.kind)}</span>
                  </div>
                  {/* a white pill with a black arrow square, like a small "open" button */}
                  <span className="flex shrink-0 items-center gap-2 rounded-full bg-white p-1 text-[0.75rem] max-sm:self-end @[15rem]:pl-3.5 text-moss shadow-[0_2px_10px_-4px_rgb(0_0_0/0.25)] transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                    {/* narrow cards (phones) keep only the arrow */}
                    <span className="hidden @[15rem]:inline">View case</span>
                    <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-[#141414] text-[0.7rem] text-white">↗</span>
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
