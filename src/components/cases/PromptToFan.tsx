"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCaseTimeline } from "./play";

/* Velory Studio: "one sentence in, on-brand work out". A prompt types itself into the chat
   field and sends; a banner, a slide and a film fan out of it, and it rests there. When it
   plays again, they tuck back in and the next colleague asks for something else. White
   pieces with work-blue drawing, on the work blue. */

const PROMPTS = ["Spring banner for LinkedIn", "Slides for Friday’s demo", "A film of the portal"];
const CARD_W = 46, CARD_H = 60;
/* where each card lands: centre x, centre y, tilt */
const FAN = [
  { x: 42, y: 100, r: -12 },
  { x: 80, y: 92, r: 0 },
  { x: 118, y: 100, r: 12 },
];
const FROM = { x: 80, y: 30 }; // the cards come out of the prompt
const PAPER = "var(--paper)", WORK = "var(--work)";

export function PromptToFan({ index }: { index: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const attach = useCaseTimeline(index);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const q = gsap.utils.selector(svg);
    const typed = svg.querySelector<SVGTextElement>("[data-typed]");
    const caret = svg.querySelector<SVGLineElement>("[data-caret]");
    const cards = q("[data-card]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let detach = () => {};
    const ctx = gsap.context(() => {
      const type = { n: PROMPTS[0].length, text: PROMPTS[0] };
      let round = 0;
      const setTyped = () => {
        if (!typed || !caret) return;
        typed.textContent = type.text.slice(0, Math.round(type.n));
        const x = 25 + (typed.textContent ? typed.getComputedTextLength() : 0) + 1;
        caret.setAttribute("x1", String(x));
        caret.setAttribute("x2", String(x));
      };
      const landed = (i: number) => ({ x: FAN[i].x - CARD_W / 2, y: FAN[i].y - CARD_H / 2, rotation: FAN[i].r, scale: 1, autoAlpha: 1 });
      const tucked = { x: FROM.x - CARD_W / 2, y: FROM.y - CARD_H / 2, rotation: 0, scale: 0.15, autoAlpha: 0 };
      gsap.set(cards, { transformOrigin: "50% 50%", ...tucked });
      setTyped();

      // the film's progress bar runs on this case's own clock, so it only moves while it plays
      const progress = q("[data-progress]");
      gsap.set(progress, { transformOrigin: "0% 50%", scaleX: 0.6 });
      const film = (time: number) => gsap.set(progress, { scaleX: (time % 2.4) / 2.4 });

      if (still) {
        cards.forEach((c, i) => gsap.set(c, landed(i)));
        gsap.set(caret, { autoAlpha: 0 });
        return;
      }

      const tl = gsap.timeline({ paused: true, onUpdate: () => film(tl.time()) });
      tl.call(() => {
        type.text = PROMPTS[round++ % PROMPTS.length];
        type.n = 0;
        setTyped();
      })
        .set(caret, { autoAlpha: 1 })
        .to(type, { n: () => type.text.length, duration: 1.2, ease: "none", onUpdate: setTyped })
        // send: the arrow nudges, the caret goes
        .to(q("[data-send]"), { x: 2, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1 })
        .set(caret, { autoAlpha: 0 }, "<")
        // the pieces fan out of the prompt, one after another
        .to(cards, { ...landed(0), duration: 0.8, ease: "back.out(1.4)", stagger: 0.12, x: (i: number) => landed(i).x, y: (i: number) => landed(i).y, rotation: (i: number) => landed(i).rotation }, "-=0.05")
        .addLabel("rest", "+=0.3")
        // playing again from here: they tuck back in and the prompt clears
        .to(cards, { ...tucked, duration: 0.5, ease: "power2.in", stagger: { each: 0.06, from: "end" } }, "rest+=0.8")
        .to(type, { n: 0, duration: 0.3, ease: "none", onUpdate: setTyped }, "<");
      // its resting frame shows the pieces out
      tl.seek("rest", true);
      cards.forEach((c, i) => gsap.set(c, landed(i)));
      detach = attach(tl);
    }, svg);
    return () => {
      detach();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = (children: React.ReactNode, key: string) => (
    <g key={key} data-card="">
      <rect width={CARD_W} height={CARD_H} rx="3" fill={PAPER} />
      {children}
    </g>
  );

  return (
    <svg ref={ref} viewBox="0 0 160 145" className="case-svg absolute inset-0 m-auto h-[90%] w-[88%]" role="img" aria-label="Velory Studio: a one-line prompt becomes an on-brand banner, slide and film">
      {/* the prompt field */}
      <rect x="14" y="20" width="132" height="20" rx="10" fill={PAPER} />
      <text data-typed="" x="25" y="32.6" fontSize="7.5" fill={WORK} />
      <line data-caret="" x1="25" y1="25.5" x2="25" y2="34.5" stroke={WORK} strokeWidth="0.8" />
      <g data-send="">
        <circle cx="136" cy="30" r="6.5" fill={WORK} />
        <path d="M133.4 30h5.2m-2.2-2.4 2.4 2.4-2.4 2.4" fill="none" stroke={PAPER} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {card(
        // a banner: mountains, a headline, the logo
        <>
          <path d="M4 36 L14 23 L21 29 L29 19 L42 36 Z" fill={WORK} fillOpacity="0.18" stroke={WORK} strokeWidth="0.7" />
          <rect x="5" y="42" width="32" height="3.4" rx="1" fill={WORK} />
          <rect x="5" y="48.5" width="21" height="2.2" rx="1" fill={WORK} fillOpacity="0.5" />
          <circle cx="39" cy="54" r="2.2" fill={WORK} />
        </>,
        "banner",
      )}
      {card(
        // a slide: a title, three points and a small chart
        <>
          <rect x="5" y="6" width="28" height="3.6" rx="1" fill={WORK} />
          {[15, 20.5, 26].map((y) => (
            <g key={y}>
              <circle cx="6.5" cy={y + 1} r="1" fill={WORK} />
              <rect x="9.5" y={y} width="19" height="2.2" rx="1" fill={WORK} fillOpacity="0.5" />
            </g>
          ))}
          {[8, 14, 11, 19].map((h, i) => (
            <rect key={i} x={8 + i * 8.5} y={54 - h} width="5.5" height={h} rx="0.8" fill={WORK} fillOpacity={i === 3 ? 1 : 0.35} />
          ))}
        </>,
        "slide",
      )}
      {card(
        // a film: a frame with a play button and a progress bar
        <>
          <rect x="4" y="6" width="38" height="36" rx="2" fill={WORK} fillOpacity="0.14" />
          <path d="M19.5 18 L29 24 L19.5 30 Z" fill={WORK} />
          <rect x="4" y="49" width="38" height="1.8" rx="0.9" fill={WORK} fillOpacity="0.25" />
          <rect data-progress="" x="4" y="49" width="38" height="1.8" rx="0.9" fill={WORK} />
        </>,
        "film",
      )}
    </svg>
  );
}
