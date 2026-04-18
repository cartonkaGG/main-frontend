"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

export function PartnerAreaGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"load" | "ok" | "no">("load");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiFetch<{ isPartner?: boolean }>("/api/me/session");
      if (cancelled) return;
      if (!r.ok || !r.data?.isPartner) {
        setState("no");
        router.replace("/");
        return;
      }
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Проверка доступа…
      </div>
    );
  }

  return <>{children}</>;
}
