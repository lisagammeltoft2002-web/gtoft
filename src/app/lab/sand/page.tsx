import { SandLab } from "@/components/SandLab";

/* a test page for the sand flow on its own, before it goes into the home page */
export const metadata = { title: "Sand lab", robots: { index: false } };

export default function Page() {
  return <SandLab />;
}
