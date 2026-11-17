import { DuneLab } from "@/components/Dune";

/* a test page for the dunes on their own, before they go into the home page */
export const metadata = { title: "Dune lab", robots: { index: false } };

export default function Page() {
  return <DuneLab />;
}
