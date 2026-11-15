import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

/* a thin mono with a typewriter feel that stays easy to read */
const plex = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["200", "300"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: `${site.positioning} Based in ${site.city}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
