import "./globals.css";
import Script from "next/script";
import { Space_Grotesk, Outfit } from "next/font/google";
import { ComicHeader } from "@/components/layout/comic-header";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-space",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "KABOOM!",
  description: "BAM! Deploy snippets, containers & functions. No ops required.",
};

import { GitBranch, AlertTriangle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageTransition } from "@/components/layout/page-transition";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-outfit min-h-screen antialiased bg-[var(--bg-base)] text-[var(--ink-text)] overflow-x-hidden flex flex-col">
        <div className="fixed inset-0 comic-grid pointer-events-none z-0" />
        <div className="fixed inset-0 paper-texture pointer-events-none z-0" />
        <ComicHeader />
        <main className="flex-grow min-h-[calc(100vh-80px)] relative z-10">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}
