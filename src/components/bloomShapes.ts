/* The line drawings the dots flow along, on a 24 × 24 grid (like a line icon).
   Each shape is a list of separate lines; dots stay on their own line, so strokes
   never smear into each other. They are Lisa's hobbies (see site.ts): pottery,
   crochet, painting, sewing and rug tufting, played in a loop. */

export type Shape = { name: string; lines: string[] };

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy}`;

/* short parallel strokes, e.g. a rug's fringe */
const fringe = (y1: number, y2: number, xs: number[]) => xs.map((x) => `M${x},${y1} L${x},${y2}`).join(" ");

export const SHAPES: Shape[] = [
  {
    name: "pottery", // a vase on the wheel
    lines: [
      "M9.6 3 H14.4 C14.4 5 13.6 6 13.6 7 C13.6 8 18 10 18 14.5 C18 18.5 15.5 21 12 21 C8.5 21 6 18.5 6 14.5 C6 10 10.4 8 10.4 7 C10.4 6 9.6 5 9.6 3 Z",
      "M6.5 13 C9 14 15 14 17.5 13",
      "M3.5 22.6 H20.5",
    ],
  },
  {
    name: "crochet", // a ball of yarn with a hook through it
    lines: [
      circle(10, 14, 6.5),
      "M4.6 11 C8 12 12 15.5 13.6 19.6",
      "M5 16.6 C8 15.5 12 11.5 13 7.8",
      "M7.4 8.4 C10.5 10.5 14.6 12 16.4 12.6",
      "M13.8 10.2 L20.8 3.2 C21.6 2.4 22.6 3.4 21.8 4.2 L21.2 4.6",
      "M15.8 16.4 C17.8 17 19.4 19 21.6 19.4",
    ],
  },
  {
    name: "painting", // a palette with paint on it
    lines: [
      "M12 3 C6.5 3 2.5 7 2.5 12 C2.5 17 6.5 21 11.5 21 C13 21 13.6 20 13.2 18.8 C12.8 17.6 13.4 16.5 14.8 16.5 H16.5 C19.2 16.5 21.5 14.4 21.5 11.5 C21.5 6.8 17.3 3 12 3 Z",
      circle(7.4, 10.6, 1.4),
      circle(10.8, 7, 1.4),
      circle(15.2, 7.2, 1.4),
      circle(18, 11, 1.4),
      circle(7.6, 15.6, 1.6),
    ],
  },
  {
    name: "sewing", // a pair of scissors
    lines: [
      circle(6, 6, 3),
      circle(6, 18, 3),
      "M8.2 8.2 L12 12",
      "M20 4 L8.2 15.8",
      "M14.6 14.6 L20 20",
    ],
  },
  {
    name: "rug tufting", // a tufted rug with fringe
    lines: [
      "M7 4.5 H17 C18.1 4.5 19 5.4 19 6.5 V17.5 C19 18.6 18.1 19.5 17 19.5 H7 C5.9 19.5 5 18.6 5 17.5 V6.5 C5 5.4 5.9 4.5 7 4.5 Z",
      circle(12, 12, 3.4),
      "M12 8.6 C12.8 6.8 14.6 6.6 15.6 7.6 M12 15.4 C11.2 17.2 9.4 17.4 8.4 16.4",
      fringe(4.5, 2, [6.6, 9.2, 11.8, 14.4, 17]),
      fringe(19.5, 22, [6.6, 9.2, 11.8, 14.4, 17]),
    ],
  },
];
