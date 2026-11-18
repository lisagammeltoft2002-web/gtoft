import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import { site } from "@/content/site";
import { DuoFilter } from "@/components/Tinted";
import "./globals.css";

/* a thin mono with a typewriter feel that stays easy to read */
const plex = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["200", "300"], style: ["normal", "italic"] });

/* every heading and the body: a clean, modern grotesk (light for the big type) */
const inter = Inter_Tight({ variable: "--font-body", subsets: ["latin"], weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: `${site.positioning} Based in ${site.city}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${inter.variable} antialiased`}>
      <body>
        <DuoFilter />
        {children}
      </body>
    </html>
  );
}
