"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { apiFetch, getToken } from "@/lib/api";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiFetch<{ isAdmin?: boolean; isSupportStaff?: boolean }>("/api/me");
      if (cancelled) return;
      if (!r.ok || !r.data) {
        router.replace("/");
        return;
      }
      if (r.data.isAdmin) router.replace("/admin/cases");
      else if (r.data.isSupportStaff) router.replace("/admin/support");
      else router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[30vh] items-center justify-center text-sm text-zinc-500">
      Перенаправлення…
    </div>
  );
}
