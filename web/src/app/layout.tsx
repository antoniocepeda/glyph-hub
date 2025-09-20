import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthMenu as ClientAuthMenu } from "@/components/AuthMenu";
import AnalyticsBoot from "@/components/AnalyticsBoot";
import { AuthInit } from "@/components/AuthInit";
import { NavLinks } from "@/components/NavLinks";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: 'swap' });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", weight: ["600","700"], subsets: ["latin"], display: 'swap' });

export const metadata: Metadata = {
  title: "GlyphHub",
  description: "Save, share, and remix AI prompts.",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0D0D0F" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  other: {
    "format-detection": "telephone=no",
  },
  icons: {
    icon: [
      { url: "/icon-192", sizes: "192x192", type: "image/png" },
      { url: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "GlyphHub",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${rajdhani.variable} antialiased bg-[var(--gh-bg)] text-[var(--gh-text)]`}>
        <AuthInit />
        <Suspense fallback={null}>
          <AnalyticsBoot />
        </Suspense>
        <div
          className="mx-auto max-w-[1200px] px-6 min-h-[100svh] flex flex-col"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <header
            className="sticky top-0 z-40 border-b border-[var(--gh-border)] bg-[color:var(--gh-bg)]/80 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--gh-bg)]/60"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="h-14 flex items-center gap-4">
              <Link href="/" className="font-display" aria-label="Home">GlyphHub</Link>
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href="/public"
                  className="inline-flex items-center px-2 py-3 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
                >
                  Public
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center px-2 py-3 text-sm text-[var(--gh-text-muted)] hover:text-[var(--gh-cyan)]"
                >
                  Help
                </Link>
                <NavLinks />
                <ClientAuthMenu />
              </div>
            </div>
          </header>
          <main className="py-6 flex-1">{children}</main>
          <footer
            className="mt-auto border-t border-[var(--gh-border)] text-[var(--gh-text-muted)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="py-3 text-sm">© GlyphHub</div>
          </footer>
        </div>
      </body>
    </html>
  );
}
