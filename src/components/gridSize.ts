/* The net always fills the screen exactly: a whole number of columns and rows, each cell
   stretched a little so there are no cut-off rectangles at the edges. The counts aim for
   standing rectangles of roughly TARGET_W × TARGET_H.

   Desktop: never more than 6 × 3 (the hand-placed layouts), so big screens get bigger
   rectangles instead of empty ones, and the page never scrolls.
   Phones, tablets, small laptops and very short windows: too little room for the board, so
   it becomes a scrolling net (1, 3 or 4 columns) where every rectangle is shown. */
const TARGET_W = 240;
const TARGET_H = 360;
const MAX_COLS = 6, MAX_ROWS = 3;

export type GridSize = { cols: number; rows: number; w: number; h: number; scroll: boolean };

export function gridSize(): GridSize {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const fitCols = Math.round(vw / TARGET_W);
  const fitRows = Math.round(vh / TARGET_H);
  if (fitCols >= 5 && fitRows >= 2) {
    const cols = Math.min(MAX_COLS, fitCols), rows = Math.min(MAX_ROWS, fitRows);
    return { cols, rows, w: vw / cols, h: vh / rows, scroll: false };
  }
  const cols = vw < 600 ? 1 : vw < 900 ? 3 : Math.min(MAX_COLS, Math.max(4, fitCols));
  const h = cols === 1 ? Math.min(460, Math.max(360, vw * 0.95)) : TARGET_H;
  return { cols, rows: 0, w: vw / cols, h, scroll: true };
}
