import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Встраиваемый баннер — StormBattle",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
