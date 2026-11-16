"use client";

import { useEffect, useRef, useState } from "react";
import { about, intro, site } from "@/content/site";
import { Tinted } from "./Tinted";
import { WorkDetail, WorkFilters, WorkList, WorkPrints } from "./Work";

/* The hero as four corners around an open middle (the lilies and the light):
   - top left: a small outlined card with portrait, name and role. Hovering it grows the
     card out of its corner and the about cells appear;
   - bottom right: a small card listing the case studies. Hovering it (or scrolling
     down) grows it into the work: printed pictures and the highlighted case;
   - top right: Stockholm; bottom left: the promise, as plain text on the page.
   Only one card is open at a time; scrolling up opens about, down opens the work.

   How a card grows: its content is laid out at full size from the start, and a thin
   outline around it animates from the small corner size to the full size. The cells
   outside the corner fade in once the sheet has room for them. */

/* one cell of the net */
const CELL = "p-[1.4vw]";

const EASE = "duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* the corner card sizes: small (closed) and full (open) */
const ME = { w: "30vw", h: "20vh", W: "70vw", H: "62vh" };
const WORK = { w: "26vw", h: "22vh", W: "62vw", H: "62vh" };

type Card = "me" | "work" | null;

/* which corner card is open (only one at a time). A card opens while the pointer or
   keyboard focus is in it, and closes a moment after the pointer leaves. */
function useCards() {
  const [open, setOpen] = useState<Card>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hover = (card: Exclude<Card, null>) => ({
    onMouseEnter: () => (clearTimeout(timer.current), setOpen(card)),
    onMouseLeave: () => (timer.current = setTimeout(() => setOpen((o) => (o === card ? null : o)), 180)),
    onFocus: () => (clearTimeout(timer.current), setOpen(card)),
    onBlur: () => setOpen((o) => (o === card ? null : o)),
  });
  return { open, setOpen, hover };
}

/* the outline of a card: no fill, just a thin line, growing from its corner */
function Sheet({ open, size, corner }: { open: boolean; size: typeof ME; corner: "tl" | "br" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-auto absolute border border-rule transition-[width,height] ${EASE} ${corner === "tl" ? "left-0 top-0" : "bottom-0 right-0"}`}
      style={{ width: open ? size.W : size.w, height: open ? size.H : size.h }}
    />
  );
}

/* the cells outside the corner: hidden while closed, fading in as the card grows */
const reveal = (open: boolean) => `transition-opacity ${open ? "opacity-100 delay-200 duration-500" : "pointer-events-none opacity-0 duration-200"}`;

export function Hero() {
  const { open, setOpen, hover } = useCards();
  const me = { open: open === "me", on: hover("me") };
  const work = { open: open === "work", on: hover("work") };
  const [on, setOn] = useState(0);

  /* scrolling: down opens the work (or closes about), up opens about (or closes the
     work). The page itself never scrolls, so the wheel and swipes are free. */
  useEffect(() => {
    const go = (down: boolean) => setOpen((o) => (down ? (o === "me" ? null : "work") : o === "work" ? null : "me"));
    let touchY = 0;
    let last = 0;
    const once = (down: boolean) => {
      if (Date.now() - last < 600) return; // one step per gesture
      last = Date.now();
      go(down);
    };
    const wheel = (e: WheelEvent) => Math.abs(e.deltaY) > 4 && once(e.deltaY > 0);
    const start = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const move = (e: TouchEvent) => {
      const dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) > 30) once(dy > 0);
    };
    addEventListener("wheel", wheel, { passive: true });
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: true });
    return () => {
      removeEventListener("wheel", wheel);
      removeEventListener("touchstart", start);
      removeEventListener("touchmove", move);
    };
  }, [setOpen]);

  return (
    <section className="fixed inset-0 z-10 overflow-hidden font-display font-light text-leaf">
      {/* top right: the city */}
      <p className="absolute right-[2.5vw] top-[2.5vh] w-[16vw] border-b border-rule px-[1.4vw] py-[1.4vw] text-right text-[clamp(0.95rem,1.15vw,1.15rem)]">{site.city}</p>

      {/* bottom left: the promise */}
      <p className="absolute bottom-[2.5vh] left-[2.5vw] w-[30vw] border-t border-rule p-[1.4vw] text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed">
        <span className="block max-w-[34ch]">{intro}</span>
      </p>

      {/* top left: about me */}
      <header {...me.on} className="pointer-events-none absolute left-[2.5vw] top-[2.5vh] text-leaf" style={{ width: ME.W, height: ME.H }}>
        <Sheet open={me.open} size={ME} corner="tl" />
        <div className="relative grid h-full" style={{ gridTemplateColumns: `${ME.w} 1fr 1fr`, gridTemplateRows: `${ME.h} 1fr` }}>
          {/* the corner: what shows while closed */}
          <div className={`${CELL} pointer-events-auto flex flex-col justify-between`}>
            <div className="flex items-start gap-[1.2vw]">
              <button aria-expanded={me.open} aria-label="About me" className="shrink-0 cursor-pointer">
                <Tinted src={site.portrait.src} alt="" className="pointer-events-none aspect-[4/5] h-[clamp(3.6rem,5vw,5rem)]" />
              </button>
              <h1 className="text-[clamp(1.7rem,2.6vw,2.6rem)] leading-[1.05] tracking-[-0.02em]">
                Lisa
                <br />
                Gammeltoft
              </h1>
            </div>
            <p className="text-[clamp(0.85rem,1vw,1rem)] italic">{site.role}</p>
          </div>

          {/* the facts, a little net of two by two */}
          <dl className={`col-span-2 grid grid-cols-2 grid-rows-2 border-l border-rule text-[clamp(0.72rem,0.8vw,0.84rem)] ${reveal(me.open)}`}>
            {about.facts.map((f, i) => (
              <div key={f.label} className={`border-rule px-[1.4vw] py-[1vw] ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t" : ""}`}>
                <dt className="italic opacity-70">{f.label}</dt>
                <dd className="mt-1">{f.value}</dd>
              </div>
            ))}
          </dl>

          <div className={`${CELL} border-t border-rule ${reveal(me.open)}`}>
            <Tinted src={site.portrait.src} alt={site.portrait.alt} className="h-full w-full" />
          </div>
          <div className={`${CELL} border-l border-t border-rule ${reveal(me.open)}`}>
            <h2 className="text-[clamp(1.2rem,1.6vw,1.6rem)] leading-tight">{about.hello}</h2>
            <p className="mt-4 text-[clamp(0.76rem,0.84vw,0.88rem)] leading-relaxed">{about.body[0]}</p>
          </div>
          <p className={`${CELL} border-l border-t border-rule text-[clamp(0.76rem,0.84vw,0.88rem)] leading-relaxed ${reveal(me.open)}`}>{about.body[1]}</p>
        </div>
      </header>

      {/* bottom right: the work */}
      <nav {...work.on} aria-label="Selected work" className="pointer-events-none absolute bottom-[2.5vh] right-[2.5vw] text-leaf" style={{ width: WORK.W, height: WORK.H }}>
        <Sheet open={work.open} size={WORK} corner="br" />
        <div className="relative grid h-full" style={{ gridTemplateColumns: `1fr ${WORK.w}`, gridTemplateRows: `1fr ${WORK.h}` }}>
          <div className={`row-span-2 ${reveal(work.open)}`}>
            <WorkPrints on={on} setOn={setOn} />
          </div>
          <div className={`border-l border-rule ${reveal(work.open)}`}>
            <WorkDetail on={on} />
          </div>
          {/* the corner: what shows while closed */}
          <div className={`pointer-events-auto border-rule transition-[border-color] ${work.open ? "border-l border-t" : "border-l border-t border-transparent"}`}>
            <WorkList on={on} setOn={setOn} />
          </div>
        </div>
      </nav>

      <WorkFilters />
    </section>
  );
}
