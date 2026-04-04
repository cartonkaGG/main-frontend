import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthModalHost } from "@/components/AuthModalHost";
import { ClosedBetaBoundary } from "@/components/ClosedBetaBoundary";
import { StormAtmosphere } from "@/components/StormAtmosphere";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StormBattle",
  description: "Кейсы CS2",
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
    <html lang="ru" className={`dark lg:h-full ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#020204] text-zinc-100 antialiased lg:h-dvh lg:overflow-hidden">
        <div className="cb-backdrop" aria-hidden>
          <StormAtmosphere />
          <span className="cb-backdrop-vignette" />
          <span className="cb-backdrop-diagonal" />
          <span className="cb-backdrop-orb cb-backdrop-orb--a" />
          <span className="cb-backdrop-orb cb-backdrop-orb--b" />
        </div>
        <div className="relative z-10 min-h-screen lg:h-full lg:min-h-0">
          <ClosedBetaBoundary>{children}</ClosedBetaBoundary>
        </div>
        <AuthModalHost />
      </body>
    </html>
  );
}
