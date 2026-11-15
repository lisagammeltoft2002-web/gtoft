import { caseStudies } from "@/content/site";

/* Case studies as torn scraps of old newsprint lying on the green background, stacked in a
   scrolling column on the right of the hero. Each scrap, after a torn vintage clipping:
   - an irregular torn outline, different for every card
   - two layers: the printed top sheet is torn back unevenly, so the rough paper core shows
     around the edge (wide in places, thin in others)
   - aged edges: olive-brown stains, a darkened rim, one corner folded over
   - a cut-off column of newspaper text (the case study's own copy) at one side
   - the project image printed onto the paper, title and a short line on it
   All in the site's greens. */

const VW = 400, VH = 380;

type Pt = [number, number];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* smooth noise on a loop, so outlines close without a seam; roughly -1..1 */
function loopNoise(seed: number) {
  const R = rng(seed);
  const tables = [4, 9, 21, 47, 97].map((n) => ({ n, v: Array.from({ length: n }, () => R() * 2 - 1) }));
  return (s: number, octave: number) => {
    const { n, v } = tables[octave];
    const x = (((s % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return v[i % n] * (1 - u) + v[(i + 1) % n] * u;
  };
}

const path = (q: Pt[]) => "M" + q.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L") + "Z";

function normals(q: Pt[], span = 4): Pt[] {
  const n = q.length;
  return q.map((_, i) => {
    const a = q[(i - span + n) % n], b = q[(i + span) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l];
  });
}

/* the scrap: an outer torn edge (paper core) and the printed top sheet inside it */
function scrap(seed: number) {
  const N = 300;
  const R = rng(seed);
  const outerN = loopNoise(seed), innerN = loopNoise(seed + 77);
  const cx = VW / 2, cy = VH / 2, rx = 168, ry = 158;
  const base: Pt[] = [];
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    base.push([cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 0.6), cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 0.6)]);
  }
  const bn = normals(base, 6);
  /* a couple of deep bites torn out of the edge */
  const bites = Array.from({ length: 2 }, () => ({ at: R(), size: 0.03 + R() * 0.04, depth: 18 + R() * 22 }));
  const outer: Pt[] = base.map(([px, py], k) => {
    const s = k / N;
    let off = 28 * outerN(s, 0) + 13 * outerN(s, 1) + 5 * outerN(s, 2) + 2 * outerN(s, 3) + 0.9 * outerN(s, 4);
    for (const b of bites) {
      const d = Math.min(Math.abs(s - b.at), 1 - Math.abs(s - b.at));
      off -= b.depth * Math.max(0, 1 - (d / b.size) ** 2);
    }
    return [px + bn[k][0] * off, py + bn[k][1] * off];
  });
  /* the top sheet is torn back by a varying amount */
  const on = normals(outer, 5);
  const inner: Pt[] = outer.map(([px, py], k) => {
    const s = k / N;
    const back = Math.max(2.5, 11 + 14 * innerN(s, 0) + 6 * innerN(s, 1) + 3 * innerN(s, 3) + 1.5 * innerN(s, 4));
    return [px - on[k][0] * back, py - on[k][1] * back];
  });
  /* the folded corner: a flap of the top-left edge turned over */
  const fk = Math.floor(N * (0.6 + R() * 0.08));
  const span = 30;
  const a = inner[(fk - span + N) % N], b = inner[(fk + span) % N], tip = inner[fk];
  const c: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const fold: Pt = [c[0] + (c[0] - tip[0]) * 0.9, c[1] + (c[1] - tip[1]) * 0.9];
  return { outer: path(outer), inner: path(inner), flap: path([a, fold, b]), hidden: path([a, tip, b]), stains: Array.from({ length: 7 }, () => outer[Math.floor(R() * N)]) };
}

function Scrap({ i, src, alt, title, short, column }: { i: number; src: string; alt: string; title: string; short: string; column: string }) {
  const sc = scrap(11 + i * 37);
  const id = `scrap${i}`;
  const R = rng(500 + i);
  const tilt = (R() - 0.5) * 7;
  /* the cut-off newspaper column, from the case study's own copy */
  const words = column.split(" ");
  const lines: string[] = [];
  for (let w = 0, line = ""; w < words.length && lines.length < 22; w++) {
    if ((line + " " + words[w]).length > 13) {
      lines.push(line);
      line = words[w];
    } else line = line ? line + " " + words[w] : words[w];
  }
  const colLeft = i % 2 === 0;
  const IMG = colLeft ? { x: 112, y: 70, w: 236, h: 240 } : { x: 52, y: 70, w: 236, h: 240 };
  const colX = colLeft ? 46 : 300;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="block w-full overflow-visible" role="img" aria-label={alt} style={{ transform: `rotate(${tilt.toFixed(1)}deg)` }}>
      <defs>
        <clipPath id={`${id}-top`}>
          <path d={sc.inner} />
        </clipPath>
        <clipPath id={`${id}-img`}>
          <rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} />
        </clipPath>
        <filter id={`${id}-drop`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
          <feOffset dx="5" dy="9" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* fibres at the outermost torn edge */}
        <filter id={`${id}-fiber`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={i + 2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* rough paper core: lumpy, lit from the top left */}
        <filter id={`${id}-core`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed={i + 9} result="lumps" />
          <feDiffuseLighting in="lumps" surfaceScale="1.6" diffuseConstant="1.18" lightingColor="#ffffff" result="lit">
            <feDistantLight azimuth="235" elevation="62" />
          </feDiffuseLighting>
          <feComposite in="lit" in2="SourceGraphic" operator="arithmetic" k1="1" result="shaded" />
          <feComposite in="shaded" in2="SourceAlpha" operator="in" />
        </filter>
        {/* fine paper grain and a printed look for the image */}
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={i + 4} />
          <feColorMatrix type="matrix" values="0 0 0 0 0.24  0 0 0 0 0.28  0 0 0 0 0.16  0 0 0 -1.6 1.15" />
        </filter>
        <filter id={`${id}-print`} colorInterpolationFilters="sRGB">
          {/* faded ink with a green-olive cast, like an old print */}
          <feColorMatrix type="matrix" values="0.62 0.28 0.06 0 0.06  0.2 0.7 0.08 0 0.08  0.14 0.26 0.42 0 0.04  0 0 0 1 0" />
        </filter>
        <filter id={`${id}-stain`} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed={i + 13} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="2" />
        </filter>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id={`${id}-blot`}>
          <stop offset="0" stopColor="#7a6a2a" stopOpacity="0.8" />
          <stop offset="0.55" stopColor="#8a7a3a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#7a7436" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-read`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.4" stopColor="#0b1a08" stopOpacity="0" />
          <stop offset="1" stopColor="#0b1a08" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id={`${id}-flap`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f3e4" />
          <stop offset="1" stopColor="#bfc3a3" />
        </linearGradient>
      </defs>

      <g filter={`url(#${id}-drop)`}>
        {/* the rough paper core, all the way out to the torn edge */}
        <g filter={`url(#${id}-fiber)`}>
          <path d={sc.outer} fill="#f3f2e2" filter={`url(#${id}-core)`} />
        </g>

        {/* the printed top sheet */}
        <g clipPath={`url(#${id}-top)`}>
          <rect width={VW} height={VH} fill="#dfe3c8" />
          <rect width={VW} height={VH} filter={`url(#${id}-grain)`} opacity="0.55" />

          {/* the cut-off newspaper column */}
          <g fill="#203018" fillOpacity="0.78" fontFamily="Georgia, 'Times New Roman', serif" fontSize="9.5">
            {lines.map((l, k) => (
              <text key={k} x={colX} y={64 + k * 12.5}>
                {l}
              </text>
            ))}
          </g>
          <line x1={colLeft ? IMG.x - 10 : IMG.x + IMG.w + 10} y1="60" x2={colLeft ? IMG.x - 10 : IMG.x + IMG.w + 10} y2="330" stroke="#203018" strokeOpacity="0.35" strokeWidth="0.8" />

          {/* the project image, printed onto the paper */}
          <g clipPath={`url(#${id}-img)`}>
            <image href={src} x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} preserveAspectRatio="xMidYMid slice" filter={`url(#${id}-print)`} />
            <rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} filter={`url(#${id}-grain)`} opacity="0.35" />
            <rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} fill={`url(#${id}-read)`} />
          </g>

          {/* age: stains creeping in from the edge and a darkened rim */}
          <g filter={`url(#${id}-stain)`}>
            {sc.stains.map(([x, y], k) => (
              <ellipse key={k} cx={x} cy={y} rx={34 + ((k * 13) % 30)} ry={26 + ((k * 7) % 22)} fill={`url(#${id}-blot)`} />
            ))}
          </g>
          <path d={sc.inner} fill="none" stroke="#6a5f26" strokeOpacity="0.7" strokeWidth="16" filter={`url(#${id}-soft)`} />
        </g>

        {/* the folded corner */}
        <path d={sc.hidden} fill="#000" opacity="0" />
        <path d={sc.flap} fill="#000" opacity="0.35" filter={`url(#${id}-soft)`} transform="translate(3 4)" />
        <g filter={`url(#${id}-fiber)`}>
          <path d={sc.flap} fill={`url(#${id}-flap)`} filter={`url(#${id}-core)`} />
        </g>

        {/* title and short line, printed on the image */}
        <foreignObject x={IMG.x + 14} y={IMG.y + IMG.h - 86} width={IMG.w - 28} height="78">
          <div className="flex h-full flex-col justify-end text-[#f2f6e6] [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
            <h2 className="text-[19px] leading-tight">{title}</h2>
            <p className="mt-1 text-[11.5px] leading-snug opacity-90">{short}</p>
          </div>
        </foreignObject>
      </g>
    </svg>
  );
}

export function CaseStudies() {
  return (
    <aside
      aria-label="Selected work"
      className="absolute bottom-[5vh] right-[4vw] top-[5vh] z-10 w-[30vw] overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_5%,black_95%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex flex-col gap-[5vh] px-[4%] py-[5vh]">
        {caseStudies.map((c, i) => (
          <li key={c.slug}>
            <Scrap i={i} src={c.image.src} alt={c.image.alt} title={c.title} short={c.short} column={[...c.problem, ...c.reflection].join(" ")} />
          </li>
        ))}
      </ol>
    </aside>
  );
}
