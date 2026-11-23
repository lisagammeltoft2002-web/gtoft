"use client";

import { useLayoutEffect, useRef } from "react";
import { boardBack } from "../cases/boardMotion";
import { Glide, TUNE, around, driftPx } from "./rail/glide";
import { EDGE, createEdgeGl, type EdgeGl } from "./rail/edgeGl";

/* The three case studies on one endless row (see rail/glide for how it moves and
   rail/edgeGl for the bent edges).

   Each step along the row is half the screen, so three cards always fill it: a card only
   wraps to the other end while it's out of sight. The real cards (live films you can hover)
   own the middle of the screen; towards the edges they fade into a WebGL drawing of the
   same cards (their resting frames), which bends, flares and smears like the rim of a glass,
   further while the row is moving. Every card keeps the same shape on every screen and
   scales as a whole, so the drawing always lines up with the real card. */

const ASPECT = 0.625; // card height / width (16:10)
const DESIGN_W = 711; // the card width the resting frames were captured at (ui = 1)
const GAP = 24;
const COMPACT = 640;

type Item = { id: string; node: React.ReactNode; poster: string };

export function CaseRail({ items }: { items: Item[] }) {
  const n = items.length;
  const railRef = useRef<HTMLElement>(null);
  const glRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posters = items.map((i) => i.poster).join("|");

  // back from a case: the other cards glide in again
  useLayoutEffect(boardBack, []);

  useLayoutEffect(() => {
    const rail = railRef.current, host = glRef.current;
    if (!rail || !host) return;
    const cards = cardRefs.current;
    const pictures = posters.split("|");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---- sizes */
    let W = 0, pitch = 0, cardW = 0, cardH = 0, glH = 0;
    const measure = () => {
      W = rail.clientWidth;
      const compact = W < COMPACT;
      const gap = compact ? 16 : GAP;
      // half a screen per step fills the row; with the bent edges a little less is enough
      // (they only show the row up to ~90 % of the way out), so short screens keep tight gaps
      const most = compact ? W * 0.84 : W / 2;
      const least = compact ? most : W * 0.46;
      cardW = Math.min(most - gap, (rail.clientHeight || 400) / ASPECT);
      pitch = Math.max(least, cardW + gap);
      cardH = cardW * ASPECT;
      glH = cardH * EDGE.heightFactor;
      rail.style.setProperty("--card-w", `${cardW}px`);
      rail.style.setProperty("--card-h", `${cardH}px`);
      rail.style.setProperty("--gl-h", `${glH}px`);
      rail.style.setProperty("--ui", String(cardW / DESIGN_W));
    };
    measure();

    const glide = new Glide(pitch, still.matches);

    /* ---- the drawn edges (only with real graphics hardware; otherwise plain cards) */
    let gl: EdgeGl | null = null;
    let glOn = false;
    let disposed = false;
    const glOff = () => {
      glOn = false;
      gl?.dispose();
      gl = null;
      host.style.visibility = "hidden";
      mask(0, true);
    };
    const layoutGl = () => gl?.resize({ width: W, height: glH, cardW, cardH });
    const startGl = async () => {
      if (still.matches || typeof WebGL2RenderingContext === "undefined") return;
      try {
        const made = createEdgeGl(host, pictures, glOff);
        gl = made;
        layoutGl();
        // wait (a little) for the resting frames, so the edges never flash white
        const until = performance.now() + 2500;
        while (!disposed && !made.ready && performance.now() < until) await new Promise((r) => setTimeout(r, 100));
        if (disposed || gl !== made) return;
        glOn = true;
        host.style.visibility = "visible";
        kick();
      } catch {
        if (!disposed) glOff();
      }
    };

    /* ---- where everything is for the current position */
    const zoneNow = () => Math.max(0.05, EDGE.zone - EDGE.zoneSpeed * glide.speed);
    const centreOf = (i: number) => around(i - glide.position, n) * pitch; // from the middle, px
    let lastMask = "";
    function mask(zone: number, clear = false) {
      const key = clear ? "" : `${glide.position}:${zone}:${cardW}`;
      if (key === lastMask) return;
      lastMask = key;
      const a = (zone * W) / 2; // the real cards show up to here from the middle
      cards.forEach((el, i) => {
        if (!el) return;
        const c = centreOf(i);
        if (clear || Math.abs(c) + cardW / 2 <= a - EDGE.seamPx) {
          el.style.maskImage = "";
          return;
        }
        const left = c - cardW / 2; // the card's own left edge, from the middle
        el.style.maskImage = `linear-gradient(to right, transparent ${-a - left}px, #000 ${-a + EDGE.seamPx - left}px, #000 ${a - EDGE.seamPx - left}px, transparent ${a - left}px)`;
      });
    }
    const place = () => {
      cards.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(${centreOf(i).toFixed(2)}px,0,0)`;
      });
    };
    const draw = (now: number) => {
      if (!glOn || !gl) return;
      const zone = zoneNow();
      mask(zone);
      try {
        gl.render({ centres: cards.map((_, i) => W / 2 + centreOf(i)), zone, speed: glide.speed, now });
      } catch {
        glOff();
      }
    };

    /* ---- the loop: runs while anything moves */
    let raf = 0, lastT = 0;
    let visible = true, hovered = false, focused = false, resting = true, resumeT = 0;
    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000));
      lastT = t;
      const moving = glide.tick(dt);
      place();
      draw(t);
      if (moving) raf = requestAnimationFrame(frame);
    };
    function kick() {
      if (raf || disposed) return;
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }

    /* ---- drifting by itself: after a second, slower under the pointer, paused while
       someone is using it, and only while it's on screen */
    const updateDrift = () => {
      const on = !resting && !focused && !glide.dragging && visible && !document.hidden && !still.matches;
      glide.drift(on, (driftPx() / pitch) * (hovered ? TUNE.driftHover : 1));
      kick();
    };
    const pause = (ms = 1000) => {
      resting = true;
      window.clearTimeout(resumeT);
      resumeT = window.setTimeout(() => {
        resting = false;
        updateDrift();
      }, ms);
      updateDrift();
    };

    /* ---- input */
    let wheelT = 0;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // up/down still scrolls the page
      e.preventDefault(); // and a sideways swipe doesn't go back a page
      pause();
      glide.wheel(e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W : 1));
      window.clearTimeout(wheelT);
      wheelT = window.setTimeout(() => {
        glide.settle();
        kick();
      }, TUNE.wheelSettleMs);
      kick();
    };

    let pointer: number | null = null, downX = 0, dragged = false;
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
      pointer = e.pointerId;
      downX = e.clientX;
      dragged = false;
      glide.dragStart(e.clientX, e.timeStamp);
      pause();
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      if (!dragged && Math.abs(e.clientX - downX) > TUNE.dragStartPx) {
        dragged = true;
        rail.setPointerCapture(e.pointerId);
        rail.dataset.dragging = "";
      }
      glide.dragMove(e.clientX, e.timeStamp);
      kick();
    };
    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      glide.dragEnd(e.timeStamp);
      pause();
      delete rail.dataset.dragging;
      if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
      window.setTimeout(() => (dragged = false), 0);
      kick();
    };
    const click = (e: MouseEvent) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const key = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      pause();
      glide.step(e.key === "ArrowRight" ? 1 : -1);
      kick();
    };
    const focusIn = (e: FocusEvent) => {
      const i = cards.findIndex((el) => el?.contains(e.target as Node));
      if (i < 0) return;
      focused = true;
      glide.show(i, n);
      updateDrift();
    };
    const focusOut = (e: FocusEvent) => {
      if (rail.contains(e.relatedTarget as Node)) return;
      focused = false;
      updateDrift();
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hovered = true;
      updateDrift();
    };
    const leave = () => {
      hovered = false;
      updateDrift();
    };

    const ro = new ResizeObserver(() => {
      measure();
      glide.pitch = pitch;
      lastMask = "";
      layoutGl();
      place();
      kick();
    });
    ro.observe(rail);
    const io = new IntersectionObserver((es) => {
      visible = es[es.length - 1]?.isIntersecting ?? true;
      updateDrift();
    });
    io.observe(rail);
    const vis = () => updateDrift();
    document.addEventListener("visibilitychange", vis);

    rail.addEventListener("wheel", wheel, { passive: false });
    rail.addEventListener("pointerdown", down);
    rail.addEventListener("pointermove", move);
    rail.addEventListener("pointerup", up);
    rail.addEventListener("pointercancel", up);
    rail.addEventListener("pointerenter", enter);
    rail.addEventListener("pointerleave", leave);
    rail.addEventListener("click", click, true);
    rail.addEventListener("keydown", key);
    rail.addEventListener("focusin", focusIn);
    rail.addEventListener("focusout", focusOut);

    place();
    pause(1000);
    const idle = window.setTimeout(startGl, 300); // the drawn edges wait until the page has settled

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      window.clearTimeout(wheelT);
      window.clearTimeout(resumeT);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      rail.removeEventListener("wheel", wheel);
      rail.removeEventListener("pointerdown", down);
      rail.removeEventListener("pointermove", move);
      rail.removeEventListener("pointerup", up);
      rail.removeEventListener("pointercancel", up);
      rail.removeEventListener("pointerenter", enter);
      rail.removeEventListener("pointerleave", leave);
      rail.removeEventListener("click", click, true);
      rail.removeEventListener("keydown", key);
      rail.removeEventListener("focusin", focusIn);
      rail.removeEventListener("focusout", focusOut);
      cards.forEach((el) => {
        if (el) {
          el.style.transform = "";
          el.style.maskImage = "";
        }
      });
      gl?.dispose();
    };
  }, [n, posters]);

  return (
    <section ref={railRef} className="case-rail" aria-roledescription="carousel" aria-label="Case studies">
      <div ref={glRef} className="case-rail-gl" aria-hidden="true" />
      {items.map((it, i) => (
        <div
          key={it.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          className="case-rail-card"
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${n}`}
        >
          {it.node}
        </div>
      ))}
    </section>
  );
}
