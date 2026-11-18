/* The net always fills the screen exactly: a whole number of columns and rows,
   each cell stretched a little so there are no cut-off rectangles at the edges.
   The counts aim for standing rectangles of roughly TARGET_W × TARGET_H. */
const TARGET_W = 240;
const TARGET_H = 360;

export function gridSize() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const cols = Math.max(1, Math.round(vw / TARGET_W));
  const rows = Math.max(1, Math.round(vh / TARGET_H));
  return { cols, rows, w: vw / cols, h: vh / rows };
}
