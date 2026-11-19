"use client";

import { useSyncExternalStore } from "react";
import { Cell } from "./Cell";
import { gridSize } from "./gridSize";

/* Lays the rectangles out on the net, whatever size the screen is. The two common desktop
   nets (6 × 2 and 6 × 3) have hand-placed layouts; any other desktop size fills the net in
   order of importance, row by row, and leaves out the least important ones that don't fit
   (the page never scrolls). Phones and tablets get a scrolling net with every rectangle. */

export type Tile = { id: string; w?: number; node: React.ReactNode };
type Spot = [col: number, row: number];

const subscribe = (on: () => void) => {
  window.addEventListener("resize", on);
  return () => window.removeEventListener("resize", on);
};
const netKey = () => {
  const { cols, rows, scroll } = gridSize();
  return scroll ? `${cols}xscroll` : `${cols}x${rows}`;
};

/* fill the net in the tiles' order; a tile wider than the net is made to fit */
function pack(tiles: Tile[], cols: number, rows: number) {
  const used = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const spots: Record<string, Spot & { w: number }> = {};
  for (const t of tiles) {
    const w = Math.min(t.w ?? 1, cols);
    search: for (let r = 0; r < rows; r++) {
      for (let c = 0; c + w <= cols; c++) {
        if (used[r].slice(c, c + w).some(Boolean)) continue;
        for (let k = 0; k < w; k++) used[r][c + k] = true;
        spots[t.id] = Object.assign([c, r] as Spot, { w });
        break search;
      }
    }
  }
  return spots;
}

export function Board({ tiles, layouts }: { tiles: Tile[]; layouts: Record<string, Record<string, Spot>> }) {
  // the server assumes the common 6 × 2 net; the browser corrects it straight away
  const key = useSyncExternalStore(subscribe, netKey, () => "6x2");
  const [c, r] = key.split("x");
  const cols = Number(c), scroll = r === "scroll";
  const fixed = layouts[key];
  // a scrolling net has as many rows as it needs, so nothing is left out
  const spots = fixed
    ? Object.fromEntries(tiles.filter((t) => fixed[t.id]).map((t) => [t.id, Object.assign([...fixed[t.id]] as Spot, { w: t.w ?? 1 })]))
    : pack(tiles, cols, scroll ? 99 : Number(r));
  const used = Math.max(0, ...Object.values(spots).map((s) => s[1] + 1));

  return (
    <>
      {tiles.map((t) => {
        const s = spots[t.id];
        return s ? (
          <Cell key={t.id} col={s[0]} row={s[1]} w={s.w}>
            {t.node}
          </Cell>
        ) : null;
      })}
      {/* in a scrolling net, this gives the page its height */}
      {scroll && <div aria-hidden="true" style={{ height: `calc(var(--cell-h) * ${used})` }} />}
    </>
  );
}
