import { Hero } from "@/components/Hero";
import { About } from "@/components/About";

export default function Home() {
  return (
    <main className="relative isolate">
      <Hero />
      {/* open sky: the cards have gone and the sand flows on the wind over the bare paper */}
      <div aria-hidden className="h-[80dvh]" />
      <About />
    </main>
  );
}
