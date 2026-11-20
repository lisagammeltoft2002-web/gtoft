"use client";

import { useRef } from "react";
import type { CaseCopy } from "@/content/site";
import { CaseFrame, Check, useFilm } from "./Film";

/* Actionable Insights, as a short teaser.
   Close on the bell's notification, "Save 14 400 kr a year". Review opens the insight: six
   people who haven't opened Figma in 60 days. Ask them in Slack; the answers pop in (two
   still use it, four don't). Cancel the four, and the saving counts up. */

const PEOPLE = [
  { name: "Anna Berg", days: 74, uses: false, p: { bg: "#dbe7f7", skin: "#f1c9a5", hair: "#6b4226", shirt: "#3a66ad", look: 1 as const } },
  { name: "Johan Lind", days: 91, uses: false, p: { bg: "#f6e3c4", skin: "#e8b48f", hair: "#2b2b2b", shirt: "#16915a", look: 0 as const } },
  { name: "Maja Ek", days: 63, uses: true, p: { bg: "#e4f1e2", skin: "#f3d2b6", hair: "#c48a3c", shirt: "#cf4058", look: 2 as const } },
  { name: "Sara Holm", days: 120, uses: false, p: { bg: "#f3dee6", skin: "#9c6a4a", hair: "#1d1612", shirt: "#f5d04f", look: 1 as const } },
  { name: "Omar Aziz", days: 67, uses: true, p: { bg: "#e5e1f6", skin: "#c58e66", hair: "#1d1612", shirt: "#264a87", look: 0 as const } },
  { name: "Lea Nyström", days: 88, uses: false, p: { bg: "#dff0f3", skin: "#f5d6c0", hair: "#e0b25a", shirt: "#687086", look: 2 as const } },
];
const ANSWER_ORDER = [1, 4, 0, 3, 2, 5];

// world points (the window sits at 20, 14)
const REVIEW = [409, 140];
const BTN = [112, 302];

export function InsightsCase({ copy, hero = false }: { copy: CaseCopy; hero?: boolean }) {
  const figure = useRef<HTMLSpanElement>(null);
  const saved = useRef<HTMLSpanElement>(null);

  const { ref, handlers } = useFilm((k) => {
    const { tl, q } = k;
    const money = { v: 0 };
    const render = () => {
      const t = `${Math.round(money.v / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kr";
      if (saved.current) saved.current.textContent = t;
      if (figure.current) figure.current.textContent = t;
    };

    // the first frame: the bell's notification, close up
    k.start(452, 80, 2.0);
    k.cursorStart(520, 220);

    // 1. review it
    k.cursor(REVIEW[0] + 4, REVIEW[1] + 3, 0.4, 0.9);
    k.hover("[data-review]", 1.3);
    k.click("[data-review]", 1.6);
    k.hide("[data-toast]", 1.85, 0.25);
    k.show("[data-insight]", 2.0, { y: 0, duration: 0.5 });
    k.show("[data-row]", 2.2, { duration: 0.35 }, 0.06);
    k.cam(300, 170, 1, 1.9, 1.1);

    // 2. ask them in Slack
    k.cursor(BTN[0] + 6, BTN[1] + 3, 3.1, 0.8);
    k.cam(BTN[0] + 40, BTN[1] - 30, 1.8, 3.1, 0.9);
    k.hover("[data-btn]", 3.85);
    k.click("[data-btn]", 4.05);
    k.hide("[data-btn-ask]", 4.1, 0.08);
    k.show("[data-btn-asking]", 4.2, { y: 0, duration: 0.2 });
    tl.to(q("[data-btn]"), { backgroundColor: "var(--f-accent)", duration: 0.2 }, 4.2);

    // 3. the answers pop in
    k.cam(300, 200, 1.05, 4.3, 1.0);
    ANSWER_ORDER.forEach((i, n) => {
      tl.fromTo(q(`[data-answer="${i}"]`), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, 4.9 + n * 0.28);
    });

    // 4. cancel the four, and the saving
    k.hide("[data-btn-asking]", 6.7, 0.08);
    k.show("[data-btn-cancel]", 6.8, { y: 0, duration: 0.2 });
    k.cursor(BTN[0] + 10, BTN[1] + 3, 6.8, 0.7);
    k.cam(BTN[0] + 40, BTN[1] - 30, 1.8, 6.8, 0.8);
    k.hover("[data-btn]", 7.5);
    k.click("[data-btn]", 7.7);
    k.cam(300, 190, 1, 7.95, 1.0);
    let nth = 0;
    PEOPLE.forEach((p, i) => {
      if (p.uses) return;
      const at = 8.05 + nth++ * 0.1;
      tl.fromTo(q(`[data-strike="${i}"]`), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.inOut" }, at);
      tl.to(q(`[data-person="${i}"]`), { opacity: 0.4, duration: 0.3 }, at);
      tl.to(q(`[data-answer="${i}"]`), { autoAlpha: 0, duration: 0.15 }, at);
      tl.fromTo(q(`[data-cancelled="${i}"]`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, at + 0.1);
    });
    k.hide("[data-btn]", 8.3, 0.2);
    k.show("[data-saved]", 8.4, { y: 6, duration: 0.45 });
    tl.to(money, { v: 9600, duration: 1.2, ease: "power2.out", onUpdate: render }, 8.5);
    tl.to(q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 8.5);
    k.metric(8.7);
    tl.set({}, {}, 10.4);

    return () => {
      money.v = 0;
      render();
    };
  }, { auto: hero });

  return (
    <CaseFrame slug="actionable-insights" copy={copy} hero={hero} frameRef={ref} handlers={handlers} figureRef={figure}>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: 312 }}>
          {/* top bar */}
          <div className="f-abs flex items-center border-b border-[var(--f-line)] px-5" style={{ left: 0, top: 0, width: 560, height: 40 }}>
            <span className="f-serif text-[15px] text-[color:var(--f-accent-deep)]">velory</span>
            <span className="f-faint ml-auto mr-3 rounded-full bg-[var(--f-soft)] px-3 py-[3px] text-[9px]">Search people, devices…</span>
            <span className="relative">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2.2a4 4 0 0 0-4 4v2.6L2.8 11h10.4L12 8.8V6.2a4 4 0 0 0-4-4zM6.5 13a1.6 1.6 0 0 0 3 0" fill="none" stroke="var(--f-grey)" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <span className="absolute -right-[2px] -top-[1px] h-[6px] w-[6px] rounded-full bg-[#f5d04f] ring-2 ring-white" />
            </span>
          </div>

          {/* the notification, under the bell */}
          <div data-toast="" className="f-abs rounded-[12px] border border-[var(--f-line)] bg-white shadow-[0_12px_28px_-16px_rgb(20_40_90/0.28)]" style={{ left: 318, top: 46, width: 232, height: 104 }}>
            <span className="absolute -top-[4px] h-[7px] w-[7px] rotate-45 border-l border-t border-[var(--f-line)] bg-white" style={{ right: 15 }} />
            <div className="flex items-center border-b border-[var(--f-line)] px-3" style={{ height: 26 }}>
              <span className="text-[9.5px] font-semibold">Notifications</span>
              <span className="f-grey ml-auto text-[8.5px]">Just now</span>
            </div>
            <div className="flex gap-2.5 px-3 pt-2.5">
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[var(--f-green-wash)] text-[10px] font-semibold text-[color:var(--f-green)]">kr</span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold leading-tight">Save 14 400 kr a year</span>
                <span className="f-grey block text-[8.5px] leading-snug">6 Figma licences unused for 60+ days</span>
                <span className="mt-2 flex gap-1.5">
                  <span data-review="" className="f-btn" style={{ height: 20, padding: "0 10px", fontSize: 9 }}>
                    Review
                  </span>
                  <span className="f-btn f-ghost" style={{ height: 20, padding: "0 10px", fontSize: 9 }}>
                    Later
                  </span>
                </span>
              </span>
            </div>
          </div>

          {/* the insight, opened */}
          <div data-insight="" className="f-abs f-hidden flex items-center gap-3" style={{ left: 24, top: 56, right: 24 }}>
            <FigmaLogo />
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-semibold">Figma · 6 of 18 seats unused</p>
              <p className="f-grey m-0 text-[9px]">Nobody below has opened it in 60 days · 2 400 kr per seat a year</p>
            </div>
          </div>

          {PEOPLE.map((p, i) => (
            <div key={p.name} data-row="" className="f-abs f-hidden flex items-center gap-2.5 border-t border-[var(--f-line)]" style={{ left: 24, top: 100 + i * 28, width: 512, height: 28 }}>
              <span data-person={i} className="flex items-center gap-2.5">
                <Person {...p.p} />
                <span className="text-[10px] font-medium" style={{ width: 80 }}>
                  <span className="relative">
                    {p.name}
                    {!p.uses && <span data-strike={i} className="absolute left-[-1px] right-[-1px] top-1/2 h-px origin-left scale-x-0 bg-[var(--f-ink)]" />}
                  </span>
                </span>
                <span className="f-faint text-[9px]">Last used {p.days} days ago</span>
              </span>
              <span className="ml-auto grid justify-items-end">
                <span data-answer={i} className={`f-chip f-hidden [grid-area:1/1] ${p.uses ? "f-chip-yes" : "f-chip-no"}`}>
                  {p.uses ? "Still using" : "Not using"}
                </span>
                {!p.uses && (
                  <span data-cancelled={i} className="f-chip f-hidden bg-[var(--f-soft)] text-[color:var(--f-grey)] [grid-area:1/1]">
                    Cancelled
                  </span>
                )}
              </span>
            </div>
          ))}

          <span data-btn="" data-row="" className="f-btn f-abs f-hidden" style={{ left: 24, top: 276, height: 24, minWidth: 136, display: "grid" }}>
            <span data-btn-ask="" className="flex items-center justify-center [grid-area:1/1]">
              Ask the 6 in Slack
            </span>
            <span data-btn-asking="" className="f-hidden flex items-center justify-center gap-1.5 [grid-area:1/1]">
              <svg className="f-spin" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M5 1a4 4 0 1 1-4 4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Asking…
            </span>
            <span data-btn-cancel="" className="f-hidden flex items-center justify-center [grid-area:1/1]">
              Cancel 4 licences
            </span>
          </span>

          <div data-saved="" className="f-abs f-hidden flex items-center gap-2 rounded-[10px] bg-[var(--f-green-wash)] px-3" style={{ left: 24, top: 272, width: 512, height: 32 }}>
            <span className="grid h-[16px] w-[16px] place-items-center rounded-full bg-[var(--f-green)] text-white">
              <Check />
            </span>
            <span className="text-[10px] font-medium text-[color:var(--f-green)]">4 licences cancelled</span>
            <span className="ml-auto text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--f-green)]">
              <span ref={saved}>0 kr</span>
              <span className="text-[9px] font-medium"> saved a year</span>
            </span>
          </div>
        </div>
    </CaseFrame>
  );
}

function FigmaLogo() {
  return (
    <svg width="16" height="24" viewBox="0 0 38 57" aria-label="Figma" className="shrink-0">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1abcfe" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0acf83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#ff7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#f24e1e" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#a259ff" />
    </svg>
  );
}

/* a small illustrated person for avatars */
function Person({ bg, skin, hair, shirt, look = 0, size = 18 }: { bg: string; skin: string; hair: string; shirt: string; look?: 0 | 1 | 2; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="shrink-0" style={{ borderRadius: "50%" }}>
      <rect width="20" height="20" fill={bg} />
      {look === 1 && <path d="M4.6 9.2c0-4.4 2.3-6.4 5.4-6.4s5.4 2 5.4 6.4v6.6H4.6z" fill={hair} />}
      <ellipse cx="10" cy="21" rx="7.4" ry="5.6" fill={shirt} />
      <rect x="8.6" y="12" width="2.8" height="3.4" rx="1" fill={skin} />
      <circle cx="10" cy="9.3" r="4.1" fill={skin} />
      {look === 0 && <path d="M5.8 9.2C5.6 5.9 7.6 4.6 10 4.6s4.5 1.2 4.3 4.6c-.9-1.9-2.6-2.4-4.3-2.4S6.7 7.3 5.8 9.2z" fill={hair} />}
      {look === 1 && <path d="M5.8 9.4C5.8 6 7.6 4.8 10 4.8s4.2 1.2 4.2 4.6c-1.6-.4-3.4-1.4-4.2-2.6-.8 1.3-2.6 2.2-4.2 2.6z" fill={hair} />}
      {look === 2 && (
        <>
          <circle cx="10" cy="3.6" r="2.1" fill={hair} />
          <path d="M5.8 9.2C5.6 5.9 7.6 4.9 10 4.9s4.5 1 4.3 4.3c-1-1.6-2.6-2-4.3-2s-3.3.4-4.2 2z" fill={hair} />
        </>
      )}
    </svg>
  );
}
