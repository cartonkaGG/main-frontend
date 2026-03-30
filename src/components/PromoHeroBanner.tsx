"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { formatRub } from "@/lib/money";

type FeaturedPromo = {
  id: string;
  code: string;
  bonusPercent: number;
  bannerSubline: string;
  endsAt: string | null;
  hasReward: boolean;
  rewardType?: "balance" | "depositPct";
  depositPercent?: number;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function HexGridBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.22]"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(249,115,22,0.12) 1px, transparent 1px),
          linear-gradient(rgba(249,115,22,0.08) 1px, transparent 1px),
          linear-gradient(60deg, transparent 48%, rgba(168,85,247,0.06) 49%, rgba(168,85,247,0.06) 51%, transparent 52%)
        `,
        backgroundSize: "28px 28px, 28px 28px, 56px 56px",
      }}
    />
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-1.5 w-1.5 rotate-45 bg-amber-300 shadow-[0_0_8px_rgba(250,204,21,0.9)] ${className || ""}`}
    />
  );
}

export function PromoHeroBanner() {
  const [featured, setFeatured] = useState<FeaturedPromo | null>(null);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const loadFeatured = useCallback(async () => {
    const r = await apiFetch<{ promo: FeaturedPromo | null }>("/api/promo/featured");
    if (r.ok) setFeatured(r.data?.promo ?? null);
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    const h = () => loadFeatured();
    window.addEventListener("cd-promos-updated", h);
    return () => window.removeEventListener("cd-promos-updated", h);
  }, [loadFeatured]);

  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      const r = await apiFetch<{ isAdmin?: boolean }>("/api/me");
      if (r.ok) setIsAdmin(Boolean(r.data?.isAdmin));
      setAdminChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!featured?.endsAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [featured?.endsAt]);

  const endsMs = featured?.endsAt ? new Date(featured.endsAt).getTime() : null;
  const remaining =
    endsMs != null && Number.isFinite(endsMs)
      ? endsMs - Date.now() + 0 * tick
      : null;

  async function redeem(code: string) {
    const c = code.trim();
    if (!c) return;
    if (!getToken()) {
      setMsg("Войдите через Steam, чтобы активировать.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await apiFetch<{
      granted?: number;
      newBalance?: number;
      depositPercent?: number;
      error?: string;
    }>(
      "/api/promo/redeem",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      }
    );
    setBusy(false);
    if (!r.ok) {
      setMsg(r.error || "Не удалось активировать");
      return;
    }
    if (typeof r.data?.depositPercent === "number") {
      setMsg(`+${r.data.depositPercent}% к депозиту`);
    } else {
      setMsg(
        `+${formatRub(r.data?.granted ?? 0)} ₽ на баланс. Всего: ${
          typeof r.data?.newBalance === "number" ? formatRub(r.data.newBalance) : "—"
        } ₽`
      );
    }
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMsg("Код скопирован");
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg("Не удалось скопировать");
    }
  }

  const displayCode = featured?.code || "";
  const pct = featured?.bonusPercent ?? 0;
  const subline = featured?.bannerSubline || "НА СЧЁТ";

  return (
    <section className="relative px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-orange-500/30 bg-[#060a12] shadow-[0_0_80px_-25px_rgba(234,88,12,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/40 via-transparent to-orange-950/20"
          aria-hidden
        />
        <HexGridBg />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]"
          aria-hidden
        />

        <div className="relative grid gap-8 p-6 sm:gap-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_auto_minmax(0,1fr)] lg:items-center">
          {/* Ваучеры + бейдж +N% / подпись */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative flex items-center pl-2">
              <div className="relative h-[7.5rem] w-[6.5rem] shrink-0 sm:h-[8.5rem] sm:w-[7.5rem]">
                <div
                  className="absolute left-0 top-2 z-[1] h-[85%] w-[78%] rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-700 via-purple-900 to-violet-950 shadow-[8px_8px_24px_rgba(0,0,0,0.5)]"
                  style={{ transform: "rotate(-10deg)" }}
                />
                <div
                  className="absolute bottom-0 right-0 z-[2] flex h-[92%] w-[82%] flex-col items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-violet-600 via-fuchsia-800 to-purple-950 shadow-[0_12px_40px_rgba(88,28,135,0.55)]"
                  style={{ transform: "rotate(6deg)" }}
                >
                  <span className="text-[0.55rem] font-bold uppercase tracking-[0.35em] text-white/70">
                    Voucher
                  </span>
                  <span className="mt-1 text-5xl font-black leading-none text-amber-300 drop-shadow-[0_2px_12px_rgba(250,204,21,0.5)] sm:text-6xl">
                    %
                  </span>
                </div>
                <Sparkle className="left-[8%] top-[12%]" />
                <Sparkle className="right-[12%] top-[20%] h-2 w-2" />
                <Sparkle className="bottom-[18%] left-[18%]" />
              </div>

              <div className="relative z-[3] -ml-3 min-w-0 overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-orange-500/20 sm:-ml-4">
                <div className="bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 px-7 py-4 sm:px-9 sm:py-5">
                  <p className="text-center text-4xl font-black tracking-tight text-white drop-shadow-md sm:text-5xl">
                    +{pct}%
                  </p>
                </div>
                <div className="bg-gradient-to-b from-violet-900 via-purple-950 to-[#1e0b2e] px-6 py-3 sm:px-8 sm:py-3.5">
                  <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-white/95 sm:text-sm">
                    {subline}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Таймер */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-[20rem] overflow-hidden rounded-2xl border border-orange-400/45 bg-[#0c1220]/85 p-5 shadow-[0_0_32px_-8px_rgba(249,115,22,0.35)] backdrop-blur-md sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  background:
                    "radial-gradient(circle at 70% 50%, rgba(59,130,246,0.2), transparent 55%)",
                }}
              />
              <div className="relative flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 sm:text-[11px]">
                    Осталось времени:
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-wide text-white sm:text-3xl">
                    {featured && remaining == null
                      ? "Бессрочно"
                      : remaining != null && remaining <= 0
                        ? "00:00:00"
                        : remaining != null
                          ? formatRemaining(remaining)
                          : "— — —"}
                  </p>
                  {remaining != null && remaining <= 0 && featured && (
                    <p className="mt-2 text-xs font-medium text-red-400/90">Акция завершена</p>
                  )}
                  {featured && remaining == null && (
                    <p className="mt-2 text-xs text-zinc-500">Без дедлайна</p>
                  )}
                </div>
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-2xl shadow-lg shadow-blue-900/50 ring-2 ring-amber-400/40"
                  aria-hidden
                >
                  ⚡
                </div>
              </div>
            </div>
          </div>

          {/* Код */}
          <div className="flex flex-col items-center gap-4 lg:items-end">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 lg:text-right">
              Используй промокод
            </p>
            {displayCode ? (
              <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-sm lg:items-end">
                <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 p-[2px] shadow-[0_12px_40px_rgba(234,88,12,0.35)]">
                  <div className="rounded-[0.9rem] bg-[#0a0e18]/90 px-6 py-3.5 text-center backdrop-blur-sm sm:px-8">
                    <span className="font-mono text-xl font-black tracking-[0.15em] text-white sm:text-2xl">
                      {displayCode}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
                  {getToken() && !adminChecked ? (
                    <div className="px-4 py-2 text-xs font-semibold text-zinc-400">
                      Загрузка…
                    </div>
                  ) : isAdmin ? null : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => copyCode(displayCode)}
                        className="rounded-xl border border-violet-500/40 bg-violet-950/40 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:border-violet-400/60 hover:bg-violet-900/40 disabled:opacity-50"
                      >
                        Копировать
                      </button>
                      <button
                        type="button"
                        disabled={busy || (remaining != null && remaining <= 0)}
                        onClick={() => redeem(displayCode)}
                        className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/40 transition hover:brightness-110 disabled:opacity-50"
                      >
                        Активировать
                      </button>
                    </>
                  )}
                </div>
                {msg && (
                  <p className="max-w-sm text-center text-xs leading-relaxed text-amber-200/90 lg:text-right">
                    {msg}
                  </p>
                )}
              </div>
            ) : (
              <p className="max-w-xs text-center text-sm leading-relaxed text-zinc-500 lg:text-right">
                Главный промокод не назначен. Админ может включить «на баннер» в разделе промокодов.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
