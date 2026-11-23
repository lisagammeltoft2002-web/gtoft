import { useId } from "react";

/* One line of words running round the inside edge of a rounded square, close to it. It
   starts at 9 o'clock (the middle of the left side) and runs down and along the bottom, the
   right way up, so a longer line simply goes on round the corner and up the right side. The
   title comes first, then its text on the same line. The SVG fills its (square) parent, in
   units of 100; `size` is the type size in those units. */
const E = 3; // the letters' baseline, in from the edge (descenders just clear it)
const C = 16; // how round the path turns the corners, so the letters flow round them
const [L, B] = [E, 100 - E]; // left/top and right/bottom baselines

export function CurvedText({ title, text, size = 3.6 }: { title?: string; text?: string; size?: number }) {
  const id = useId();
  // one whole turn, anticlockwise from 9 o'clock, so the letters stand inwards
  const d =
    `M${L} 50 V${B - C} A${C} ${C} 0 0 0 ${L + C} ${B} H${B - C} A${C} ${C} 0 0 0 ${B} ${B - C} ` +
    `V${L + C} A${C} ${C} 0 0 0 ${B - C} ${L} H${L + C} A${C} ${C} 0 0 0 ${L} ${L + C} Z`;
  return (
    <svg className="curved-text" viewBox="0 0 100 100" aria-hidden="true">
      <path id={id} d={d} fill="none" />
      <text fontSize={size} letterSpacing={size * 0.02}>
        <textPath href={`#${id}`} startOffset="0.5%">
          {title && <tspan className="curved-title">{title}</tspan>}
          {title && text && <tspan className="curved-dot">{"  ·  "}</tspan>}
          {text && <tspan className="curved-line">{text}</tspan>}
        </textPath>
      </text>
    </svg>
  );
}
