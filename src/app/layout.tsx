import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthModalHost } from "@/components/AuthModalHost";
import { SteamLoginRedirectHost } from "@/components/SteamLoginRedirectHost";
import { ClosedBetaBoundary } from "@/components/ClosedBetaBoundary";
import { StormAtmosphere } from "@/components/StormAtmosphere";
import { Analytics } from "@vercel/analytics/next";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const SITE_DESCRIPTION =
  "StormBattle CS2 (CS:GO) — сражайтесь с настоящими противниками, открывайте кейсы и забирайте самые ценные скины.";

function siteMetadataBase(): URL | undefined {
  const custom = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (custom) {
    try {
      return new URL(custom.endsWith("/") ? custom.slice(0, -1) : custom);
    } catch {
      /* ignore */
    }
  }
  if (process.env.VERCEL_URL) {
    try {
      return new URL(`https://${process.env.VERCEL_URL}`);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020204",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: siteMetadataBase(),
  title: "StormBattle",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "StormBattle",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "StormBattle",
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark min-h-dvh ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://community.cloudflare.steamstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.cloudflare.steamstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://community.cloudflare.steamstatic.com" />
        <link rel="dns-prefetch" href="https://cdn.cloudflare.steamstatic.com" />
      </head>
      <body className="relative min-h-dvh bg-[#020204] text-zinc-100 antialiased [-webkit-tap-highlight-color:transparent]">
        <div className="cb-backdrop" aria-hidden>
          <StormAtmosphere />
          <span className="cb-backdrop-vignette" />
          <span className="cb-backdrop-diagonal" />
          <span className="cb-backdrop-orb cb-backdrop-orb--a" />
          <span className="cb-backdrop-orb cb-backdrop-orb--b" />
        </div>
        <div className="relative z-10 min-w-0">
          <ClosedBetaBoundary>{children}</ClosedBetaBoundary>
        </div>
        <AuthModalHost />
        <SteamLoginRedirectHost />
        <Analytics />
      </body>
    </html>
  );
}
