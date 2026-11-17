import { about, contact, site } from "@/content/site";

/* About and contact, under the hero. The floor of this section is where the disc's sand
   ends up as a dune (drawn by the hero's canvas), so the text keeps to the upper part. */
export function About() {
  return (
    <section id="about" className="relative z-10 min-h-dvh px-[5vw] pb-[36vh] pt-[12vh] text-moss">
      <div className="grid gap-[6vw] md:grid-cols-[1.25fr_1fr]">
        <div>
          <h2 className="text-[clamp(2.6rem,6vw,6rem)] leading-[0.95]">{about.hello}</h2>
          <div className="mt-8 max-w-[58ch] space-y-4 text-[clamp(1rem,1.1vw,1.12rem)] leading-relaxed">
            {about.body.map((p) => (
              <p key={p.slice(0, 20)}>{p}</p>
            ))}
          </div>
          <dl className="mt-10 grid max-w-[58ch] grid-cols-[8rem_1fr] gap-y-3 border-t border-moss/25 pt-6 text-[0.95rem]">
            {about.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="opacity-60">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div id="contact" className="md:pt-[0.6rem]">
          <h2 className="text-[clamp(2rem,3.6vw,3.6rem)] leading-[1]">{contact.title}</h2>
          <p className="mt-5 text-[0.95rem] opacity-70">{contact.note}</p>
          <ul className="mt-8 border-t border-moss/25 text-[1.05rem]">
            {[
              { label: "Email", href: `mailto:${site.email}`, text: site.email },
              { label: "LinkedIn", href: site.linkedin, text: "LinkedIn" },
              { label: "CV", href: site.cv, text: "Download CV" },
            ].map((l) => (
              <li key={l.label} className="border-b border-moss/25">
                <a href={l.href} className="flex items-baseline justify-between py-4 transition-opacity hover:opacity-60">
                  <span className="text-[0.85rem] opacity-60">{l.label}</span>
                  <span>{l.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
