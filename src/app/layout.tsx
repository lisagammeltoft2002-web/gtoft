import type { Metadata } from "next";
import { IBM_Plex_Mono, Gloock, Inter_Tight } from "next/font/google";
import { site } from "@/content/site";
import { DuoFilter } from "@/components/Tinted";
import "./globals.css";

/* a thin mono with a typewriter feel that stays easy to read */
const plex = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["200", "300"], style: ["normal", "italic"] });

/* every heading: a bold, high-contrast serif with flared strokes */
const gloock = Gloock({ variable: "--font-gloock", subsets: ["latin"], weight: "400" });
/* body text: a clean grotesk, like the small type on the poster */
const inter = Inter_Tight({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: `${site.positioning} Based in ${site.city}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${gloock.variable} ${inter.variable} antialiased`}>
      <body>
        <DuoFilter />
        {children}
      </body>
    </html>
  );
}
