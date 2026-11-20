/* Places something exactly inside the net (col and row start at 0), w rectangles wide and
   h tall. It sits a gap in from its corner of the net, so there's an even gap around every rectangle. */
export function Cell({ col, row, w = 1, h = 1, children }: { col: number; row: number; w?: number; h?: number; children: React.ReactNode }) {
  return (
    <div
      className="cell absolute overflow-hidden"
      style={{
        left: `calc(var(--cell-w) * ${col} + var(--cell-in))`,
        top: `calc(var(--cell-h) * ${row} + var(--cell-in))`,
        width: `calc(var(--cell-w) * ${w} - var(--cell-in))`,
        height: `calc(var(--cell-h) * ${h} - var(--cell-in))`,
      }}
    >
      {children}
    </div>
  );
}
