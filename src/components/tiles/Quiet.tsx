import { CurvedText } from "@/components/CurvedText";
import { ToolLogo } from "@/components/ToolLogos";

/* The quieter rectangles for taller screens: a few words each, and at most one slow,
   small movement. */

/* About: who I am, in a few lines, two rectangles wide on the green */
export function AboutTile({ hello, lines, facts }: { hello: string; lines: string[]; facts: string[] }) {
  return (
    <section className="tile tone-leaf">
      <div className="tile-grid">
        <p className="sr-only">About</p>
        <div className="tile-stage flex flex-col justify-center gap-3 pr-6">
          <p className="t-title m-0">{hello}</p>
          {lines.map((l) => (
            <p key={l} className="t-body m-0 max-w-[34rem]">
              {l}
            </p>
          ))}
        </div>
        <p className="sr-only">{facts.join(" · ")}</p>
        <CurvedText title="About" text={facts.join(" · ")} />
      </div>
    </section>
  );
}

/* Toolbox: the tools as small tags that float, each at its own pace */
export function ToolboxTile({ tools }: { tools: string[] }) {
  return (
    <ul className="absolute inset-0 m-0 flex list-none flex-wrap content-center justify-center gap-2.5 p-0">
      {tools.map((t, i) => (
        <li key={t} className="tool-tag t-body" style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${3.6 + (i % 3) * 0.7}s` }}>
          <ToolLogo name={t} />
          {t}
        </li>
      ))}
    </ul>
  );
}

/* A sunflower drawn slowly in one blue line, then let go, then drawn again */
export function SunflowerDrawing() {
  const petals = Array.from({ length: 14 }, (_, i) => (i / 14) * 360);
  return (
    <svg viewBox="0 0 100 150" className="absolute inset-0 m-auto h-[88%] w-[88%] text-[var(--sky)]" role="img" aria-label="A sunflower, drawn in one blue line">
      <g fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" pathLength={1} style={{ animationDelay: "0s" }} d="M50 142 C48 120 53 100 50 62" />
        <path className="draw" pathLength={1} style={{ animationDelay: "0.6s" }} d="M50 112 C40 104 30 106 24 98 C34 94 44 98 50 108" />
        <path className="draw" pathLength={1} style={{ animationDelay: "0.9s" }} d="M51 96 C60 88 72 90 77 82 C66 79 56 84 51 92" />
        {petals.map((a, i) => (
          <path
            key={a}
            className="draw"
            pathLength={1}
            style={{ animationDelay: `${1.4 + i * 0.12}s` }}
            transform={`rotate(${a} 50 44)`}
            d="M50 33 C45 25 46 14 50 8 C54 14 55 25 50 33"
          />
        ))}
        <circle className="draw" pathLength={1} style={{ animationDelay: "3.2s" }} cx="50" cy="44" r="10.5" />
        <circle className="draw" pathLength={1} style={{ animationDelay: "3.5s" }} cx="50" cy="44" r="6.5" />
      </g>
    </svg>
  );
}
