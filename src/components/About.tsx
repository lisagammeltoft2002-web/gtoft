import { about, contact, site } from "@/content/site";

/* About and contact, under the hero: one big glass sheet laid over the dunes (they blur through its
   lower half), exactly one screen tall so the page ends when it fits. Inside: a hairline top row,
   the intro, the facts and the contact links side by side, and my surname as a giant white
   wordmark cut off by the sheet's bottom edge. */
export function About() {
  const [before, after] = about.hello.split("Lisa");
  const surname = site.name.split(" ").slice(-1)[0];
  return (
    <section id="about" className="relative z-10 flex min-h-dvh flex-col px-7 pb-7 pt-[5vh] text-moss md:px-[3.5vw]">
      <div className="glass relative flex flex-1 flex-col overflow-hidden rounded-[28px]">
        {/* the sheet deepens to a soft sage towards the bottom, behind the wordmark */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[color-mix(in_srgb,var(--ink)_38%,transparent)] to-transparent" />

        <div className="relative px-7 pt-6 md:px-10">
          {/* the hairline top row */}
          <div className="flex items-center gap-5 text-[0.78rem] opacity-70">
            <span>© 2026</span>
            <span aria-hidden className="h-px flex-1 bg-moss/25" />
            <span>{contact.note.split("·").slice(-1)[0].trim()}</span>
          </div>

          <div className="mt-[4vh] grid gap-10 md:grid-cols-[1.35fr_1fr_1fr] md:gap-[3vw]">
            <div>
              <h2 className="text-balance text-[clamp(2.4rem,min(4.6vw,8vh),5rem)] leading-[0.95]">
                {/* a round photo of me just before my name: "Hi, I'm (photo) Lisa." */}
                {before}
                <span className="mx-[0.06em] inline-block h-[0.8em] w-[0.8em] overflow-hidden rounded-full align-[-0.06em] ring-2 ring-white shadow-[0_6px_18px_-6px_color-mix(in_srgb,var(--color-moss)_45%,transparent)]">
                  <img src={site.portrait.src} alt={site.portrait.alt} width={380} height={475} className="h-full w-full origin-[52%_30%] scale-[1.7] object-cover object-[50%_22%]" />
                </span>
                Lisa{after}
              </h2>
              <div className="mt-6 max-w-[52ch] space-y-3 text-[clamp(0.95rem,1.05vw,1.05rem)] leading-relaxed opacity-85">
                {about.body.map((p) => (
                  <p key={p.slice(0, 20)}>{p}</p>
                ))}
              </div>
            </div>

            <dl className="grid h-max grid-cols-[6.5rem_1fr] gap-y-3 border-moss/15 text-[0.92rem] md:border-l md:pl-[2.5vw] md:pt-2">
              {about.facts.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="opacity-60">{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>

            <div id="contact" className="border-moss/15 md:border-l md:pl-[2.5vw] md:pt-2">
              <h2 className="text-balance text-[clamp(1.6rem,min(2.4vw,4.6vh),2.6rem)] leading-[1.05]">{contact.title}</h2>
              <p className="mt-3 text-[0.88rem] opacity-70">{contact.note}</p>
              <ul className="mt-5 text-[0.98rem]">
                {[
                  { label: "Email", href: `mailto:${site.email}`, text: site.email },
                  { label: "LinkedIn", href: site.linkedin, text: "LinkedIn" },
                  { label: "CV", href: site.cv, text: "Download CV" },
                ].map((l) => (
                  <li key={l.label} className="border-b border-moss/15 last:border-b-0">
                    <a href={l.href} className="-mx-2 flex min-h-11 items-center justify-between rounded-lg px-2 py-2.5 outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-moss motion-reduce:transition-none">
                      <span className="text-[0.8rem] opacity-60">{l.label}</span>
                      <span>{l.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* the giant wordmark, cut off by the bottom of the sheet */}
        <div aria-hidden className="@container pointer-events-none relative mt-auto select-none overflow-hidden pt-6">
          {/* sized to the sheet's own width (cqw), so it runs edge to edge on any screen */}
          <div className="-mb-[0.3em] text-center text-[20.5cqw] font-medium leading-[0.85] tracking-[-0.06em] text-white">{surname}</div>
        </div>
      </div>
    </section>
  );
}
