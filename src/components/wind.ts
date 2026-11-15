/* Shared between the lilies and the background: the calm wind, and the canvas the lilies
   paint their moving shadows into (the background shader reads it as its light map). */

export const shadow: { canvas: HTMLCanvasElement | null } = { canvas: null };

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* a slow sway with a little flutter, swelling and settling like gentle gusts (radians) */
export function sway(t: number, phase: number) {
  const gust = 0.65 + 0.35 * Math.sin(t * 0.13 + phase * 2.1);
  const s = 0.72 * Math.sin(t * 0.55 + phase) + 0.28 * Math.sin(t * 1.27 + phase * 1.7);
  return 0.016 * gust * s;
}
