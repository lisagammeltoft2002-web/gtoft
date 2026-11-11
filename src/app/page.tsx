import { Scene } from "@/components/journey/Scene";
import { Chapters, Letter, SmoothScroll } from "@/components/journey/Layers";

/* The home page is one letter on paper. The landscape lives in a framed print window
   whose shape follows the chapter; the letter's text turns into each chapter's copy. */
export default function Home() {
  return (
    <>
      <Scene />
      <SmoothScroll />
      <main id="main" className="relative">
        <h1 className="sr-only">{"Lisa Gammeltoft, designer who builds websites and apps"}</h1>
        <Letter />
        <Chapters />
      </main>
    </>
  );
}
