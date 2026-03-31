"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";

type CryptoOpt = { payCurrency: string; title: string; sub: string };

type Config = {
  enabled: boolean;
  ipnUrlConfigured?: boolean;
  minUsd: number;
  rubPerUsd: number;
  cryptos: CryptoOpt[];
};

const panelClass =
  "rounded-2xl border border-cb-stroke/90 bg-gradient-to-br from-black/50 via-cb-panel/95 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,49,49,0.08)]";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CryptoTopUpModal({ open, onClose, onSuccess }: Props) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [selected, setSelected] = useState<string>("usdttrc20");
  const [amount, setAmount] = useState<string>("10");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCfg = useCallback(async () => {
    const r = await apiFetch<Config>("/api/nowpayments/config");
    if (r.ok && r.data) setCfg(r.data);
  }, []);

  useEffect(() => {
    if (open) {
      void loadCfg();
      setErr(null);
    }
  }, [open, loadCfg]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const minUsd = cfg?.minUsd ?? 10;
  const rubPer = cfg?.rubPerUsd ?? 95;
  const cryptos = cfg?.cryptos?.length ? cfg.cryptos : [];

  async function submit() {
    setErr(null);
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    if (!cfg?.enabled) {
      setErr("На сервере не задан NOWPAYMENTS_API_KEY.");
      return;
    }
    if (cfg.ipnUrlConfigured === false) {
      setErr("Задайте BACKEND_PUBLIC_URL или NOWPAYMENTS_IPN_CALLBACK_URL на бэкенде — без этого NOWPayments не пришлёт IPN.");
      return;
    }
    const usd = Number(amount.replace(",", "."));
    if (!Number.isFinite(usd) || usd < minUsd) {
      setErr(`Минимум ${minUsd} USD`);
      return;
    }
    setBusy(true);
    const r = await apiFetch<{
      invoiceUrl: string;
      creditRubEstimate: number;
      bonusPercent: number;
    }>("/api/nowpayments/create-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountUsd: usd,
        payCurrency: selected,
        promoCode: promo.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    if (r.data?.invoiceUrl) {
      onSuccess?.();
      window.location.href = r.data.invoiceUrl;
    }
  }

  const previewRub = Math.floor(Number(amount.replace(",", ".")) * rubPer) || 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-topup-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative flex max-h-[min(92vh,860px)] w-full max-w-[920px] flex-col overflow-hidden ${panelClass}`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg border border-cb-stroke/80 bg-black/50 px-2.5 py-1 text-sm text-zinc-400 transition hover:border-cb-flame/40 hover:text-white"
          aria-label="Закрыть"
        >
          ✕
        </button>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Левая полоса — только крипта */}
          <aside className="flex shrink-0 border-b border-cb-stroke/70 bg-black/35 lg:w-44 lg:flex-col lg:border-b-0 lg:border-r">
            <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:p-3">
              <div className="flex min-w-[120px] items-center gap-2 rounded-lg border-l-2 border-cb-flame bg-cb-flame/10 px-3 py-2.5 lg:min-w-0">
                <span className="text-lg" aria-hidden>
                  ◎
                </span>
                <div className="leading-tight">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cb-flame">Крипта</p>
                  <p className="text-[9px] text-zinc-500">NOWPayments</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <h2
              id="crypto-topup-title"
              className="mb-1 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-lg font-bold uppercase tracking-wide text-transparent"
            >
              Пополнение баланса (крипта)
            </h2>
            <p className="mb-5 text-[11px] text-zinc-500">
              Оплата через NOWPayments. Минимум <span className="font-mono text-zinc-400">{minUsd} USD</span>.
              Зачисление на баланс в ₽ (курс задаётся на сервере).
            </p>

            {err ? (
              <p className="mb-3 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-300">{err}</p>
            ) : null}

            {cfg === null ? (
              <p className="text-sm text-zinc-500">Загрузка настроек…</p>
            ) : !cfg.enabled ? (
              <p className="text-sm text-zinc-500">Укажите NOWPAYMENTS_API_KEY на сервере.</p>
            ) : cfg.ipnUrlConfigured === false ? (
              <p className="text-sm text-amber-200/90">
                Для приёма платежей укажите публичный URL бэкенда (<span className="font-mono text-amber-100/90">BACKEND_PUBLIC_URL</span>) или полный{" "}
                <span className="font-mono text-amber-100/90">NOWPAYMENTS_IPN_CALLBACK_URL</span> (например через ngrok).
              </p>
            ) : (
              <>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Выберите валюту</p>
                <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {cryptos.map((c) => {
                    const on = selected === c.payCurrency;
                    return (
                      <button
                        key={c.payCurrency}
                        type="button"
                        onClick={() => setSelected(c.payCurrency)}
                        className={`flex flex-col rounded-xl border px-2 py-2.5 text-left transition sm:px-3 ${
                          on
                            ? "border-cb-flame/70 bg-cb-flame/10 shadow-[0_0_16px_rgba(255,49,49,0.15)]"
                            : "border-cb-stroke/70 bg-black/40 hover:border-cb-stroke hover:bg-black/50"
                        }`}
                      >
                        <span className="text-[12px] font-bold text-white">{c.title}</span>
                        <span className="text-[9px] text-zinc-500">{c.sub}</span>
                        <span className="mt-1 font-mono text-[9px] uppercase text-cb-flame/90">{c.payCurrency}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Сумма (USD)</span>
                    <div className="flex rounded-xl border border-cb-stroke/80 bg-black/50">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-white"
                        placeholder={`мин. ${minUsd}`}
                      />
                      <span className="flex items-center pr-3 font-mono text-xs text-zinc-500">USD</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      ≈ <span className="font-mono text-zinc-400">{previewRub}</span> ₽ без бонуса
                    </span>
                  </label>
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Промокод</span>
                    <div className="flex rounded-xl border border-cb-stroke/80 bg-black/50">
                      <span className="flex items-center pl-3 text-zinc-600" aria-hidden>
                        %
                      </span>
                      <input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-zinc-600"
                        placeholder="необязательно"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void submit()}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-red-800 to-cb-flame px-6 py-3 text-[12px] font-black uppercase tracking-widest text-white shadow-[0_8px_28px_rgba(255,49,49,0.3)] transition hover:brightness-110 disabled:opacity-45 sm:py-3.5"
                  >
                    {busy ? "…" : "Пополнить"}
                  </button>
                </div>

                <p className="mt-5 text-[10px] leading-relaxed text-zinc-600">
                  Если прошло больше 30 минут после оплаты, а баланс не обновился — напишите в поддержку с номером
                  заказа из истории платежа NOWPayments.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
