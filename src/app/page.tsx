import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { ColourPicker } from "@/components/ColourPicker";

export default function Home() {
  return (
    <main className="relative isolate">
      <Hero />
      {/* open sky: the cards have gone and the sand flows on the wind over the bare paper */}
      <div aria-hidden className="h-[80dvh]" />
      <About />
      {/* the frame: the whole site sits in one big rounded window on a soft grey surround */}
      <div aria-hidden className="pointer-events-none fixed inset-3 z-40 rounded-[28px] shadow-[0_0_0_100vmax_var(--color-surround),inset_0_0_0_1px_rgb(0_0_0/0.04)]" />
      {/* a colour picker for trying the background and the sand, only on the local dev server */}
      {process.env.NODE_ENV === "development" && <ColourPicker />}
    </main>
  );
}
