"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"load" | "ok" | "no">("load");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    (async () => {
      const r = await apiFetch<{ isAdmin?: boolean }>("/api/me");
      if (!r.ok || !r.data?.isAdmin) {
        setState("no");
        router.replace("/");
        return;
      }
      setState("ok");
    })();
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
