"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { setToken } from "@/lib/api";

/** Лише відносний шлях на цьому ж origin (без open-redirect). */
function safeInternalPath(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.length > 2048) return "/";
  return t;
}

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const err = search.get("error");
  const token = search.get("token");
  const [msg, setMsg] = useState("Вход…");

  useEffect(() => {
    if (err) {
      if (err === "legal_required") {
        setMsg("Нужно принять пользовательское соглашение, политику конфиденциальности и политику Cookie на сайте, затем войти снова.");
      } else {
        setMsg("Ошибка Steam. Попробуйте ещё раз.");
      }
      window.localStorage.removeItem("cd_next");
      setTimeout(() => router.replace("/"), 3200);
      return;
    }
    if (token) {
      setToken(token);
      const next = window.localStorage.getItem("cd_next");
      window.localStorage.removeItem("cd_next");
      // Повне перезавантаження надійніше за router.replace — уникає «зависання» на «Вход…» після Steam.
      window.location.replace(safeInternalPath(next));
      return;
    }
    setMsg("Нет токена. Перейдите на главную.");
    window.localStorage.removeItem("cd_next");
    setTimeout(() => router.replace("/"), 2000);
  }, [router, err, token]);

  return (
    <SiteShell>
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-zinc-300">
        <p className="text-center">{msg}</p>
      </div>
    </SiteShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <SiteShell>
          <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-zinc-300">
            Загрузка…
          </div>
        </SiteShell>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
