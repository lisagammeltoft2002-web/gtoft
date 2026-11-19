"use client";

import { useMemo, useState } from "react";
import { DotField, stipplePhoto } from "./DotField";

/* Lisa drawn the hobbies' way: thousands of tiny sky-blue dots on the linen green, more of
   them where the photo is darker, fading out round her head. Pointing at it, the dots spark
   and fly apart while the real photo fades in and zooms out to the whole picture. */
export function PortraitTile({ src, alt }: { src: string; alt: string }) {
  const place = useMemo(
    () => stipplePhoto(src, { crop: { x: 0.22, y: 0.02, w: 0.6 }, focus: { x: 0.53, y: 0.34, rx: 0.27, ry: 0.35 }, density: 0.34, tone: 0.55, detail: 0.65, gamma: 1.1 }),
    [src],
  );
  const [open, setOpen] = useState(false);
  return (
    <section className="portrait tile tone-leaf linen" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      <div className="portrait-photo" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
      <div className="absolute inset-0">
        <DotField place={place} label={alt} strength={1.3} burst={open} origin={[0.52, 0.18]} zoom={1.48} />
      </div>
    </section>
  );
}
