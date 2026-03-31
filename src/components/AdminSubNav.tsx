"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";

type Me = {
  isAdmin?: boolean;
  isSupportStaff?: boolean;
};

const linkClass = "text-zinc-400 hover:text-white";

export function AdminSubNav() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setMe(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiFetch<Me>("/api/me");
      if (!cancelled) setMe(r.ok && r.data ? r.data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const full = Boolean(me?.isAdmin);
  const supportOnly = Boolean(me && me.isSupportStaff && !me.isAdmin);

  return (
    <>
      <Link href="/" className="text-zinc-500 hover:text-cb-flame">
        ← На сайт
      </Link>
      <span className="text-zinc-700">|</span>
      <span
        className={`font-semibold uppercase tracking-wider ${
          supportOnly ? "text-sky-400/95" : "text-amber-500/90"
        }`}
      >
        {!me ? "…" : full ? "Админ" : supportOnly ? "Поддержка" : "Панель"}
      </span>
      {full && (
        <>
          <Link href="/admin/cases" className={linkClass}>
            Кейсы
          </Link>
          <Link href="/admin/site-ui" className={linkClass}>
            Главная (карточки)
          </Link>
          <Link href="/admin/promos" className={linkClass}>
            Промокоды
          </Link>
          <Link href="/admin/users" className={linkClass}>
            Пользователи
          </Link>
          <Link href="/admin/audit-logs" className={linkClass}>
            Логи админов
          </Link>
        </>
      )}
      <Link href="/admin/support" className="text-sky-300/90 hover:text-sky-200">
        Обращения
      </Link>
    </>
  );
}
