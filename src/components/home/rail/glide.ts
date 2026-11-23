/* How the case row moves. Positions are in cards (1 = one step along the row), so the
   feel is the same at every screen size.

   - It drifts by itself, slowly; slower still while the pointer is over it, and it pauses
     for a moment whenever someone touches it.
   - Dragging follows the finger closely; letting go eases to the nearest card, and a flick
     carries on for up to two cards.
   - `speed` (0 … 1.5) says how fast it's moving right now, smoothed, so the bent edges can
     stretch further while the row is in motion. */

export const TUNE = {
  dragFollow: 34, // how tightly the row follows a drag (per second)
  settle: 30, // how quickly it eases into place
  flickMin: 0.25, // px/ms: slower than this is a release, not a flick
  flickTime: 0.16, // s: how far a flick carries
  flickMax: 2, // cards
  drift: 0.12, // cards per second when nobody touches it (see driftPx: the one speed the whole page moves at)
  driftEase: 6,
  driftHover: 0.25, // drift while the pointer rests on the row
  speedGain: 0.12,
  speedMax: 1.5,
  speedEase: 12,
  wheelSettleMs: 130,
  dragStartPx: 6,
};

const approach = (from: number, to: number, rate: number, dt: number) => {
  const next = from + (to - from) * (1 - Math.exp(-rate * dt));
  return Math.abs(to - next) < 1e-4 ? to : next;
};

export class Glide {
  position = 0;
  target = 0;
  speed = 0;
  dragging = false;
  pitch: number;
  private from = 0;
  private startX = 0;
  private lastX = 0;
  private lastT = 0;
  private velocity = 0; // px per ms, smoothed
  private driftRate = 0;
  private driftNow = 0;

  constructor(pitch: number, private still = false) {
    this.pitch = pitch;
  }

  /** the nearest resting place (a card in the middle) */
  stop(x: number) {
    return Math.round(x);
  }

  dragStart(x: number, t: number) {
    this.dragging = true;
    this.driftNow = 0;
    this.from = this.target;
    this.startX = this.lastX = x;
    this.lastT = t;
    this.velocity = 0;
  }
  dragMove(x: number, t: number) {
    if (!this.dragging) return;
    this.target = this.from - (x - this.startX) / this.pitch;
    const dt = t - this.lastT;
    if (dt > 0) this.velocity = 0.6 * this.velocity + 0.4 * ((x - this.lastX) / dt);
    this.lastX = x;
    this.lastT = t;
  }
  dragEnd(t: number) {
    if (!this.dragging) return;
    this.dragging = false;
    const v = t - this.lastT > 90 ? 0 : this.velocity; // held still before letting go
    const carry =
      Math.abs(v) >= TUNE.flickMin ? Math.max(-TUNE.flickMax, Math.min(TUNE.flickMax, ((-1000 * v) / this.pitch) * TUNE.flickTime)) : 0;
    this.target = this.stop(this.target + carry);
  }
  wheel(px: number) {
    this.target += px / this.pitch;
  }
  settle() {
    this.target = this.stop(this.target);
  }
  step(by: number) {
    this.target = this.stop(this.target) + by;
  }
  /** bring card i to the middle, the shortest way round */
  show(i: number, count: number) {
    this.target = i + Math.round((this.target - i) / count) * count;
  }
  drift(on: boolean, rate = TUNE.drift) {
    this.driftRate = on && !this.still ? rate : 0;
  }

  /** advance by dt seconds; says whether anything is still moving */
  tick(dt: number) {
    if (this.still) {
      this.position = this.target;
      this.speed = 0;
      return this.dragging;
    }
    this.driftNow = approach(this.driftNow, this.dragging ? 0 : this.driftRate, TUNE.driftEase, dt);
    if (this.driftNow && !this.dragging) this.target += this.driftNow * dt;

    const before = this.position;
    this.position = approach(this.position, this.target, this.dragging ? TUNE.dragFollow : TUNE.settle, dt);
    const v = Math.min(Math.abs((this.position - before) / dt) * TUNE.speedGain, TUNE.speedMax);
    this.speed += (v - this.speed) * (1 - Math.exp(-dt * TUNE.speedEase));

    const moving = this.dragging || this.driftNow !== 0 || this.position !== this.target || this.speed > 0.002;
    if (!moving) this.speed = 0;
    return moving;
  }
}

/** where card i sits relative to the middle, in cards, wrapped round an endless row */
export function around(offset: number, count: number) {
  return ((((offset + count / 2) % count) + count) % count) - count / 2;
}

/** the one drift speed of the page, in px per second: the case row's (0.12 of a step of half
    the screen). Everything that drifts by itself moves this fast, so the page has one pace. */
export const driftPx = () => TUNE.drift * (window.innerWidth / 2);
