"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCaseTimeline } from "./play";

/* Actionable Insights (in the Velory portal): the admin doesn't have to dig for savings.
   The portal scans the licences and finds the unused one; an insight says what to do; one
   click asks the people holding it in chat, and the ones who say no let it go. It rests on
   the answers. The figures are illustrative. A white portal panel on the work blue, the
   people below it in white. */

const USERS = [true, false, true, true, false, true]; // true: not using it, the licence can go
const USER_Y = 128, USER_X0 = 25, USER_STEP = 22;
const ROWS = ["Design tool", "Video calls", "Docs"];
const PAPER = "var(--paper)", WORK = "var(--work)";

export function InsightToSaving({ index }: { index: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const attach = useCaseTimeline(index);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const q = gsap.utils.selector(svg);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let detach = () => {};
    const ctx = gsap.context(() => {
      const no = q("[data-user='no']"), yes = q("[data-user='yes']");
      gsap.set(q("[data-reply], [data-bubble]"), { transformOrigin: "50% 100%" });
      const end = () => {
        gsap.set(q("[data-list]"), { autoAlpha: 0 });
        gsap.set(q("[data-card]"), { autoAlpha: 1, y: 0 });
        gsap.set(q("[data-asked]"), { autoAlpha: 1 });
        gsap.set(q("[data-ask]"), { autoAlpha: 0 });
        gsap.set(q("[data-askfill]"), { fillOpacity: 1 });
        gsap.set(q("[data-bubble]"), { autoAlpha: 0 });
        gsap.set(q("[data-reply]"), { autoAlpha: 1, scale: 1 });
        gsap.set(no, { autoAlpha: 0.35 });
      };
      if (still) return end();

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      tl.set(q("[data-card]"), { autoAlpha: 0, y: 14 })
        .set(q("[data-asked]"), { autoAlpha: 0 })
        .set(q("[data-ask]"), { autoAlpha: 1 })
        .set(q("[data-askfill]"), { fillOpacity: 0 })
        .set(q("[data-hit]"), { fillOpacity: 0 })
        .set(q("[data-scan]"), { y: 0, autoAlpha: 0 })
        .set(q("[data-cursor]"), { x: 34, y: 60, autoAlpha: 0 })
        .set(q("[data-bubble], [data-reply]"), { autoAlpha: 0, scale: 0.4 })
        .set(q("[data-user]"), { autoAlpha: 1, y: 0 })
        .fromTo(q("[data-list]"), { autoAlpha: 0, y: 0 }, { autoAlpha: 1, duration: 0.4 })
        .fromTo(q("[data-row]"), { x: -6, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }, "<")
        // 1. the portal scans its licences and finds one nobody uses
        .to(q("[data-scan]"), { autoAlpha: 1, duration: 0.15 })
        .to(q("[data-scan]"), { y: 40, duration: 0.9, ease: "power1.inOut" })
        .to(q("[data-scan]"), { autoAlpha: 0, duration: 0.15 })
        .to(q("[data-hit]"), { fillOpacity: 0.16, duration: 0.25, yoyo: true, repeat: 3 }, "-=0.55")
        // 2. it becomes an insight: what to do, and what it's worth
        .to(q("[data-list]"), { autoAlpha: 0, y: -6, duration: 0.35, ease: "power2.in" })
        .to(q("[data-card]"), { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" }, "-=0.1")
        // 3. the admin asks, with one click
        .to(q("[data-cursor]"), { autoAlpha: 1, duration: 0.2 }, "-=0.2")
        .to(q("[data-cursor]"), { x: 108, y: 74, duration: 0.7 })
        .to(q("[data-askfill]"), { fillOpacity: 1, duration: 0.15 })
        .to(q("[data-ask]"), { autoAlpha: 0, duration: 0.15 }, "<")
        .to(q("[data-asked]"), { autoAlpha: 1, duration: 0.2 })
        .to(q("[data-cursor]"), { autoAlpha: 0, x: "+=10", y: "+=8", duration: 0.4 }, "<")
        // 4. everyone holding the licence is asked in chat
        .to(q("[data-bubble]"), { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: "back.out(2)" }, "-=0.1")
        // 5. they answer; the ones not using it let it go
        .to(q("[data-bubble]"), { autoAlpha: 0, scale: 0.6, duration: 0.25, stagger: 0.06 }, "+=0.6")
        .to(q("[data-reply]"), { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.09, ease: "back.out(2)" }, "-=0.2")
        .to(no, { autoAlpha: 0.35, duration: 0.4, stagger: 0.1 }, "+=0.25")
        .to(yes, { y: -1.5, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.1 }, "<")
        .addLabel("rest", "+=0.3")
        // playing again from here: it all clears for the next insight
        .to(q("[data-card], [data-reply]"), { autoAlpha: 0, duration: 0.45 }, "rest+=0.8")
        .to(q("[data-user]"), { autoAlpha: 1, duration: 0.45 }, "<");
      detach = attach(tl);
    }, svg);
    return () => {
      detach();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 160 160" className="case-svg absolute inset-0 m-auto h-[90%] w-[88%]" role="img" aria-label="Actionable Insights: the portal finds unused licences, the admin asks the users in one click, and the ones nobody uses are cancelled">
      {/* the portal's panel */}
      <rect x="6" y="4" width="148" height="92" rx="5" fill={PAPER} />
      <circle cx="15" cy="13" r="1.8" fill={WORK} />
      <text x="21" y="15.5" fontSize="7" fill={WORK}>
        Velory portal · Insights
      </text>
      <line x1="6" y1="22" x2="154" y2="22" stroke={WORK} strokeWidth="0.5" strokeOpacity="0.4" />

      {/* 1. the licences, with a scan going down them */}
      <g data-list="">
        {ROWS.map((name, i) => (
          <g key={name} data-row="">
            {i === 0 && <rect data-hit="" x="10" y={28 + i * 17} width="140" height="14" rx="2" fill={WORK} fillOpacity="0" />}
            <text x="16" y={38 + i * 17} fontSize="7" fill={WORK}>
              {name}
            </text>
            {/* how much each is used: the first barely */}
            <rect x="96" y={33.5 + i * 17} width="48" height="2.4" rx="1.2" fill={WORK} fillOpacity="0.2" />
            <rect x="96" y={33.5 + i * 17} width={[5, 40, 32][i]} height="2.4" rx="1.2" fill={WORK} />
          </g>
        ))}
        <line data-scan="" x1="10" y1="29" x2="150" y2="29" stroke={WORK} strokeWidth="0.9" strokeDasharray="1.2 1.6" />
      </g>

      {/* 2. the insight */}
      <g data-card="">
        <rect x="14" y="28" width="26" height="10" rx="5" fill={WORK} />
        <text x="27" y="35.3" textAnchor="middle" fontSize="6.5" fill={PAPER}>
          Insight
        </text>
        <text x="14" y="52" fontSize="11" fill={WORK}>
          Save 14 400 kr a year
        </text>
        <text x="14" y="62" fontSize="7" fill={WORK}>
          6 licences look unused.
        </text>
        <rect data-askfill="" x="80" y="68" width="66" height="16" rx="8" fill={WORK} fillOpacity="0" stroke={WORK} strokeWidth="0.9" />
        <text data-ask="" x="113" y="78.6" textAnchor="middle" fontSize="7.5" fill={WORK}>
          Ask users
        </text>
        <text data-asked="" x="113" y="78.6" textAnchor="middle" fontSize="7.5" fill={PAPER}>
          Asked in chat
        </text>
      </g>

      {/* the admin's cursor */}
      <path data-cursor="" d="M0 0 L0 10 L2.9 7.3 L4.9 11.5 L6.4 10.8 L4.4 6.7 L8.2 6.7 Z" fill={WORK} stroke={PAPER} strokeWidth="0.7" />

      {/* 3–5. the people with the licence, asked in chat, and their answers */}
      {USERS.map((free, i) => {
        const x = USER_X0 + i * USER_STEP;
        return (
          <g key={i}>
            <g data-user={free ? "no" : "yes"}>
              <circle cx={x} cy={USER_Y} r="4" fill="none" stroke={PAPER} strokeWidth="0.9" />
              <path d={`M${x - 6.5} ${USER_Y + 12} q6.5 -7.5 13 0`} fill="none" stroke={PAPER} strokeWidth="0.9" />
            </g>
            <g data-bubble="">
              <rect x={x - 8} y={USER_Y - 21} width="16" height="11" rx="3" fill={PAPER} />
              <text x={x} y={USER_Y - 12.6} textAnchor="middle" fontSize="8" fill={WORK}>
                ?
              </text>
            </g>
            <g data-reply="">
              <rect x={x - 9} y={USER_Y - 21} width="18" height="11" rx="3" fill={free ? "none" : PAPER} stroke={PAPER} strokeWidth="0.8" />
              <text x={x} y={USER_Y - 13} textAnchor="middle" fontSize="7" fill={free ? PAPER : WORK}>
                {free ? "No" : "Yes"}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
