import { intro, site } from "@/content/site";
import { CaseStudies } from "./CaseStudies";

/* The hero as a framed sheet: a hairline rail across the top and one across the bottom,
   with the text spread along them to the sides (name and role on top, promise and city
   below), stopping where the torn case-study column starts on the right. Text is a very light green, not pure white. */
export function Hero() {
  return (
    <section className="relative z-10 min-h-dvh font-display text-leaf font-light [text-shadow:0_1px_12px_rgba(2,10,2,0.5)]">
      <header className="absolute left-[4vw] right-[37vw] top-[5vh] flex items-end justify-between gap-8 border-b border-leaf pb-4">
        <h1 className="text-[clamp(2rem,3.4vw,3.25rem)] leading-none tracking-[-0.02em]">{site.name}</h1>
        <p className="text-[clamp(0.95rem,1.15vw,1.15rem)] italic">{site.role}</p>
      </header>

      <footer className="absolute left-[4vw] right-[37vw] bottom-[5vh] flex items-start justify-between gap-8 border-t border-leaf pt-4">
        <p className="max-w-[34ch] text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed">{intro}</p>
        <p className="text-[clamp(0.95rem,1.15vw,1.15rem)]">{site.city}</p>
      </footer>

      <CaseStudies />
    </section>
  );
}
