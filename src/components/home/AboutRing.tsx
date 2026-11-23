"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Glide, TUNE, driftPx } from "./rail/glide";

/* "A bit about me": one circle per thing about me, evenly spaced on a circle line. The
   whole ring lies tilted (leaning back, and a little to the left) and turns slowly round
   and round. It's as big as the screen allows: sized so everything the circles sweep
   through, seen through the tilt and perspective, just fits.

   Point at a circle (or tap it, or tab to it) and it lifts out of the ring: in one smooth
   move it stands up, turns to face you, glides to the middle and grows into the biggest
   circle the screen holds, while the ring behind it blurs and keeps turning. Move off it
   (or tap outside, or press Escape) and it sinks back into its place in the ring, wherever
   the ring has turned to by then. For now the circles are plain black. */

const TILT_X = 54; // deg, lean back
const TILT_Y = -14; // deg, and a little to the left
const DEPTH = 1600; // perspective, px
// square size, as a share of the ring's diameter. The squares all face the same way, so
// two neighbours come closest when they sit diagonally to each other: they'd touch at
// 1/√2 ≈ 71 % of the distance between their centres (the chord, sin(π/n) of the diameter).
// 65 % is as big as they get with a clear gap (about 9 % of a square) at that tightest moment
const dotShare = (n: number) => 0.65 * Math.sin(Math.PI / n);
const THICK = 4; // px: each circle is a thin solid disc this deep
const BEND = [0.04, 0.1]; // at the ring's left and right ends circles stretch along their way: at rest, + while spinning
const MARGIN = 0.05; // room left around the ring, as a share of the screen
const EDGE = 12; // px: the lifted circle fills the screen up to this close to its shorter sides
const LIFT_TILT = 0.15; // the lifted circle keeps this much of the ring's tilt, so it still reads as 3D
const BLUR = 14; // px, the ring behind a lifted circle

const rad = (d: number) => (d * Math.PI) / 180;

/* the on-screen box of everything the circles pass through, for a ring this wide (the
   circles lie in the tilted ring, so this is the ring's outer edge, through the tilt and
   the perspective) */
function sweptBox(ring: number, dot: number) {
  const r = ring / 2, h = (ring * dot) / 2; // the line, and half a square (squares stay straight, so their corners are always ±h, ±h)
  const [ax, ay] = [rad(TILT_X), rad(TILT_Y)];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < 96 * 4; k++) {
    const a = (Math.floor(k / 4) / 96) * Math.PI * 2;
    let x = r * Math.cos(a) + (k & 1 ? h : -h), y = r * Math.sin(a) + (k & 2 ? h : -h), z = 0;
    // rotateX then rotateY, as CSS applies them (the right one first)
    [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
    [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
    const s = DEPTH / (DEPTH - z);
    x0 = Math.min(x0, x * s); x1 = Math.max(x1, x * s);
    y0 = Math.min(y0, y * s); y1 = Math.max(y1, y * s);
  }
  return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/* the side of a circle: THICK thin discs stacked behind its face, one px apart, white turning
   frosted glass (see .about-ring-edge in globals.css) */
function Edge() {
  return (
    <>
      {Array.from({ length: THICK }, (_, k) => (
        <span key={k} className="about-ring-edge" style={{ "--k": k + 1 } as React.CSSProperties} aria-hidden="true" />
      ))}
    </>
  );
}

type Item = { id: string; label: string; node: React.ReactNode; flat?: boolean };

const noop = () => () => {};

export function AboutRing({ items }: { items: Item[] }) {
  const n = items.length;
  // which circles lift fully flat (no hint of tilt), e.g. one with words to read
  const flats = items.map((it) => (it.flat ? 1 : 0)).join("");
  /* each circle's content lives in its own box, rendered once and kept playing: it sits in
     its ring circle, and moves into the lifted circle (and back) when that circle lifts */
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  const [boxes] = useState(() =>
    typeof document === "undefined"
      ? []
      : items.map(() => {
          const d = document.createElement("div");
          d.className = "about-ring-content";
          return d;
        }),
  );
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLUListElement>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const el = ref.current, stage = stageRef.current, spin = spinRef.current, lift = liftRef.current, face = faceRef.current;
    if (!el || !stage || !spin || !lift || !face) return;
    const DOT = dotShare(n);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- size: the biggest ring that fits, moved to the middle */
    let ring = 0, shiftX = 0, shiftY = 0, big = 0;
    const fit = () => {
      const W = el.clientWidth, H = window.innerHeight;
      const m = Math.min(W, H) * MARGIN;
      let lo = 10, hi = 4000;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const b = sweptBox(mid, DOT);
        if (b.w <= W - 2 * m && b.h <= H - 2 * m) lo = mid;
        else hi = mid;
      }
      const b = sweptBox(lo, DOT);
      ring = lo;
      shiftX = -b.cx;
      shiftY = -b.cy;
      el.style.setProperty("--ring", `${ring}px`);
      el.style.setProperty("--dot", `${ring * DOT}px`);
      el.style.setProperty("--shift-x", `${shiftX}px`);
      el.style.setProperty("--shift-y", `${shiftY}px`);
      // what's inside a circle is laid out once, at the lifted circle's size, and shrunk to
      // fit the ring circles (so it never re-lays out while lifting)
      const vw = document.documentElement.clientWidth;
      big = Math.max(0, Math.min(vw, H) - EDGE * 2);
      el.style.setProperty("--content", `${big}px`);
      el.style.setProperty("--content-ui", String(Math.max(1, big / 380)));
      el.style.setProperty("--k-dot", String((ring * DOT) / big));
      drift(); // the drift speed depends on the ring's size
      draw();
    };

    /* ---- the turning ring, and the lifted circle drawn on top of it */
    /* the ring moves like the case row (rail/glide): a slow drift, grab and drag or swipe
       sideways to spin it, flick to throw it, and it settles with a circle at the front.
       Positions are in circles; one circle along the ring is this many px of dragging. */
    const glide = new Glide(1, still);
    const pitch = () => (Math.PI * ring) / n;
    let angle = 0; // the ring's turn, deg
    let open = -1; // which circle is lifted (or -1)
    const lifted = { p: 0 }; // 0 = in the ring, 1 = standing in the middle, full size
    let tween: gsap.core.Tween | null = null;
    const bends: number[] = new Array(n).fill(0);

    const draw = () => {
      el.style.setProperty("--speed", glide.speed.toFixed(3));
      spin.style.transform = `rotate(${angle}deg)`;
      spin.style.setProperty("--spin", angle.toFixed(3)); // what's inside the circles turns back by this, to stay upright
      // the bend: circles at the ring's left and right ends (where they swing towards you and
      // away) stretch a little along their way, more while the ring spins, like the case row's edges
      const pace = Math.min(1, glide.speed);
      for (let i = 0; i < n; i++) {
        const side = Math.abs(Math.sin(rad(angle + (360 / n) * i)));
        const u = Math.min(1, Math.max(0, (side - 0.7) / 0.3));
        bends[i] = u * u * (3 - 2 * u) * (BEND[0] + BEND[1] * pace);
        slotRefs.current[i]?.style.setProperty("--bend", bends[i].toFixed(4));
      }
      const p = lifted.p;
      stage.style.filter = p > 0.001 ? `blur(${(p * BLUR).toFixed(2)}px)` : "";
      stage.style.opacity = String(1 - p * 0.25);
      if (open < 0) return;
      // the lifted circle starts exactly where its ring circle is (same tilt, same place on
      // the line, same size) and ends upright, in the middle, as big as the screen allows
      const q = 1 - p;
      // the lifted circle lives on the screen, not in the section: as big as the visible
      // screen allows, in its middle, wherever the page is scrolled to
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      big = Math.max(0, Math.min(vw, vh) - EDGE * 2);
      lift.style.width = lift.style.height = `${big}px`;
      const r = el.getBoundingClientRect();
      const offX = r.left + r.width / 2 - vw / 2, offY = r.top + r.height / 2 - vh / 2;
      const theta = angle + (360 / n) * open;
      const tilt = q + p * (flats[open] === "1" ? 0 : LIFT_TILT); // all the ring's tilt at the start; once lifted a hint of it (none for flat ones)
      const dot = ring * DOT;
      lift.style.transform =
        `translate(${(offX + shiftX) * q}px, ${(offY + shiftY) * q}px) ` +
        `perspective(${DEPTH}px) rotateX(${TILT_X * tilt}deg) rotateY(${TILT_Y * tilt}deg) ` +
        // the circle lies in the ring; its content is turned back so it's upright, which is
        // also how the lifted circle carries it (a circle turned in its own plane looks the same)
        `rotate(${theta}deg) translateY(${(-ring / 2) * q}px) scaleX(${1 + bends[open] * q}) rotate(${-theta}deg) ` +
        `scale(${(dot + (big - dot) * p) / big})`;
    };

    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      glide.pitch = pitch();
      glide.tick(Math.max(0.001, dt));
      angle = ((glide.position * 360) / n) % 360;
      draw();
      raf = requestAnimationFrame(tick);
    };

    /* ---- lifting and putting back */
    // where the pointer is, and how the lifted circle is doing
    let px = -1, py = -1;
    let grown = false; // fully lifted: from now on the pointer can put it back
    let closing = false; // on its way back into the ring
    let wasInside = false;
    const fromMiddle = () => Math.hypot(px - document.documentElement.clientWidth / 2, py - window.innerHeight / 2);

    const show = (i: number) => {
      if (open === i) return;
      if (open >= 0) {
        dotRefs.current[open]?.classList.remove("is-lifted");
        dotRefs.current[open]?.appendChild(boxes[open]);
      }
      open = i;
      closing = false;
      face.appendChild(boxes[i]); // its content (still playing) goes with it
      grown = false;
      wasInside = false;
      dotRefs.current[i]?.classList.add("is-lifted");
      el.dataset.lifted = "";
      lift.style.visibility = "visible";
      tween?.kill();
      tween = gsap.to(lifted, {
        p: 1,
        duration: still ? 0 : 0.85,
        ease: "power3.inOut",
        onUpdate: draw,
        onComplete() {
          grown = true;
          lift.style.pointerEvents = "auto"; // what's inside can be pointed at now
          wasInside = fromMiddle() <= big / 2;
        },
      });
    };
    const hide = () => {
      if (open < 0) return;
      grown = false;
      closing = true;
      lift.style.pointerEvents = "";
      tween?.kill();
      tween = gsap.to(lifted, {
        p: 0,
        duration: still ? 0 : 0.7,
        ease: "power3.inOut",
        onUpdate: draw,
        onComplete() {
          dotRefs.current[open]?.classList.remove("is-lifted");
          dotRefs.current[open]?.appendChild(boxes[open]); // its content goes back with it
          open = -1;
          closing = false;
          delete el.dataset.lifted;
          lift.style.visibility = "hidden";
          draw();
          // if the pointer now rests on a circle, that one lifts next
          const under = document.elementFromPoint(px, py);
          const i = under ? dotRefs.current.findIndex((d) => d?.contains(under)) : -1;
          if (i >= 0 && !still) show(i);
        },
      });
    };

    // from one lifted circle straight to another: the first drops back into its place at
    // once, the next one lifts from the ring
    const swap = (j: number) => {
      tween?.kill();
      dotRefs.current[open]?.classList.remove("is-lifted");
      dotRefs.current[open]?.appendChild(boxes[open]);
      open = -1;
      lifted.p = 0;
      show(j);
    };

    // resting on a ring circle lifts it (a pointer just passing over on its way somewhere
    // else doesn't)
    let intent = 0;
    const enterDot = (e: Event) => {
      const i = dotRefs.current.indexOf(e.currentTarget as HTMLDivElement);
      if (i < 0 || open >= 0) return;
      window.clearTimeout(intent);
      intent = window.setTimeout(() => {
        if (open < 0 && pointer === null && dotRefs.current[i]?.contains(document.elementFromPoint(px, py))) show(i);
      }, 60);
    };
    const leaveDot = () => window.clearTimeout(intent);
    // once it has grown, it goes back when the pointer leaves the big circle, or, if the
    // pointer ended up outside it (a circle lifted from the far edge), when it moves away
    const move = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (open < 0 || e.pointerType === "touch") return;
      const under = document.elementFromPoint(px, py);
      const j = under ? dotRefs.current.findIndex((dd) => dd?.contains(under)) : -1;
      // on its way back, and the pointer lands on another circle: lift that one instead
      if (!grown && closing) {
        if (j >= 0 && j !== open) swap(j);
        return;
      }
      if (!grown) return;
      const d = fromMiddle();
      if (d <= big / 2) {
        wasInside = true;
        return;
      }
      // out on another ring circle: go straight to that one; out anywhere else after
      // being inside: put it back (if it was never entered, leaving the section does that)
      if (j >= 0 && j !== open) swap(j);
      else if (wasInside) hide();
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== "touch") hide();
    };
    // touch: tap a circle to lift it, tap anywhere to put it back
    const tap = (e: MouseEvent) => {
      const i = dotRefs.current.findIndex((d) => d?.contains(e.target as Node));
      if (open >= 0 && i < 0) hide();
      else if (i >= 0) show(i);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const focus = (e: FocusEvent) => {
      const i = dotRefs.current.indexOf(e.target as HTMLDivElement);
      if (i >= 0 && (e.target as HTMLElement).matches(":focus-visible")) show(i);
    };
    const blur = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) hide();
    };

    /* ---- spinning it by hand */
    let resting = true, restT = 0;
    // the ring drifts at the page's one pace: its circles move along the line as fast as the case row
    const drift = () => glide.drift(!resting && !document.hidden, driftPx() / pitch());
    const pause = (ms = 1000) => {
      resting = true;
      drift();
      window.clearTimeout(restT);
      restT = window.setTimeout(() => {
        resting = false;
        drift();
      }, ms);
    };
    let wheelT = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || open >= 0) return; // up/down scrolls the page
      e.preventDefault();
      pause();
      glide.wheel(-e.deltaX * (e.deltaMode === 1 ? 16 : 1));
      window.clearTimeout(wheelT);
      wheelT = window.setTimeout(() => glide.settle(), TUNE.wheelSettleMs);
    };
    let pointer: number | null = null, downX = 0, dragging = false;
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0) || open >= 0) return;
      pointer = e.pointerId;
      downX = e.clientX;
      dragging = false;
      // dragging right turns the front of the ring to the right
      glide.dragStart(-e.clientX, e.timeStamp);
      pause();
    };
    const dragMove = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      if (!dragging && Math.abs(e.clientX - downX) > TUNE.dragStartPx) {
        dragging = true;
        window.clearTimeout(intent);
        el.setPointerCapture(e.pointerId);
        el.dataset.dragging = "";
      }
      if (dragging) glide.dragMove(-e.clientX, e.timeStamp);
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      glide.dragEnd(e.timeStamp);
      pause();
      delete el.dataset.dragging;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      window.setTimeout(() => (dragging = false), 0);
    };
    const swallow = (e: MouseEvent) => {
      if (dragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const dots = dotRefs.current;
    dots.forEach((d) => {
      d?.addEventListener("pointerenter", enterDot);
      d?.addEventListener("pointerleave", leaveDot);
    });
    el.addEventListener("pointermove", move);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", dragMove);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", swallow, true);
    document.addEventListener("visibilitychange", drift);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("click", tap);
    el.addEventListener("keydown", key);
    el.addEventListener("focusin", focus);
    el.addEventListener("focusout", blur);
    window.addEventListener("resize", fit);
    // every circle's content starts in its ring circle
    boxes.forEach((box, i) => dotRefs.current[i]?.appendChild(box));
    fit();
    raf = requestAnimationFrame(tick);
    pause(600); // start drifting shortly after the page is ready

    return () => {
      cancelAnimationFrame(raf);
      tween?.kill();
      window.clearTimeout(intent);
      dots.forEach((d) => {
        d?.removeEventListener("pointerenter", enterDot);
        d?.removeEventListener("pointerleave", leaveDot);
      });
      el.removeEventListener("pointermove", move);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", dragMove);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", swallow, true);
      document.removeEventListener("visibilitychange", drift);
      window.clearTimeout(restT);
      window.clearTimeout(wheelT);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("click", tap);
      el.removeEventListener("keydown", key);
      el.removeEventListener("focusin", focus);
      el.removeEventListener("focusout", blur);
      window.removeEventListener("resize", fit);
    };
  }, [n, boxes, flats]);

  return (
    <section ref={ref} className="about-ring" aria-label="A bit about me">
      <div ref={stageRef} className="about-ring-stage">
        <div className="about-ring-tilt">
          <ul ref={spinRef} className="about-ring-spin" style={{ "--n": n } as React.CSSProperties}>
            {items.map((it, i) => (
              <li
                key={it.id}
                ref={(li) => {
                  slotRefs.current[i] = li;
                }}
                className="about-ring-slot"
                style={{ "--i": i } as React.CSSProperties}
              >
                <Edge />
                <div
                  role="button"
                  tabIndex={0}
                  ref={(b) => {
                    dotRefs.current[i] = b;
                  }}
                  className="about-ring-dot"
                  aria-label={it.label}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* the circle that lifts out of the ring */}
      <div ref={liftRef} className="about-ring-lift" aria-hidden="true">
        <Edge />
        <div ref={faceRef} className="about-ring-face" />
      </div>
      {onClient && boxes.map((box, i) => createPortal(items[i].node, box, items[i].id))}
    </section>
  );
}
