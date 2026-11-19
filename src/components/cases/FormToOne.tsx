"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCaseTimeline } from "./play";

/* velory.com: the old demo form (four fields and a captcha) strikes itself down to the one
   field that matters. The email gets typed, the button fills and sends: it rests there.
   When it plays again, that lifts away and a fresh long form draws itself. Drawn in paper
   white on the work blue. */

const FIELDS = ["Name", "Company", "Phone", "Role"]; // the ones that go
const TOP = 46, STEP = 21; // the first field's label line, and the space between fields
const EMAIL_Y = TOP + STEP * 4, CAPTCHA_Y = TOP + STEP * 5 + 4, BUTTON_Y = CAPTCHA_Y + 18;
const EMAIL_TO = 80, BUTTON_TO = 108; // where the email field and the button end up
const TYPED = "you@company.com";
const PAPER = "var(--paper)", WORK = "var(--work)";

export function FormToOne({ index }: { index: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const attach = useCaseTimeline(index);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const q = gsap.utils.selector(svg);
    const typed = svg.querySelector<SVGTextElement>("[data-typed]");
    const caret = svg.querySelector<SVGLineElement>("[data-caret]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let detach = () => {};
    const ctx = gsap.context(() => {
      const type = { n: 0 };
      const setTyped = () => {
        if (!typed || !caret) return;
        typed.textContent = TYPED.slice(0, Math.round(type.n));
        const x = 18 + (typed.textContent ? typed.getComputedTextLength() : 0) + 1;
        caret.setAttribute("x1", String(x));
        caret.setAttribute("x2", String(x));
      };
      const end = () => {
        gsap.set(q("[data-go]"), { autoAlpha: 0 });
        gsap.set(q("[data-email]"), { y: EMAIL_TO - EMAIL_Y, autoAlpha: 1 });
        gsap.set(q("[data-button]"), { y: BUTTON_TO - BUTTON_Y, autoAlpha: 1 });
        gsap.set(q("[data-fill]"), { fillOpacity: 1 });
        gsap.set(q("[data-label]"), { fill: WORK });
        gsap.set(q("[data-check]"), { strokeDashoffset: 0 });
        gsap.set(caret, { autoAlpha: 0 });
        type.n = TYPED.length;
        setTyped();
      };
      if (still) return end();

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      // a fresh long form draws itself in, top to bottom
      tl.set(q("[data-strike]"), { strokeDashoffset: 140 })
        .set(q("[data-email], [data-button]"), { y: 0 })
        .set(q("[data-fill]"), { fillOpacity: 0 })
        .set(q("[data-label]"), { fill: PAPER })
        .set(q("[data-check]"), { strokeDashoffset: 14 })
        .set(caret, { autoAlpha: 0 })
        .call(() => {
          type.n = 0;
          setTyped();
        })
        .fromTo(q("[data-row]"), { autoAlpha: 0, x: 8 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" })
        // the fields that aren't needed are struck out and slide away, one by one
        .to(q("[data-strike]"), { strokeDashoffset: 0, duration: 0.35, stagger: 0.2, ease: "power1.inOut" }, "+=0.5")
        .to(q("[data-go]"), { autoAlpha: 0, x: -14, duration: 0.45, stagger: 0.2, ease: "power2.in" }, "<0.25")
        // what's left glides into the middle
        .to(q("[data-email]"), { y: EMAIL_TO - EMAIL_Y, duration: 0.8 }, "-=0.2")
        .to(q("[data-button]"), { y: BUTTON_TO - BUTTON_Y, duration: 0.8 }, "<0.06")
        // the email is typed, the button fills and sends
        .to(caret, { autoAlpha: 1, duration: 0.15 })
        .to(type, { n: TYPED.length, duration: 1.1, ease: "none", onUpdate: setTyped })
        .to(caret, { autoAlpha: 0, duration: 0.15 })
        .to(q("[data-fill]"), { fillOpacity: 1, duration: 0.3, ease: "power1.out" })
        .to(q("[data-label]"), { fill: WORK, duration: 0.3 }, "<")
        .to(q("[data-check]"), { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" })
        .addLabel("rest", "+=0.2")
        // playing again from here: the sent form lifts away
        .to(q("[data-email], [data-button]"), { autoAlpha: 0, y: "-=10", duration: 0.5, ease: "power2.in" }, "rest+=0.8")
        .set(q("[data-email], [data-button]"), { autoAlpha: 1 });
      detach = attach(tl);
    }, svg);
    return () => {
      detach();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 160 200" className="case-svg absolute inset-0 m-auto h-[90%] w-[88%]" role="img" aria-label="The demo form: four fields and a captcha shrink to a single email field">
      <g fill="none" stroke={PAPER} strokeWidth="0.9">
        {/* the browser window */}
        <rect x="4" y="4" width="152" height="192" rx="6" />
        <line x1="4" y1="16" x2="156" y2="16" />
        <circle cx="11" cy="10" r="1.4" />
        <circle cx="16.5" cy="10" r="1.4" />
        <circle cx="22" cy="10" r="1.4" />
      </g>
      <text x="14" y="34" fontSize="12" fill={PAPER}>
        Book a demo
      </text>

      {/* the four fields that go */}
      {FIELDS.map((label, i) => {
        const y = TOP + STEP * i;
        return (
          <g key={label} data-row="" data-go="">
            <text x="14" y={y} fontSize="7" fill={PAPER}>
              {label}
            </text>
            <rect x="14" y={y + 3} width="132" height="11" rx="2" fill="none" stroke={PAPER} strokeWidth="0.9" />
            <line data-strike="" x1="10" y1={y + 4} x2="148" y2={y + 4} stroke={PAPER} strokeWidth="1.2" strokeDasharray="140" strokeDashoffset="140" />
          </g>
        );
      })}

      {/* the one that stays */}
      <g data-row="" data-email="">
        <text x="14" y={EMAIL_Y} fontSize="7" fill={PAPER}>
          Work email
        </text>
        <rect x="14" y={EMAIL_Y + 3} width="132" height="11" rx="2" fill="none" stroke={PAPER} strokeWidth="0.9" />
        <text data-typed="" x="18" y={EMAIL_Y + 11.2} fontSize="7.5" fill={PAPER} />
        <line data-caret="" x1="18" y1={EMAIL_Y + 5} x2="18" y2={EMAIL_Y + 12} stroke={PAPER} strokeWidth="0.8" />
      </g>

      {/* the captcha goes too */}
      <g data-row="" data-go="">
        <rect x="14" y={CAPTCHA_Y - 7} width="80" height="15" rx="2" fill="none" stroke={PAPER} strokeWidth="0.9" />
        <rect x="18" y={CAPTCHA_Y - 3.5} width="8" height="8" rx="1" fill="none" stroke={PAPER} strokeWidth="0.9" />
        <text x="30" y={CAPTCHA_Y + 3} fontSize="7" fill={PAPER}>
          I’m not a robot
        </text>
        <line data-strike="" x1="10" y1={CAPTCHA_Y + 0.5} x2="96" y2={CAPTCHA_Y + 0.5} stroke={PAPER} strokeWidth="1.2" strokeDasharray="140" strokeDashoffset="140" />
      </g>

      <g data-row="" data-button="">
        <rect data-fill="" x="14" y={BUTTON_Y} width="132" height="16" rx="8" fill={PAPER} fillOpacity="0" stroke={PAPER} strokeWidth="0.9" />
        <path data-check="" d={`M54 ${BUTTON_Y + 8} l3 3 l6 -6`} fill="none" stroke={WORK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14" strokeDashoffset="14" />
        <text data-label="" x="84" y={BUTTON_Y + 10.6} textAnchor="middle" fontSize="7.5" fill={PAPER}>
          Book a demo
        </text>
      </g>
    </svg>
  );
}
