import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter_Tight } from "next/font/google";
import { Menu } from "@/components/Menu";
import { site } from "@/content/site";
import "./globals.css";

const display = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});
const sans = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: `${site.positioning} Based in ${site.city}.`,
};

export const viewport: Viewport = { themeColor: "#f3f1ec", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} antialiased`}>
      <body className="min-h-dvh overflow-x-clip">
        <a href="#main" className="t-meta fixed left-4 top-4 z-[80] -translate-y-20 bg-ink px-3 py-2 text-paper focus:translate-y-0">
          Skip to content
        </a>
        <Menu />
        <div id="content">{children}</div>
        <div aria-hidden="true" className="grain pointer-events-none fixed inset-0 z-[90]" />
      </body>
    </html>
  );
}
