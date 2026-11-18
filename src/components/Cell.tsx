/* Places something exactly inside one rectangle of the net (col and row start at 0).
   It sits just inside the grid lines, so the 1px lines stay visible around it. */
export function Cell({ col, row, children }: { col: number; row: number; children: React.ReactNode }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `calc(var(--cell-w) * ${col} + 1px)`,
        top: `calc(var(--cell-h) * ${row} + 1px)`,
        width: "calc(var(--cell-w) - 1px)",
        height: "calc(var(--cell-h) - 1px)",
      }}
    >
      {children}
    </div>
  );
}
