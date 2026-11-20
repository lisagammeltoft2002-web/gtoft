"use client";

import type { CaseCopy } from "@/content/site";
import { CaseWords, Check, FilmStage, useFilm } from "./Film";

/* velory.com, as a product video: a visitor goes from the headline to a booked demo.
   Close on the hero, "Someone left. Licences stayed." The cursor clicks "See how" (closer);
   the camera pulls back and the page scrolls past the proof and the platform to "Try it".
   Closer on the form with its one field: an email types in, the round button is pressed,
   and the demo is booked. All the way out. */

const SCROLL_END = 560;
// world y of a page y once the page has scrolled to the end
const endY = (p: number) => 44 + p - SCROLL_END;
const FIELD = [250, endY(685)];
const GO = [413, endY(685)];

export function VeloryComCase({ copy }: { copy: CaseCopy }) {
  const { ref, handlers } = useFilm((k) => {
    const { tl, q } = k;
    k.start(195, 182, 1.6);
    k.cursorStart(300, 330);

    // 1. the hero, then "See how"
    tl.fromTo(q("[data-check]"), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.18, ease: "back.out(2.5)", immediateRender: false }, 0.4);
    k.cursor(80, 266, 0.9, 0.9);
    k.cam(135, 245, 2.5, 0.95, 1.05);
    k.hover("[data-seehow]", 1.75);
    k.click("[data-seehow]", 2.0);

    // 2. out, and the page scrolls to "Try it"
    k.cam(300, 172, 1, 2.3, 1.1);
    tl.to(q("[data-cursor]"), { x: 470, y: 230, duration: 0.9, ease: "power2.inOut" }, 2.35);
    tl.to(q("[data-page]"), { y: -250, duration: 1.1, ease: "power3.inOut" }, 2.55);
    tl.to(q("[data-page]"), { y: -SCROLL_END, duration: 1.1, ease: "power3.inOut" }, 4.0);

    // 3. closer on the form: one field, type, send
    k.cam(300, 168, 1.95, 5.05, 1.1);
    k.cursor(FIELD[0], FIELD[1] + 3, 5.2, 0.85);
    k.click(null, 6.1);
    tl.to(q("[data-field]"), { boxShadow: "0 0 0 1.5px var(--f-accent), 0 6px 18px -8px rgb(20 40 90 / 0.3)", duration: 0.2 }, 6.15);
    k.hide("[data-field-ph]", 6.15, 0.1);
    tl.fromTo(q("[data-caret]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 6.15);
    k.type("[data-email]", "anna@acme.se", 6.3, 0.85);
    k.cursor(GO[0] + 3, GO[1] + 3, 7.2, 0.6);
    k.cam(GO[0] - 50, GO[1] + 8, 2.7, 7.15, 0.85);
    k.hover("[data-go]", 7.8, { scale: 1.1 });
    k.click("[data-go]", 8.05);
    k.hide("[data-caret]", 8.1, 0.01);
    k.hide("[data-go-arrow]", 8.15, 0.12);
    tl.fromTo(q("[data-go-spin]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 8.2);
    tl.to(q("[data-go-spin]"), { autoAlpha: 0, duration: 0.1 }, 8.85);
    tl.to(q("[data-go]"), { backgroundColor: "var(--f-green)", scale: 1, duration: 0.25 }, 8.85);
    tl.fromTo(q("[data-go-done]"), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, 8.9);

    // 4. booked
    k.cam(300, 175, 1.85, 9.0, 1.0);
    tl.to(q("[data-cursor]"), { x: 470, y: 300, duration: 0.8, ease: "power2.inOut" }, 9.0);
    k.show("[data-booked]", 9.2, { y: 10, scale: 0.96, duration: 0.5 });
    k.cam(300, 172, 1.02, 10.6, 1.2);
    tl.to(q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 10.7);
    k.metric(11.0);
    tl.set({}, {}, 12.2);
  });

  return (
    <article ref={ref} className="lin-tile film" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <FilmStage>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: 312 }}>
          {/* browser bar */}
          <div className="f-abs z-10 flex items-center gap-1.5 border-b border-[var(--f-line)] bg-[var(--f-soft)] px-3" style={{ left: 0, top: 0, width: 560, height: 30 }}>
            {["#f0b4ad", "#f3d79a", "#b8dcb0"].map((c) => (
              <span key={c} className="block h-[8px] w-[8px] rounded-full" style={{ background: c }} />
            ))}
            <span className="f-grey mx-auto flex items-center gap-1 rounded-[6px] bg-white px-14 py-[3px] text-[9.5px] shadow-[0_0_0_1px_var(--f-line)]">
              <svg width="7" height="8" viewBox="0 0 7 8" aria-hidden="true">
                <rect x="0.5" y="3.3" width="6" height="4.2" rx="1" fill="var(--f-faint)" />
                <path d="M1.8 3.4V2.4a1.7 1.7 0 0 1 3.4 0v1" fill="none" stroke="var(--f-faint)" strokeWidth="0.9" />
              </svg>
              velory.com
            </span>
          </div>

          {/* the page, scrolled by the film */}
          <div className="f-abs overflow-hidden" style={{ left: 0, top: 30, width: 560, height: 282 }}>
            <div data-page="" className="f-abs" style={{ left: 0, top: 0, width: 560, height: 842 }}>
              {/* nav */}
              <div className="f-abs flex items-center" style={{ left: 24, top: 0, right: 24, height: 40 }}>
                <span className="f-serif text-[16px] text-[color:var(--f-accent-deep)]">velory</span>
                <span className="f-grey ml-10 flex gap-5 text-[9.5px]">
                  <span>Product</span>
                  <span>Customers</span>
                  <span>Pricing</span>
                </span>
                <span className="f-btn ml-auto" style={{ height: 22 }}>
                  Book a demo
                </span>
              </div>

              {/* hero */}
              <p className="f-abs m-0 text-[8px] font-semibold tracking-[0.14em] text-[color:var(--f-accent)]" style={{ left: 24, top: 66 }}>
                IT LIFECYCLE FOR GROWING TEAMS
              </p>
              <p className="f-serif f-abs m-0 text-[31px] leading-[1.04] text-[color:var(--f-accent-deep)]" style={{ left: 24, top: 84, width: 290 }}>
                Someone left.
                <br />
                Licences stayed.
              </p>
              <p className="f-grey f-abs m-0 text-[10px] leading-[1.45]" style={{ left: 24, top: 160, width: 250 }}>
                Velory finds every laptop, licence and login when people join, move or leave, and takes care of it.
              </p>
              <div className="f-abs flex gap-2" style={{ left: 24, top: 206 }}>
                <span data-seehow="" className="f-btn" style={{ height: 26, padding: "0 14px" }}>
                  See how
                </span>
                <span className="f-btn f-ghost" style={{ height: 26, padding: "0 14px" }}>
                  Book a demo
                </span>
              </div>
              <div className="f-abs rounded-[12px] border border-[var(--f-line)] bg-white p-3 shadow-[0_14px_30px_-20px_rgb(20_40_90/0.22)]" style={{ left: 322, top: 62, width: 214, height: 176 }}>
                <p className="m-0 text-[10px] font-semibold">Offboarding · Anna Berg</p>
                <p className="f-grey m-0 mt-0.5 text-[8.5px]">Last day Friday · 4 of 4 done</p>
                {["MacBook Pro · return booked", "Figma · licence cancelled", "Slack · access removed", "Google · account archived"].map((t) => (
                  <div key={t} className="mt-2 flex items-center gap-2 rounded-[7px] bg-[var(--f-soft)] px-2 text-[9px]" style={{ height: 24 }}>
                    <span data-check="" className="grid h-[13px] w-[13px] place-items-center rounded-full bg-[var(--f-green)] text-white">
                      <Check />
                    </span>
                    {t}
                  </div>
                ))}
              </div>

              {/* proof */}
              <p className="f-grey f-abs m-0 w-full text-center text-[9.5px]" style={{ left: 0, top: 296 }}>
                Trusted by IT teams across the Nordics
              </p>
              <div className="f-abs flex w-full justify-center gap-9 text-[13px] font-semibold tracking-[-0.02em] text-[#b6bdcb]" style={{ left: 0, top: 322 }}>
                <span>Northwind</span>
                <span className="f-serif">Fjordly</span>
                <span>KANTO</span>
                <span className="f-serif">lumen</span>
                <span>brisk.</span>
              </div>

              {/* platform */}
              <p className="f-serif f-abs m-0 w-full text-center text-[19px] text-[color:var(--f-accent-deep)]" style={{ left: 0, top: 388 }}>
                One place for every join, move and leave
              </p>
              {[
                ["Join", "Laptop, apps and access ready on day one."],
                ["Move", "New team, new tools. Old ones cleaned up."],
                ["Leave", "Hardware back, licences cancelled, nothing left open."],
              ].map(([h, t], i) => (
                <div key={h} className="f-abs rounded-[12px] border border-[var(--f-line)] p-3" style={{ left: 24 + i * 174, top: 430, width: 164, height: 96 }}>
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] bg-[var(--f-accent-wash)] text-[10px] font-semibold text-[color:var(--f-accent)]">{i + 1}</span>
                  <p className="m-0 mt-2 text-[11px] font-semibold">{h}</p>
                  <p className="f-grey m-0 mt-0.5 text-[9px] leading-snug">{t}</p>
                </div>
              ))}

              {/* try it */}
              <div className="f-abs bg-[var(--f-accent-wash)]" style={{ left: 0, top: 560, width: 560, height: 282 }} />
              <p className="f-serif f-abs m-0 w-full text-center text-[24px] text-[color:var(--f-accent-deep)]" style={{ left: 0, top: 598 }}>
                See it on your own setup
              </p>
              <p className="f-grey f-abs m-0 w-full text-center text-[10px]" style={{ left: 0, top: 636 }}>
                One field. We’ll do the rest.
              </p>
              <div data-field="" className="f-abs flex items-center rounded-full bg-white pl-4 pr-1 shadow-[0_0_0_1px_var(--f-line),0_6px_18px_-8px_rgb(20_40_90/0.25)]" style={{ left: 150, top: 668, width: 260, height: 34 }}>
                <span className="relative flex-1 text-[10.5px]">
                  <span data-field-ph="" className="f-faint absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap">
                    Work email
                  </span>
                  <span data-email="" />
                  <span data-caret="" className="f-caret f-hidden" />
                </span>
                <span data-go="" className="f-round relative" style={{ width: 26, height: 26 }}>
                  <svg data-go-arrow="" width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="[grid-area:1/1]">
                    <path d="M2 6h7.8M6.4 2.5 9.9 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg data-go-spin="" className="f-spin f-hidden [grid-area:1/1]" width="11" height="11" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M5 1a4 4 0 1 1-4 4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span data-go-done="" className="f-hidden grid scale-[1.3] place-items-center [grid-area:1/1]">
                    <Check />
                  </span>
                </span>
              </div>
              <div data-booked="" className="f-abs f-hidden flex items-center gap-2.5 rounded-[12px] bg-white px-3 shadow-[0_0_0_1px_var(--f-line),0_12px_28px_-18px_rgb(20_40_90/0.25)]" style={{ left: 170, top: 716, width: 220, height: 42 }}>
                <span className="grid h-[26px] w-[24px] shrink-0 overflow-hidden rounded-[5px] border border-[var(--f-line)] text-center">
                  <span className="block bg-[var(--f-red)] text-[6px] font-semibold leading-[8px] text-white">TUE</span>
                  <span className="block text-[11px] font-semibold leading-[16px]">14</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[10.5px] font-semibold">Demo booked · Tue 10:00</span>
                  <span className="f-grey block text-[8.5px]">Invite sent to anna@acme.se</span>
                </span>
                <span className="ml-auto grid h-[16px] w-[16px] place-items-center rounded-full bg-[var(--f-green)] text-white">
                  <Check />
                </span>
              </div>
            </div>
          </div>
        </div>
      </FilmStage>
      <CaseWords copy={copy} />
    </article>
  );
}
