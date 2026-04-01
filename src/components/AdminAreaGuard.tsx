"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

export function AdminAreaGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"load" | "ok" | "no">("load");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiFetch<{ isAdmin?: boolean; isSupportStaff?: boolean }>("/api/me/session");
      if (cancelled) return;
      if (!r.ok || !r.data) {
        setState("no");
        router.replace("/");
        return;
      }
      const isSupportSection =
        pathname === "/admin/support" || pathname.startsWith("/admin/support/");
      const isAdminRoot = pathname === "/admin" || pathname === "/admin/";
      const allowed = isSupportSection || isAdminRoot
        ? Boolean(r.data.isSupportStaff)
        : Boolean(r.data.isAdmin);
      if (!allowed) {
        setState("no");
        router.replace("/");
        return;
      }
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (state !== "ok") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Проверка доступа…
      </div>
    );
  }

  return <>{children}</>;
}
