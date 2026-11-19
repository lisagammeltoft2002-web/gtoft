/* Places something exactly inside the net (col and row start at 0), w rectangles wide and
   h tall. It sits just inside the grid lines, so the 1px lines stay visible around it. */
export function Cell({ col, row, w = 1, h = 1, children }: { col: number; row: number; w?: number; h?: number; children: React.ReactNode }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `calc(var(--cell-w) * ${col} + 1px)`,
        top: `calc(var(--cell-h) * ${row} + 1px)`,
        width: `calc(var(--cell-w) * ${w} - 1px)`,
        height: `calc(var(--cell-h) * ${h} - 1px)`,
      }}
    >
      {children}
    </div>
  );
}
