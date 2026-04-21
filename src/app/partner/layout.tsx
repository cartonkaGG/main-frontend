import { PartnerLayoutClient } from "./PartnerLayoutClient";
import { SiteShell } from "@/components/SiteShell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <PartnerLayoutClient>{children}</PartnerLayoutClient>
    </SiteShell>
  );
}
