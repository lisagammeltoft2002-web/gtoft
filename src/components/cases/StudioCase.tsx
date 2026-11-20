"use client";

import type { CaseCopy } from "@/content/site";
import { CaseWords, Check, FilmStage, useFilm } from "./Film";

/* Velory Studio, as a product video.
   Close on the composer: a prompt types itself, the @Brand kit tag snaps in. The cursor
   finds the round send button (closer), presses it; the camera pulls back to the chat:
   the message lands, the AI thinks, answers that the banner is ready. Wider again: the
   banner builds on the canvas. The cursor goes to "Send to LinkedIn" (closer), clicks:
   posted. All the way out, and the hours saved. */

const PROMPT = "Create a LinkedIn banner for our spring webinar, Offboarding without the chaos, in ";

// the window sits at (20, 14) in the world; world points for the camera and cursor
const SEND = [222, 291];
const LINKEDIN = [500, 255];

export function StudioCase({ copy }: { copy: CaseCopy }) {
  const { ref, handlers } = useFilm((k) => {
    const { tl } = k;
    k.start(140, 256, 2.0);
    k.cursorStart(330, 345);

    // 1. the prompt types itself
    k.hide("[data-placeholder]", 0.35, 0.15);
    k.type("[data-prompt]", PROMPT, 0.45, 2.3);
    tl.fromTo(k.q("[data-tag]"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, 2.8);

    // 2. to the send button, closer, press
    k.cursor(SEND[0] + 2, SEND[1] + 2, 3.2, 0.9);
    k.cam(SEND[0] - 70, SEND[1] - 30, 2.15, 3.25, 1.05);
    k.hover("[data-send]", 4.05, { scale: 1.08 });
    k.click("[data-send]", 4.35);

    // 3. the chat: message lands, AI thinks, replies
    k.cam(150, 175, 1.55, 4.7, 1.15);
    k.hide("[data-prompt-line]", 4.6, 0.2);
    tl.to(k.q("[data-placeholder]"), { autoAlpha: 1, duration: 0.3 }, 4.9);
    tl.to(k.q("[data-send]"), { backgroundColor: "var(--f-accent)", scale: 1, duration: 0.2 }, 4.7);
    tl.to(k.q("[data-cursor]"), { x: 300, y: 300, duration: 0.9, ease: "power2.inOut" }, 4.7);
    k.show("[data-msg]", 4.75, { y: 14, duration: 0.55 });
    k.show("[data-ai]", 5.3);
    tl.fromTo(
      k.q("[data-think-dot]"),
      { opacity: 0.25 },
      { opacity: 1, duration: 0.25, stagger: 0.12, repeat: 4, yoyo: true, ease: "sine.inOut", immediateRender: false },
      5.4,
    );
    k.hide("[data-thinking]", 6.95, 0.15);
    k.show("[data-reply]", 7.15, { duration: 0.4 });

    // 4. out: the banner builds on the canvas
    k.cam(300, 170, 1, 7.6, 1.25);
    k.show("[data-banner]", 7.9, { y: 10, scale: 0.97, duration: 0.6 });
    tl.fromTo(k.q("[data-banner-bg]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power3.inOut" }, 8.0);
    k.show("[data-banner-part]", 8.45, { y: 8, duration: 0.45 }, 0.09);
    k.show("[data-banner-foot]", 8.9);

    // 5. Send to LinkedIn, closer, click, posted
    k.cursor(LINKEDIN[0] + 4, LINKEDIN[1] + 3, 9.5, 0.95);
    k.cam(LINKEDIN[0] - 60, LINKEDIN[1] - 45, 2.0, 9.55, 1.1);
    k.hover("[data-li]", 10.4, { boxShadow: "inset 0 0 0 1px #0a66c2", backgroundColor: "#f2f7fc" });
    k.click("[data-li]", 10.65);
    k.hide("[data-li-label]", 10.8, 0.15);
    k.show("[data-li-done]", 10.9, { y: 0, duration: 0.3 });
    tl.to(k.q("[data-li]"), { backgroundColor: "var(--f-green-wash)", boxShadow: "inset 0 0 0 1px var(--f-green-wash)", duration: 0.3 }, 10.9);

    // 6. all the way out
    k.cam(300, 172, 1.02, 11.5, 1.2);
    tl.to(k.q("[data-cursor]"), { autoAlpha: 0, duration: 0.3 }, 11.7);
    k.metric(12.1);
    tl.set({}, {}, 12.8);
  });

  return (
    <article ref={ref} className="lin-tile film" aria-label={`${copy.title}: ${copy.role}`} {...handlers}>
      <FilmStage>
        <div className="f-win" style={{ left: 20, top: 14, width: 560, height: 312 }}>
          {/* chat */}
          <div className="f-abs border-r border-[var(--f-line)]" style={{ left: 0, top: 0, width: 236, height: 312 }}>
            <div data-msg="" className="f-abs f-hidden rounded-[12px] rounded-br-[4px] bg-[var(--f-accent)] px-2.5 py-2 text-[9.5px] leading-[1.4] text-white" style={{ right: 12, top: 48, width: 178 }}>
              {PROMPT}
              <span className="rounded-full bg-white/20 px-1.5 py-[1px]">@Brand kit</span>
            </div>

            <div data-ai="" className="f-abs f-hidden flex items-start gap-2" style={{ left: 12, top: 120, width: 212 }}>
              <span className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full bg-[var(--f-accent-wash)]">
                <Spark />
              </span>
              <div className="relative grid min-w-0 flex-1">
                <span data-thinking="" className="f-grey flex items-center gap-1 pt-[3px] text-[9.5px] [grid-area:1/1]">
                  Thinking
                  {[0, 1, 2].map((i) => (
                    <span key={i} data-think-dot="" className="inline-block h-[3px] w-[3px] rounded-full bg-[var(--f-grey)]" />
                  ))}
                </span>
                <div data-reply="" className="f-hidden rounded-[12px] rounded-tl-[4px] bg-[var(--f-soft)] px-2.5 py-2 text-[9.5px] leading-[1.45] [grid-area:1/1]">
                  Your banner is ready, on brand.
                </div>
              </div>
            </div>

            {/* composer */}
            <div className="f-abs rounded-[14px] border border-[var(--f-line)] bg-white shadow-[0_6px_18px_-12px_rgb(20_40_90/0.18)]" style={{ left: 12, top: 198, width: 212, height: 100 }}>
              <div className="f-abs text-[10px] leading-[1.42]" style={{ left: 11, top: 9, right: 11 }}>
                <span data-placeholder="" className="f-faint f-abs left-0 top-0 whitespace-nowrap">
                  Describe what you need…
                </span>
                <span data-prompt-line="">
                  <span data-prompt="" />
                  <span data-tag="" className="f-hidden inline-block rounded-full bg-[var(--f-accent-wash)] px-1.5 text-[9.5px] font-medium text-[color:var(--f-accent)]">
                    @Brand kit
                  </span>
                </span>
              </div>
              <div className="f-abs flex items-center gap-1.5" style={{ left: 9, bottom: 9, right: 9 }}>
                <span data-send="" className="f-round ml-auto" style={{ width: 26, height: 26 }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M6 10V2.2M2.5 5.6 6 2.1l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* canvas */}
          <div className="f-abs f-dots bg-[var(--f-soft)]" style={{ left: 236, top: 0, width: 324, height: 312 }}>
            <div data-banner="" className="f-abs f-hidden overflow-hidden rounded-[8px] shadow-[0_10px_26px_-16px_rgb(20_40_90/0.3)]" style={{ left: 26, top: 74, width: 272, height: 142 }}>
              <div data-banner-bg="" className="absolute inset-0" style={{ background: "linear-gradient(120deg, #1f3f78 0%, #3a66ad 70%, #5b8bd0 100%)" }} />
              <svg data-banner-part="" className="f-hidden absolute" style={{ right: 14, top: 22 }} width="104" height="98" viewBox="0 0 104 98" aria-hidden="true">
                <circle cx="70" cy="32" r="24" fill="#f5d04f" />
                <rect x="8" y="44" width="80" height="48" rx="5" fill="#dfe8f7" />
                <rect x="14" y="50" width="68" height="36" rx="2" fill="#b0c7e8" />
                <path d="M28 70h16M28 76h28" stroke="#3a66ad" strokeWidth="3" strokeLinecap="round" />
                <path d="M62 62l6 6 10-11" fill="none" stroke="#16915a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="0" y="90" width="96" height="5" rx="2.5" fill="#dfe8f7" />
              </svg>
              <div className="absolute text-white" style={{ left: 16, top: 16, width: 150 }}>
                <p data-banner-part="" className="f-hidden m-0 text-[7px] font-medium tracking-[0.12em] opacity-80">
                  LIVE WEBINAR · 12 MARCH
                </p>
                <p data-banner-part="" className="f-hidden f-serif m-0 mt-1.5 text-[17px] leading-[1.05]">
                  Offboarding without the chaos
                </p>
                <span data-banner-part="" className="f-hidden mt-2.5 inline-block rounded-full bg-white px-2 py-[3px] text-[7.5px] font-medium text-[#264a87]">
                  Save your seat
                </span>
              </div>
              <span data-banner-part="" className="f-hidden f-serif absolute text-[10px] text-white" style={{ left: 16, bottom: 10 }}>
                velory
              </span>
            </div>

            <div data-banner-foot="" className="f-abs f-hidden flex items-center" style={{ left: 26, top: 226, width: 272 }}>
              <span className="f-grey text-[9px]">Banner · 1200 × 627</span>
              <span data-li="" className="f-btn f-ghost ml-auto" style={{ height: 26, gap: 6 }}>
                <span className="grid h-[13px] w-[13px] place-items-center rounded-[3px] bg-[#0a66c2] text-[8px] font-bold leading-none text-white">in</span>
                <span className="grid">
                  <span data-li-label="" className="[grid-area:1/1]">
                    Send to LinkedIn
                  </span>
                  <span data-li-done="" className="f-hidden flex items-center gap-1 text-[color:var(--f-green)] [grid-area:1/1]">
                    <Check /> Posted
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </FilmStage>
      <CaseWords copy={copy} />
    </article>
  );
}

function Spark() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 .8 7.3 4.7 11.2 6 7.3 7.3 6 11.2 4.7 7.3.8 6l3.9-1.3z" fill="var(--f-accent)" />
    </svg>
  );
}
