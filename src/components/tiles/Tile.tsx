/* One rectangle in one of the board's colours: a small label top left, its drawing in the
   middle and its words (a title and one line) bottom left. With `bleed`, the drawing fills
   the whole rectangle and the words sit on top of it. */
export function Tile({
  tone = "paper",
  label,
  title,
  body,
  bleed,
  linen,
  className = "",
  children,
}: {
  tone?: "paper" | "work" | "leaf" | "sun";
  label?: React.ReactNode;
  title?: React.ReactNode;
  body?: React.ReactNode;
  bleed?: boolean;
  linen?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`tile tone-${tone} ${linen ? "linen" : ""} ${className}`}>
      {bleed && <div className="absolute inset-0">{children}</div>}
      <div className="tile-grid">
        <p className="tile-label t-label">{label}</p>
        <div className="tile-stage">{!bleed && children}</div>
        {(title || body) && (
          <div className="tile-foot">
            {title && <p className="t-title">{title}</p>}
            {body && <p className="t-body">{body}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
