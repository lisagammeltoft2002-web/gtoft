"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { caseStudies } from "@/content/site";
import { WorkFilters } from "./Work";
import { carvedPath, type Rect } from "./carve";
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

/* three cards across the bottom: tall ones at the sides, a shorter one in the middle */
const M = 16;
const TOPS = [0.3, 0.52, 0.3];
function cardRects(W: number, H: number): Rect[] {
  const g = 14;
  const xs = [M, 0.36 * W, 0.66 * W, W - M];
  const last = TOPS.length - 1;
  return TOPS.map((t, i) => ({ x0: xs[i] + (i ? g / 2 : 0), x1: xs[i + 1] - (i < last ? g / 2 : 0), y0: t * H, y1: H - M }));
}

const RADIUS = 22; /* every corner of every card, including where the curve meets an edge */
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
  const words = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paperCanvas = back.current!;
    const sandCanvas = front.current!;
    const flow = createFlow(paperCanvas, sandCanvas, GRAINS);
    if (!flow) return;
    const pinned = paperCanvas.closest("section")!;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let builtFor = "";
    let rects: Rect[] = [];
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
      rects.forEach((rc, i) => {
        const el = cards.current[i];
        if (!el) return;
        const y0 = rc.y0 + (M - rc.y0) * e;
        el.style.top = `${y0}px`;
        el.style.height = `${rc.y1 - y0}px`;
        const local = { x0: 0, y0: 0, x1: rc.x1 - rc.x0, y1: rc.y1 - y0 };
        el.style.clipPath = `path("${carvedPath(local, cx - rc.x0, cy - lift - y0, R, RADIUS) || "M0 0Z"}")`;
      });
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      pinLen = Math.max(1, pinned.offsetHeight - H);
      total = Math.max(1, document.documentElement.scrollHeight - H);
      rects = cardRects(W, H);
      rects.forEach((rc, i) => {
        const el = cards.current[i];
        if (el) Object.assign(el.style, { left: `${rc.x0}px`, width: `${rc.x1 - rc.x0}px` });
      });
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
            <h1 className="-mt-[0.07em] whitespace-nowrap text-[min(33vh,20vw)] uppercase leading-[0.85] text-cream">Lorem ipsum</h1>
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
                className="group absolute block overflow-hidden bg-moss text-cream"
              >
                {/* the photo printed in the page's greens; its real colour comes through on hover */}
                <img
                  src={c.image.src}
                  alt={c.image.alt}
                  className="absolute inset-0 h-full w-full object-cover [filter:url(#duo-deep)] transition-[filter,transform] duration-700 group-hover:scale-[1.03] group-hover:[filter:none]"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-moss/60 to-transparent p-5 pt-16 [text-shadow:0_1px_12px_rgb(0_0_0/0.3)]">
                  <h3 className="text-[clamp(1.1rem,1.5vw,1.5rem)] leading-tight">{c.title}</h3>
                  <span className="text-[0.76rem] italic opacity-85">{kind(c.kind)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
