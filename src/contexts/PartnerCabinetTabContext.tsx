"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PartnerCabinetTab = "analytics" | "faq" | "material";

const VALID = new Set<PartnerCabinetTab>(["analytics", "faq", "material"]);

function readTabFromSearch(search: string): PartnerCabinetTab {
  const t = new URLSearchParams(search).get("tab");
  if (t && VALID.has(t as PartnerCabinetTab)) return t as PartnerCabinetTab;
  return "analytics";
}

type Ctx = {
  tab: PartnerCabinetTab;
  setTab: (t: PartnerCabinetTab) => void;
};

const PartnerCabinetTabContext = createContext<Ctx | null>(null);

export function PartnerCabinetTabProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<PartnerCabinetTab>("analytics");

  useLayoutEffect(() => {
    setTabState(readTabFromSearch(window.location.search));
  }, []);

  const setTab = useCallback((t: PartnerCabinetTab) => {
    setTabState(t);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    const q = url.searchParams.toString();
    window.history.replaceState(null, "", q ? `${url.pathname}?${q}` : url.pathname);
  }, []);

  const value = useMemo(() => ({ tab, setTab }), [tab, setTab]);
  return <PartnerCabinetTabContext.Provider value={value}>{children}</PartnerCabinetTabContext.Provider>;
}

export function usePartnerCabinetTab() {
  const v = useContext(PartnerCabinetTabContext);
  if (!v) {
    throw new Error("usePartnerCabinetTab must be used within PartnerCabinetTabProvider");
  }
  return v;
}
