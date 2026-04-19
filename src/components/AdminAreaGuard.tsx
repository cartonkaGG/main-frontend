"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

const ADMIN_SESSION_MS = 15_000;

export function AdminAreaGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"load" | "ok" | "no">("load");

  useEffect(() => {
    setState("load");
    if (!getToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await Promise.race([
        apiFetch<{ isAdmin?: boolean; isSupportStaff?: boolean }>("/api/me/session"),
        new Promise<{ ok: false; status: number; error: string }>((resolve) =>
          setTimeout(
            () => resolve({ ok: false, status: 0, error: "Таймаут соединения с сервером" }),
            ADMIN_SESSION_MS,
          ),
        ),
      ]);
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
