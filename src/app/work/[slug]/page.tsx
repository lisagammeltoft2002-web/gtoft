import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudies, pad, site } from "@/content/site";
import { Button, Lede, Meta, Plate } from "@/components/ui";

/* Case study — built from the same Survey primitives as the home page.
   (A fuller redesign of this template comes next.) */

// Every case study is prerendered at build time, so a blocking route is fine here.
export const instant = false;

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = caseStudies.find((s) => s.slug === slug);
  return c ? { title: c.title, description: c.outcome } : {};
}

function Block({
  num,
  label,
  children,
}: {
  num: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-1 gap-6 border-t border-line-strong py-12 md:grid-cols-12"
    >
      <Meta className="text-ink-soft md:col-span-3">
        {num} — {label}
      </Meta>
      <div className="md:col-span-7 md:col-start-5">{children}</div>
    </section>
  );
}

export default async function CaseStudyPage({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const i = caseStudies.findIndex((s) => s.slug === slug);
  if (i < 0) notFound();
  const c = caseStudies[i];
  const next = caseStudies[(i + 1) % caseStudies.length];

  return (
    <main
      id="main"
      className="px-[var(--edge)] pb-[var(--edge)] pt-[calc(var(--edge)+3.25rem)]"
    >
      <div className="flex items-baseline justify-between border-b border-line-strong pb-2.5">
        <Meta>
          <Link href="/#work" className="textlink">
            Selected work
          </Link>
          <span className="mx-2 text-ink-soft">—</span>
          {pad(i + 1)} / {pad(caseStudies.length)}
        </Meta>
        <Meta className="text-ink-soft">{c.year}</Meta>
      </div>

      <header className="grid grid-cols-1 gap-8 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Meta className="text-ink-soft">{c.kind}</Meta>
          <h1 className="t-display mt-3">{c.title}</h1>
          <Lede className="mt-4 text-ink-soft">{c.outcome}</Lede>
          <dl className="mt-8 border-t border-line">
            {c.meta.map((m) => (
              <div
                key={m.label}
                className="grid grid-cols-[6rem_1fr] border-b border-line py-2"
              >
                <dt className="t-meta pt-0.5 text-ink-soft">{m.label}</dt>
                <dd className="t-body">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Plate
          src={c.image.src}
          alt={c.image.alt}
          sizes="60vw"
          caption={`Fig. 01 — ${c.title}`}
          className="aspect-[16/10] md:col-span-8"
        />
      </header>

      <Block num="01" label="Problem">
        {c.problem.map((p, k) => (
          <p key={k} className="t-body mb-4 max-w-[62ch] text-ink-soft">
            {p}
          </p>
        ))}
      </Block>
      <Block num="02" label="Insight">
        <Lede className="!text-[1.6rem]">“{c.insight.quote}”</Lede>
        <p className="t-meta mt-3 text-ink-soft">{c.insight.note}</p>
      </Block>
      <Block num="03" label="What I did">
        <ol className="grid gap-8 md:grid-cols-2">
          {c.decisions.map((d) => (
            <li key={d.title}>
              <p className="t-display-sm !text-[1.25rem]">{d.title}</p>
              <p className="t-body mt-2 max-w-[48ch] text-ink-soft">{d.body}</p>
            </li>
          ))}
        </ol>
      </Block>
      <Block num="04" label="Results">
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {c.results.map((r) => (
            <div
              key={r.label}
              className="flex flex-col-reverse border-t border-line pt-3"
            >
              <dt className="t-meta mt-2 text-ink-soft">{r.label}</dt>
              <dd className="t-display-sm">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Block>
      <Block num="05" label="What I learned">
        {c.reflection.map((p, k) => (
          <p key={k} className="t-body mb-4 max-w-[62ch] text-ink-soft">
            {p}
          </p>
        ))}
      </Block>

      <div className="flex items-center justify-between border-t border-line-strong pt-6">
        <Meta className="text-ink-soft">
          © {site.year} {site.name}
        </Meta>
        <Button href={`/work/${next.slug}`}>Next: {next.title}</Button>
      </div>
    </main>
  );
}
