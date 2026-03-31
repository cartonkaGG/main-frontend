import type { Metadata } from "next";
import "./globals.css";
import { AuthModalHost } from "@/components/AuthModalHost";
import { StormAtmosphere } from "@/components/StormAtmosphere";

export const metadata: Metadata = {
  title: "StormBattle",
  description: "Кейсы CS2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark lg:h-full">
      <body className="min-h-screen bg-[#020204] text-zinc-100 antialiased lg:h-dvh lg:overflow-hidden">
        <div className="cb-backdrop" aria-hidden>
          <StormAtmosphere />
          <span className="cb-backdrop-vignette" />
          <span className="cb-backdrop-diagonal" />
          <span className="cb-backdrop-orb cb-backdrop-orb--a" />
          <span className="cb-backdrop-orb cb-backdrop-orb--b" />
        </div>
        <div className="relative z-10 min-h-screen lg:h-full lg:min-h-0">{children}</div>
        <AuthModalHost />
      </body>
    </html>
  );
}
