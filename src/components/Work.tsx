import { caseStudies, type CaseStudy } from "@/content/site";

/* the same sand grain as the background: clumpy light and dark specks */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .86  0 0 0 0 .92  0 0 0 0 .78  0 0 0 2.4 -1.25'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;
export const SPECK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .03  0 0 0 0 .07  0 0 0 0 .02  0 0 0 2.6 -1.35'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

/* what kind of work it is: "Website", "Product", "Internal tool" */
const kind = (c: CaseStudy) => c.kind.split(" · ")[0];

/* a grainy photo printed in the page's greens; on hover the grain thins and it brightens
   a little, like a patch of sun landing on it */
function Print({ c, className = "" }: { c: CaseStudy; className?: string }) {
  return (
    <span className={`group/p relative block overflow-hidden [filter:url(#worn)] ${className}`}>
      <img src={c.image.src} alt={c.image.alt} className="absolute inset-0 h-full w-full object-cover [filter:url(#duo-deep)] transition-[filter] duration-700 group-hover/p:[filter:url(#duo-deep)_brightness(1.25)]" />
      <span aria-hidden className="absolute inset-0 opacity-30 transition-opacity duration-700 group-hover/p:opacity-10" style={{ backgroundImage: `${GRAIN}, ${SPECK}` }} />
    </span>
  );
}

/* The work card's pieces, sharing which case study is highlighted (`on`). */
type Pick = { on: number; setOn: (i: number) => void };

/* the four printed pictures, two by two, each in its own cell of the net; the one not
   highlighted fades back a little */
export function WorkPrints({ on, setOn }: Pick) {
  return (
    <ul className="grid h-full grid-cols-2 grid-rows-2">
      {caseStudies.map((c, i) => (
        <li key={c.slug} onMouseEnter={() => setOn(i)} className={`border-rule p-[1.4vw] ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t" : ""}`}>
          <a href="#" onFocus={() => setOn(i)} className={`block transition-opacity duration-500 ${on === i ? "" : "opacity-60"}`}>
            <Print c={c} className="aspect-video w-full" />
            <h3 className="mt-3 text-[clamp(0.9rem,1.05vw,1.05rem)] leading-tight">{c.title}</h3>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* the ruled list of titles: what the closed work card shows */
export function WorkList({ on, setOn }: Pick) {
  return (
    <ul className="flex h-full flex-col">
      {caseStudies.map((c, i) => (
        <li key={c.slug} onMouseEnter={() => setOn(i)} className={`flex-1 border-rule ${i ? "border-t" : ""}`}>
          <a href="#" onFocus={() => setOn(i)} className="flex h-full items-center justify-between gap-4 px-[1.4vw]">
            <span className={`text-[clamp(0.9rem,1.05vw,1.05rem)] transition-opacity duration-300 ${on === i ? "" : "opacity-70"}`}>{c.title}</span>
            <span className="text-[0.76rem] italic opacity-70">{kind(c)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/* the highlighted case study told in a few lines */
export function WorkDetail({ on }: { on: number }) {
  const c = caseStudies[on];
  return (
    <div className="flex h-full flex-col p-[1.4vw]">
      <p className="text-[0.76rem] italic opacity-70">
        {kind(c)}, {c.year}
      </p>
      <h3 className="mt-2 text-[clamp(1.2rem,1.6vw,1.6rem)] leading-tight">{c.title}</h3>
      <p className="mt-3 text-[clamp(0.76rem,0.84vw,0.88rem)] leading-relaxed">{c.outcome}</p>
      <a href="#" className="mt-auto self-start border-b border-current text-[0.82rem]">
        Read the case study
      </a>
    </div>
  );
}

/* the filters the work and the hero text use; render once */
export function WorkFilters() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      {/* duotone: shadows in deep moss, highlights in cream */}
      <filter id="duo-deep" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.07 0.45 0.93" />
          <feFuncG type="table" tableValues="0.12 0.53 0.93" />
          <feFuncB type="table" tableValues="0.05 0.33 0.86" />
        </feComponentTransfer>
      </filter>
      {/* slightly ragged edges, like an old print */}
      <filter id="worn" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="3" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
