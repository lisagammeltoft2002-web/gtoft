import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces, Inter } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

/* Fraunces: a soft, slightly wonky old-style serif, warm and organic like the sunflowers.
   A fixed cut (semibold, softest, wonky, display size) baked from the variable font, so the
   letter shapes on screen match exactly what Headline measures. Licence: src/fonts/OFL.txt */
const frauncesDisplay = localFont({ src: "../fonts/fraunces-soft-wonk-600.woff2", variable: "--font-flower", weight: "600" });
/* Inter: the plain sans used for the bits of product UI inside the case studies, so they
   read like real interface, the way Linear shows its product */
/* the same Fraunces, but as a reading cut: regular weight, drawn for text sizes (optical
   size) and kept soft, for body text, links and small labels */
const frauncesText = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT"], variable: "--font-text" });
const inter = Inter({ subsets: ["latin"], variable: "--font-ui", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: site.name,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${frauncesDisplay.variable} ${frauncesText.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
