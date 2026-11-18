import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/content/site";
import "./globals.css";

/* Fraunces: a soft, slightly wonky old-style serif, warm and organic like the sunflowers.
   A fixed cut (semibold, softest, wonky, display size) baked from the variable font, so the
   letter shapes on screen match exactly what Headline measures. Licence: src/fonts/OFL.txt */
const fraunces = localFont({ src: "../fonts/fraunces-soft-wonk-600.woff2", variable: "--font-flower", weight: "600" });

export const metadata: Metadata = {
  title: site.name,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}
