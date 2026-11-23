"use client";

import { useEffect, useState } from "react";
import { Bloom } from "../Bloom";
import { faceBuild, loadImage } from "../faceSculpture";
import type { Build } from "../sculptures";

/* Lisa drawn exactly the hobbies' way: her face as a 3D sculpture of thousands of tiny blue
   dots (the Bloom engine), building itself from the top down, rocking gently and scattering
   round the cursor. Pointing at it, the real photo fades in and zooms out to the whole picture. */
export function PortraitTile({ src, alt }: { src: string; alt: string }) {
  const [make, setMake] = useState<((n: number) => Build[]) | null>(null);
  useEffect(() => {
    let live = true;
    loadImage(src).then((im) => {
      const m = faceBuild(im, { crop: { x: 0.22, y: 0.02, w: 0.6 }, focus: { x: 0.53, y: 0.34, rx: 0.27, ry: 0.35 }, tone: 0.55, detail: 0.65, gamma: 1.1 });
      if (live) setMake(() => m);
    });
    return () => {
      live = false;
    };
  }, [src]);

  return (
    <section className="portrait tile tone-leaf linen">
      <div className="portrait-photo" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
      {make && <Bloom make={make} label={alt} />}
    </section>
  );
}
