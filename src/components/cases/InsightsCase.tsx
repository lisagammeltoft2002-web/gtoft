"use client";

import { useRef } from "react";
import type { CaseCopy } from "@/content/site";
import { CaseWords, Check, FilmStage, useFilm } from "./Film";

/* Actionable Insights, as a product video.
   The portal's overview; a notification slides in: "Save 14 400 kr a year" (closer). The
   cursor opens it: Figma, 6 seats nobody has opened in 60 days, the six people. "Ask them
   in Slack" (closer, click); the answers come back live: two still use it, four don't.
   "Cancel 4 licences" (closer, click); the four are cancelled and the saving counts up. */

const PEOPLE = [
  { name: "Anna Berg", days: 74, uses: false, p: { bg: "#dbe7f7", skin: "#f1c9a5", hair: "#6b4226", shirt: "#3a66ad", look: 1 as const } },
  { name: "Johan Lind", days: 91, uses: false, p: { bg: "#f6e3c4", skin: "#e8b48f", hair: "#2b2b2b", shirt: "#16915a", look: 0 as const } },
  { name: "Maja Ek", days: 63, uses: true, p: { bg: "#e4f1e2", skin: "#f3d2b6", hair: "#c48a3c", shirt: "#cf4058", look: 2 as const } },
  { name: "Sara Holm", days: 120, uses: false, p: { bg: "#f3dee6", skin: "#9c6a4a", hair: "#1d1612", shirt: "#f5d04f", look: 1 as const } },
  { name: "Omar Aziz", days: 67, uses: true, p: { bg: "#e5e1f6", skin: "#c58e66", hair: "#1d1612", shirt: "#264a87", look: 0 as const } },
  { name: "Lea Nyström", days: 88, uses: false, p: { bg: "#dff0f3", skin: "#f5d6c0", hair: "#e0b25a", shirt: "#687086", look: 2 as const } },
];
const ANSWER_ORDER = [1, 4, 0, 3, 2, 5];

// drawer on the window: x 250, y 40 → world (270, 54)
const ROW_TOP = 74, ROW_H = 24;
const BTN = [344, 301];

export function InsightsCase({ copy }: { copy: CaseCopy }) {
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

    k.start(300, 170, 1.08);
    k.cursorStart(250, 330);

    // 1. the notification arrives
    tl.fromTo(q("[data-badge]"), { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, 0.5);
    tl.fromTo(q("[data-toast]"), { autoAlpha: 0, x: 26 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 0.55);
    k.cam(455, 100, 2.25, 0.9, 1.1);

    // 2. open it
    k.cursor(470, 104, 1.8, 0.9);
    k.hover("[data-toast]", 2.6, { backgroundColor: "#fbfcfe", boxShadow: "0 0 0 1px var(--f-accent), 0 12px 28px -16px rgb(20 40 90 / 0.28)" });
    k.click("[data-toast]", 2.85);
    k.hide("[data-toast]", 3.1, 0.25);
    tl.to(q("[data-nav-insights]"), { backgroundColor: "#fff", color: "var(--f-ink)", boxShadow: "0 0 0 1px var(--f-line)", duration: 0.3 }, 3.1);
    tl.to(q("[data-nav-overview]"), { backgroundColor: "rgb(255 255 255 / 0)", color: "var(--f-grey)", boxShadow: "0 0 0 0px var(--f-line)", duration: 0.3 }, 3.1);
    tl.fromTo(q("[data-dim]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 3.1);
    tl.fromTo(q("[data-drawer]"), { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 3.15);
    k.cam(425, 222, 1.3, 3.1, 1.15);
    k.show("[data-row]", 3.6, { duration: 0.35 }, 0.07);
    tl.to(q("[data-cursor]"), { x: 470, y: 240, duration: 0.8, ease: "power2.inOut" }, 3.3);

    // 3. ask them in Slack
    k.cursor(BTN[0] + 6, BTN[1] + 3, 4.6, 0.85);
    k.cam(BTN[0] + 20, BTN[1] - 6, 2.4, 4.6, 1.05);
    k.hover("[data-btn]", 5.4);
    k.click("[data-btn]", 5.65);
    k.hide("[data-btn-ask]", 5.8, 0.15);
    k.show("[data-btn-asking]", 5.85, { y: 0, duration: 0.2 });
    tl.to(q("[data-btn]"), { backgroundColor: "var(--f-accent)", duration: 0.2 }, 5.85);

    // 4. answers arrive live
    k.cam(440, 192, 1.6, 6.05, 1.1);
    tl.to(q("[data-cursor]"), { x: 330, y: 330, duration: 0.9, ease: "power2.inOut" }, 6.1);
    k.show("[data-wait]", 6.0, { y: 0, duration: 0.25 }, 0.04);
    ANSWER_ORDER.forEach((i, n) => {
      const at = 6.9 + n * 0.38;
      tl.to(q(`[data-wait="${i}"]`), { autoAlpha: 0, duration: 0.12 }, at);
      tl.fromTo(q(`[data-answer="${i}"]`), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, at);
    });

    // 5. cancel the four
    k.hide("[data-btn-asking]", 9.25, 0.15);
    k.show("[data-btn-cancel]", 9.3, { y: 0, duration: 0.2 });
    k.cursor(BTN[0] + 8, BTN[1] + 3, 9.35, 0.85);
    k.cam(BTN[0] + 20, BTN[1] - 6, 2.4, 9.35, 1.0);
    k.hover("[data-btn]", 10.15);
    k.click("[data-btn]", 10.4);
    k.cam(425, 240, 1.3, 10.65, 1.15);
    let nth = 0;
    PEOPLE.forEach((p, i) => {
      if (p.uses) return;
      const at = 10.75 + nth++ * 0.1;
      tl.fromTo(q(`[data-strike="${i}"]`), { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.inOut" }, at);
      tl.to(q(`[data-person="${i}"]`), { opacity: 0.45, duration: 0.3 }, at);
      tl.to(q(`[data-answer="${i}"]`), { autoAlpha: 0, duration: 0.15 }, at);
      tl.fromTo(q(`[data-cancelled="${i}"]`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, at + 0.1);
    });
    k.hide("[data-btn]", 11.0, 0.25);
    k.show("[data-saved]", 11.1, { y: 8, duration: 0.5 });
    tl.to(money, { v: 9600, duration: 1.3, ease: "power2.out", onUpdate: render }, 11.2);
    tl.to(q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 11.3);
    k.metric(11.4);
    tl.set({}, {}, 13);

    return () => {
      money.v = 0;
      render();
    };
  });

  return (
    <article ref={ref} className="lin-tile film" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <FilmStage>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: 312 }}>
          {/* sidebar */}
          <div className="f-abs border-r border-[var(--f-line)] bg-[var(--f-side)]" style={{ left: 0, top: 0, width: 118, height: 312 }}>
            <p className="f-serif m-0 f-abs text-[15px] text-[color:var(--f-accent-deep)]" style={{ left: 14, top: 11 }}>
              velory
            </p>
            {["Overview", "People", "Devices", "Licences", "Insights"].map((n, i) => (
              <span
                key={n}
                {...(n === "Overview" ? { "data-nav-overview": "" } : n === "Insights" ? { "data-nav-insights": "" } : {})}
                className="f-abs flex items-center rounded-[6px] px-2 text-[9.5px]"
                style={{
                  left: 8,
                  top: 50 + i * 24,
                  width: 102,
                  height: 20,
                  color: n === "Overview" ? "var(--f-ink)" : "var(--f-grey)",
                  background: n === "Overview" ? "#fff" : "transparent",
                  boxShadow: n === "Overview" ? "0 0 0 1px var(--f-line)" : "none",
                }}
              >
                {n}
                {n === "Insights" && (
                  <span data-badge="" className="f-hidden ml-auto grid h-[13px] min-w-[13px] place-items-center rounded-full bg-[#f5d04f] px-1 text-[8px] font-semibold text-[#141b2c]">
                    1
                  </span>
                )}
              </span>
            ))}
            <span className="f-grey f-abs flex items-center gap-2 text-[9px]" style={{ left: 14, bottom: 14 }}>
              <Person bg="#3a66ad" skin="#f1c9a5" hair="#3b2a1e" shirt="#dfe8f7" look={1} size={18} />
              IT admin
            </span>
          </div>

          {/* top bar */}
          <div className="f-abs flex items-center border-b border-[var(--f-line)] px-4" style={{ left: 118, top: 0, width: 442, height: 40 }}>
            <span className="text-[12px] font-semibold">Overview</span>
            <span className="f-faint ml-auto mr-3 rounded-full bg-[var(--f-soft)] px-3 py-[3px] text-[9px]">Search people, devices…</span>
            <span className="relative">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2.2a4 4 0 0 0-4 4v2.6L2.8 11h10.4L12 8.8V6.2a4 4 0 0 0-4-4zM6.5 13a1.6 1.6 0 0 0 3 0" fill="none" stroke="var(--f-grey)" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <span data-badge="" className="f-hidden absolute -right-[2px] -top-[1px] h-[6px] w-[6px] rounded-full bg-[#f5d04f] ring-2 ring-white" />
            </span>
          </div>

          {/* overview content */}
          <div className="f-abs" style={{ left: 118, top: 40, width: 442, height: 272 }}>
            {[
              ["Devices", "412"],
              ["Licences", "1 286"],
              ["Spend / month", "318 k kr"],
            ].map(([l, v], i) => (
              <div key={l} className="f-abs rounded-[10px] border border-[var(--f-line)] px-3 py-2.5" style={{ left: 16 + i * 140, top: 16, width: 130, height: 62 }}>
                <p className="f-grey m-0 text-[9px]">{l}</p>
                <p className="m-0 mt-1.5 text-[17px] font-semibold tracking-[-0.02em]">{v}</p>
              </div>
            ))}
            <div className="f-abs rounded-[10px] border border-[var(--f-line)]" style={{ left: 16, top: 90, width: 410, height: 166 }}>
              <p className="f-grey m-0 f-abs text-[9px]" style={{ left: 12, top: 10 }}>
                Software spend, last 12 months
              </p>
              <svg className="f-abs" style={{ left: 12, top: 34 }} width="386" height="118" viewBox="0 0 386 118" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" x2="386" y1={8 + i * 34} y2={8 + i * 34} stroke="var(--f-line)" />
                ))}
                <path d="M0 92 C40 88 60 80 96 78 S150 70 190 60 S250 52 290 40 S350 26 386 20 L386 118 L0 118Z" fill="var(--f-accent-wash)" />
                <path d="M0 92 C40 88 60 80 96 78 S150 70 190 60 S250 52 290 40 S350 26 386 20" fill="none" stroke="var(--f-accent)" strokeWidth="1.6" />
              </svg>
            </div>
            <div data-dim="" className="f-abs f-hidden bg-[rgb(20_27_44/0.06)]" style={{ inset: 0 }} />
          </div>

          {/* the notification */}
          <div data-toast="" className="f-abs f-hidden flex items-center gap-2.5 rounded-[12px] border border-[var(--f-line)] bg-white px-3 shadow-[0_12px_28px_-16px_rgb(20_40_90/0.28)]" style={{ left: 330, top: 50, width: 220, height: 60 }}>
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[var(--f-green-wash)] text-[10px] font-semibold text-[color:var(--f-green)]">kr</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold">Save 14 400 kr a year</span>
              <span className="f-grey block text-[8.5px] leading-snug">6 Figma licences unused for 60+ days</span>
            </span>
            <span className="ml-auto text-[9px] font-medium text-[color:var(--f-accent)]">View</span>
          </div>

          {/* the insight, opened */}
          <div data-drawer="" className="f-abs f-hidden border-l border-[var(--f-line)] bg-white shadow-[-14px_0_34px_-26px_rgb(20_40_90/0.3)]" style={{ left: 250, top: 40, width: 310, height: 272 }}>
            <div className="f-abs flex items-center gap-2.5" style={{ left: 14, top: 12, right: 14 }}>
              <FigmaLogo />
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-semibold">Figma · 6 of 18 seats unused</p>
                <p className="f-grey m-0 text-[8.5px]">2 400 kr per seat a year · renews 1 April</p>
              </div>
            </div>
            <p className="f-grey m-0 f-abs text-[9px] leading-snug" style={{ left: 14, top: 46, right: 14 }}>
              Nobody below has opened Figma in 60 days. Ask before you cancel.
            </p>

            {PEOPLE.map((p, i) => (
              <div key={p.name} data-row="" className="f-abs f-hidden flex items-center gap-2 border-t border-[var(--f-line)]" style={{ left: 14, top: ROW_TOP + i * ROW_H, width: 282, height: ROW_H }}>
                <span data-person={i} className="flex items-center gap-2">
                  <Person {...p.p} />
                  <span className="text-[9.5px] font-medium" style={{ width: 62 }}>
                    <span className="relative">
                      {p.name}
                      {!p.uses && (
                        <span data-strike={i} className="absolute left-[-1px] right-[-1px] top-1/2 h-px origin-left scale-x-0 bg-[var(--f-ink)]" />
                      )}
                    </span>
                  </span>
                  <span className="f-faint text-[8.5px]">Last used {p.days} d ago</span>
                </span>
                <span className="ml-auto grid justify-items-end">
                  <span data-wait={i} className="f-faint f-hidden text-[8.5px] [grid-area:1/1]" style={{ lineHeight: "18px" }}>
                    Waiting…
                  </span>
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

            <span data-btn="" className="f-btn f-abs" style={{ left: 14, top: 235, height: 24, minWidth: 128, display: "grid" }}>
              <span data-btn-ask="" className="flex items-center justify-center gap-1.5 [grid-area:1/1]">
                <SlackMark /> Ask the 6 in Slack
              </span>
              <span data-btn-asking="" className="f-hidden flex items-center justify-center gap-1.5 [grid-area:1/1]">
                <svg className="f-spin" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M5 1a4 4 0 1 1-4 4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Asking in Slack…
              </span>
              <span data-btn-cancel="" className="f-hidden flex items-center justify-center [grid-area:1/1]">
                Cancel 4 licences
              </span>
            </span>

            <div data-saved="" className="f-abs f-hidden flex items-center gap-2 rounded-[10px] bg-[var(--f-green-wash)] px-3" style={{ left: 14, top: 230, width: 282, height: 34 }}>
              <span className="grid h-[16px] w-[16px] place-items-center rounded-full bg-[var(--f-green)] text-white">
                <Check />
              </span>
              <span className="text-[9.5px] font-medium text-[color:var(--f-green)]">4 licences cancelled</span>
              <span className="ml-auto text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--f-green)]">
                <span ref={saved}>0 kr</span>
                <span className="text-[9px] font-medium"> saved / year</span>
              </span>
            </div>
          </div>
        </div>
      </FilmStage>
      <CaseWords copy={copy} figureRef={figure} />
    </article>
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

function SlackMark() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="3.8" width="8" height="2.4" rx="1.2" fill="#fff" opacity="0.9" />
      <rect x="3.8" y="1" width="2.4" height="8" rx="1.2" fill="#fff" opacity="0.6" />
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
