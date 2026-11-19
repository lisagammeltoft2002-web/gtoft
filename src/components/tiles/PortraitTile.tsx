import { DotPortrait } from "./DotPortrait";

/* Lisa as a halftone of blue dots on the leaf green. Pointing at it, the dots step back and
   the photo shows through, tinted green. */
export function PortraitTile({ src, alt, hello }: { src: string; alt: string; hello: string }) {
  return (
    <section className="portrait tile tone-leaf">
      <div className="portrait-photo" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 bottom-14">
        <DotPortrait src={src} alt={alt} color="#264a87" by="dark" className="portrait-dots" />
      </div>
      <div className="tile-foot absolute left-[var(--pad)] right-[var(--pad)] bottom-[var(--pad)]">
        <p className="t-body">{hello}</p>
      </div>
    </section>
  );
}
