"use client";

import { PartnerCabinetTabProvider } from "@/contexts/PartnerCabinetTabContext";
import { PartnerDashboardShell } from "@/components/PartnerDashboardShell";

export function PartnerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <PartnerCabinetTabProvider>
      <PartnerDashboardShell>{children}</PartnerDashboardShell>
    </PartnerCabinetTabProvider>
  );
}
