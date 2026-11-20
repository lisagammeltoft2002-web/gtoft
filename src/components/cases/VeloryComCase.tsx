"use client";

import type { CaseCopy } from "@/content/site";
import { CaseFrame, Check, useFilm } from "./Film";

/* velory.com, as a short teaser: someone looks it up and the site scrolls by.
   A new browser tab, its search field empty. The cursor clicks it, types velory.com and
   presses enter; the site loads and scrolls from the problem-first hero, past the proof and
   the platform, to "Try it". The browser bar stays at the top the whole time. */

const SCROLL_END = 560;
const FIELD = [300, 156]; // the new tab's search field, in the world

export function VeloryComCase({ copy, hero = false }: { copy: CaseCopy; hero?: boolean }) {
  const { ref, handlers } = useFilm((k) => {
    const { tl, q } = k;
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

    // 2. enter: the site loads
    k.hide("[data-caret]", 2.2, 0.01);
    tl.to(q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 2.25);
    tl.fromTo(q("[data-load]"), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 2.2).to(q("[data-load]"), { autoAlpha: 0, duration: 0.2 }, 2.8);
    k.show("[data-addr]", 2.3, { y: 0, duration: 0.3 });
    k.cam(300, 0, 1, 2.1, 1.0);
    k.hide("[data-newtab]", 2.3, 0.25);
    k.show("[data-site]", 2.5, { y: 8, duration: 0.6 });
    tl.fromTo(q("[data-check]"), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.15, ease: "back.out(2.5)", immediateRender: false }, 3.0);

    // 3. the whole site scrolls by, with a breath at each part
    tl.to(q("[data-page]"), { y: -270, duration: 1.5, ease: "power2.inOut" }, 4.2);
    tl.to(q("[data-page]"), { y: -SCROLL_END, duration: 1.5, ease: "power2.inOut" }, 6.3);
    k.done(7.9);
    tl.set({}, {}, 9.2);
  }, { auto: hero });

  return (
    <CaseFrame slug="velory-com" copy={copy} hero={hero} frameRef={ref} handlers={handlers}>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: 312 }}>
          {/* browser bar, full width at the top */}
          <div className="f-abs z-10 flex items-center gap-3 border-b border-[var(--f-line)] bg-[var(--f-soft)] px-3" style={{ left: 0, top: 0, width: 560, height: 36 }}>
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
            <span className="block h-[20px] w-[20px] rounded-full bg-[var(--f-accent-wash)]" />
            {/* the page loading */}
            <span data-load="" className="absolute bottom-[-1px] left-0 h-[1.5px] w-full origin-left bg-[var(--f-accent)] opacity-0" />
          </div>

          {/* a new tab: one search field */}
          <div data-newtab="" className="f-abs grid place-items-center" style={{ left: 0, top: 36, width: 560, height: 276 }}>
            <span data-field="" className="flex items-center gap-2 rounded-full bg-white px-4 text-[11px] shadow-[0_0_0_1px_var(--f-line),0_8px_20px_-14px_rgb(20_40_90/0.25)]" style={{ width: 300, height: 34, marginTop: -36 }}>
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

          {/* the page, scrolled by the film */}
          <div data-site="" className="f-abs f-hidden overflow-hidden" style={{ left: 0, top: 36, width: 560, height: 276 }}>
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
                <span className="f-btn" style={{ height: 26, padding: "0 14px" }}>
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
              <p className="f-serif f-abs m-0 w-full text-center text-[24px] text-[color:var(--f-accent-deep)]" style={{ left: 0, top: 628 }}>
                See it on your own setup
              </p>
              <p className="f-grey f-abs m-0 w-full text-center text-[10px]" style={{ left: 0, top: 666 }}>
                One field. We’ll do the rest.
              </p>
              <div className="f-abs flex items-center rounded-full bg-white pl-4 pr-1 shadow-[0_0_0_1px_var(--f-line),0_6px_18px_-8px_rgb(20_40_90/0.25)]" style={{ left: 150, top: 698, width: 260, height: 34 }}>
                <span className="f-faint flex-1 text-[10.5px]">Work email</span>
                <span className="f-round" style={{ width: 26, height: 26 }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 6h7.8M6.4 2.5 9.9 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
    </CaseFrame>
  );
}
