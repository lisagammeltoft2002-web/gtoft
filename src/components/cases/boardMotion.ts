"use client";

/* The way into a case study and back out again, as one story:

   in   the case lifts a little, every other rectangle on the board is pushed away from it
        (each straight out from the case's middle, the nearest first) and fades, while the
        case grows on a soft spring until it fills the window.
   out  the page rewinds to its top, the window shrinks back into its case, and the other
        rectangles glide back in from where they were pushed, the nearest first.

   The case itself, its name and its arrow morph through React's <ViewTransition> (see
   CaseFrame). The rest of the board is moved here, by hand: Next keeps a page you leave alive
   in the background instead of removing it, so React never sees the board "leave" or "come
   back". Instead, just before the transition, each rectangle gets its own view-transition
   name and its own keyframes (pushed this far, in this direction, this much later). */

type Push = { x: number; y: number; near: number };

const STYLE_ID = "board-motion";
let pending: string | null = null;
let cleanup = 0;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* every other rectangle, and where it goes: straight out from the case's middle, far
   enough to leave */
function measure(slug: string) {
  const out: [HTMLElement, Push][] = [];
  const c = document.querySelector(`[data-case="${slug}"]`)?.getBoundingClientRect();
  if (!c || !c.width) return out;
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;
  const reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.42;
  const all = [...document.querySelectorAll<HTMLElement>("[data-push]")].filter((el) => el.dataset.case !== slug);
  const at = all.map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2 - cx, r.top + r.height / 2 - cy] as const;
  });
  const far = Math.max(1, ...at.map(([dx, dy]) => Math.hypot(dx, dy)));
  all.forEach((el, i) => {
    const [dx, dy] = at[i];
    const d = Math.hypot(dx, dy) || 1;
    out.push([el, { x: (dx / d) * reach, y: (dy / d) * reach, near: d / far }]);
  });
  return out;
}

const away = (p: Push) => `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(0.84)`;

/* name each rectangle and write its keyframes; everything is taken away again once the
   transition is over */
function stage(list: [HTMLElement, Push][], dir: "out" | "in") {
  window.clearTimeout(cleanup);
  clear();
  let css = "";
  list.forEach(([el, p], i) => {
    const name = `board-${i}`;
    el.style.viewTransitionName = name;
    el.dataset.vt = "";
    if (dir === "out") {
      css += `@keyframes ${name} { to { transform: ${away(p)}; opacity: 0; } }
::view-transition-old(${name}) { animation: ${name} 0.64s ${(40 + p.near * 110).toFixed(0)}ms cubic-bezier(0.5, 0, 0.75, 0.15) both; }
::view-transition-group(${name}) { animation: none; }\n`;
    } else {
      css += `@keyframes ${name} { from { transform: ${away(p)}; opacity: 0; } }
::view-transition-new(${name}) { animation: ${name} 0.9s ${(260 + p.near * 220).toFixed(0)}ms cubic-bezier(0.16, 1, 0.3, 1) both; }
::view-transition-group(${name}) { animation: none; }\n`;
    }
  });
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
  cleanup = window.setTimeout(clear, 2200);
}
function clear() {
  document.getElementById(STYLE_ID)?.remove();
  document.querySelectorAll<HTMLElement>("[data-vt]").forEach((el) => {
    el.style.viewTransitionName = "";
    delete el.dataset.vt;
  });
}

/** going in (call just before navigating): push the rest of the board away from this case */
export function openCase(slug: string) {
  pending = null;
  if (!reduced()) stage(measure(slug), "out");
}

/** going out (call just before navigating): the board will gather around this case again */
export function returnTo(slug: string) {
  pending = slug;
}

/** the board calls this as soon as it's laid out again (before the transition's new picture
    is taken): bring every rectangle back in from where it was pushed */
export function boardBack() {
  // the case that was opened is still lifted: put it down at once (no easing), so the
  // transition's picture of the board is exactly the board
  document.querySelectorAll<HTMLElement>(".is-lifting").forEach((el) => {
    el.style.transition = "none";
    el.classList.remove("is-lifting");
    void el.offsetWidth;
    el.style.transition = "";
  });
  const slug = pending;
  pending = null;
  if (slug && !reduced()) stage(measure(slug), "in");
}

/** rewind the page to its top (quickly, eased), so the case can shrink back from where it was */
export function toTop(): Promise<void> {
  const y0 = window.scrollY;
  if (y0 < 4 || reduced()) {
    window.scrollTo({ top: 0, behavior: "instant" });
    return Promise.resolve();
  }
  const ms = Math.min(720, 280 + y0 * 0.08);
  const t0 = performance.now();
  return new Promise((done) => {
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo({ top: y0 * (1 - e), behavior: "instant" });
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
}
