import { Background } from "@/components/Background";
import { Lilies } from "@/components/Lilies";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <main className="min-h-dvh">
      <Background />
      <Lilies />
      <Hero />
    </main>
  );
}
