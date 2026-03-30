import type { Metadata } from "next";
import "./globals.css";
import { AuthModalHost } from "@/components/AuthModalHost";

export const metadata: Metadata = {
  title: "CaseDrop",
  description: "Кейсы CS2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen bg-[#020204] text-zinc-100 antialiased">
        <div className="cb-backdrop" aria-hidden>
          <span className="cb-backdrop-vignette" />
          <span className="cb-backdrop-diagonal" />
          <span className="cb-backdrop-orb cb-backdrop-orb--a" />
          <span className="cb-backdrop-orb cb-backdrop-orb--b" />
        </div>
        <div className="relative z-10 min-h-screen">{children}</div>
        <AuthModalHost />
      </body>
    </html>
  );
}
