"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Arrow } from "@/components/cases/Film";
import { returnTo, toTop } from "@/components/cases/boardMotion";

/* "All work": the page rewinds to its top, then the window shrinks back into its case and
   the board gathers around it again */
export function BackHome({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <Link
      href="/"
      className="case-back"
      onClick={async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        returnTo(slug);
        await toTop();
        router.push("/", { transitionTypes: ["nav-back"] });
      }}
    >
      <Arrow back />
      <span>All work</span>
    </Link>
  );
}
