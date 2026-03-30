"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/api";

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Вход…");

  useEffect(() => {
    const err = search.get("error");
    const token = search.get("token");

    if (err) {
      setMsg("Ошибка Steam. Попробуйте ещё раз.");
      window.localStorage.removeItem("cd_next");
      setTimeout(() => router.replace("/"), 2500);
      return;
    }
    if (token) {
      setToken(token);
      const next = window.localStorage.getItem("cd_next");
      window.localStorage.removeItem("cd_next");
      router.replace(next || "/");
      return;
    }
    setMsg("Нет токена. Перейдите на главную.");
    window.localStorage.removeItem("cd_next");
    setTimeout(() => router.replace("/"), 2000);
  }, [router, search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
      <p>{msg}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
          Загрузка…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
