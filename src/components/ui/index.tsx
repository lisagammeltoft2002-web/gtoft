import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ==================================================================
   Survey design system primitives. Every home section is built from
   these, placed on the same frame:
     edge     = var(--edge)                    page margin
     HEAD_TOP = where every SectionHead sits
     COL_TOP  = where every section's content column starts
     COL_W    = width of the shared left column
   ================================================================== */

export const COL_TOP = "top-[calc(var(--edge)+6.5rem)]";
export const EDGE_X = "inset-x-[var(--edge)]";
export const LEFT = "left-[var(--edge)]";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Meta({ className, ...p }: ComponentProps<"p">) {
  return <p className={cx("t-meta", className)} {...p} />;
}

export function Lede({ className, ...p }: ComponentProps<"p">) {
  return <p className={cx("t-lede", className)} {...p} />;
}

/** The one green action on screen. */
export function Button({ href, children, className, ...rest }: { href: string; children: ReactNode; className?: string } & Omit<ComponentProps<"a">, "href">) {
  const internal = href.startsWith("/") || href.startsWith("#");
  return internal ? (
    <Link href={href} className={cx("btn", className)} {...rest}>
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  ) : (
    <a href={href} className={cx("btn", className)} {...rest}>
      {children}
      <span aria-hidden="true">→</span>
    </a>
  );
}

export function TextLink({ href, children, className, ...rest }: { href: string; children: ReactNode; className?: string } & Omit<ComponentProps<"a">, "href">) {
  return (
    <a href={href} className={cx("textlink", className)} {...rest}>
      {children}
    </a>
  );
}

/** A photograph printed flat on the page, square corners; optional caption in meta. */
export function Plate({ src, alt, caption, sizes = "60vw", className }: { src: string; alt: string; caption?: ReactNode; sizes?: string; className?: string }) {
  return (
    <figure className={className}>
      <div className="relative h-full overflow-hidden bg-paper-deep">
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover grayscale" />
      </div>
      {caption && <figcaption className="t-meta mt-2 text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}
