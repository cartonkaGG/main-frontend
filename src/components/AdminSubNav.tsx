"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import {
  adminNavLogsLinks,
  adminNavMainLinks,
  adminNavPartnerLinks,
  adminNavRestLinks,
} from "@/config/adminNav";

type MeSession = {
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
};

const linkClass = "text-zinc-400 hover:text-white";

export function AdminSubNav() {
  const [me, setMe] = useState<MeSession | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setMe(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await apiFetch<MeSession>("/api/me/session");
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
        ← Вернуться на сайт
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
          <span className="text-zinc-600">Основное:</span>
          {adminNavMainLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-600">Логи:</span>
          {adminNavLogsLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-600">Партнерка:</span>
          {adminNavPartnerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass}>
              {label}
            </Link>
          ))}
          {adminNavRestLinks.length > 0 ? (
            <>
              <span className="text-zinc-700">|</span>
              {adminNavRestLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={linkClass}>
                  {label}
                </Link>
              ))}
            </>
          ) : null}
        </>
      )}
      {!full && (
        <Link href="/admin/support" className="text-sky-300/90 hover:text-sky-200">
          Обращения
        </Link>
      )}
    </>
  );
}
