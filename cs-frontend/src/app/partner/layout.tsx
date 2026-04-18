import { PartnerAreaGuard } from "@/components/PartnerAreaGuard";
import { PartnerLayoutClient } from "./PartnerLayoutClient";
import { SiteShell } from "@/components/SiteShell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <PartnerAreaGuard>
        <PartnerLayoutClient>{children}</PartnerLayoutClient>
      </PartnerAreaGuard>
    </SiteShell>
  );
}
