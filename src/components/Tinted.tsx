/* An image printed in the page's two greens (a duotone: shadows in moss, highlights in
   leaf), showing its own colours while hovered. Two copies stacked: the original below,
   the green print on top fading away, since an SVG filter itself can't be animated.
   The filter lives once in the layout as #duo. */
export function Tinted({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <span className={`group/tint relative block overflow-hidden ${className}`}>
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 [filter:url(#duo)] group-hover/tint:opacity-0" />
    </span>
  );
}

/* the duotone filter; render once */
export function DuoFilter() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter id="duo" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.118 0.863" />
          <feFuncG type="table" tableValues="0.208 0.922" />
          <feFuncB type="table" tableValues="0.078 0.776" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
