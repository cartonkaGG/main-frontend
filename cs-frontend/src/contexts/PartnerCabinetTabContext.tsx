"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PartnerCabinetTab = "analytics" | "codes" | "finances" | "reports";

type Ctx = {
  tab: PartnerCabinetTab;
  setTab: (t: PartnerCabinetTab) => void;
};

const PartnerCabinetTabContext = createContext<Ctx | null>(null);

export function PartnerCabinetTabProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<PartnerCabinetTab>("analytics");
  const value = useMemo(() => ({ tab, setTab }), [tab]);
  return <PartnerCabinetTabContext.Provider value={value}>{children}</PartnerCabinetTabContext.Provider>;
}

export function usePartnerCabinetTab() {
  const v = useContext(PartnerCabinetTabContext);
  if (!v) {
    throw new Error("usePartnerCabinetTab must be used within PartnerCabinetTabProvider");
  }
  return v;
}
