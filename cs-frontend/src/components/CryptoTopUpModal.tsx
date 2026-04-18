"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";
import { SITE_CURRENCY_CODE } from "@/lib/money";
import { requestAuthModal } from "@/lib/authModal";
import { SITE_MONEY_CTA_COMPACT_CLASS } from "@/lib/siteMoneyStyles";

type CryptoOpt = { payCurrency: string; title: string; sub: string };

type Config = {
  enabled: boolean;
  ipnUrlConfigured?: boolean;
  minUsd: number;
  rubPerUsd: number;
  cryptos: CryptoOpt[];
};

type DepositPreview = {
  rubPerUsd: number;
  creditRubBase: number;
  bonusPercent: number;
  bonusRub: number;
  totalRub: number;
  promoError: string | null;
  partnerReferralError?: string | null;
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
  const [preview, setPreview] = useState<DepositPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  useEffect(() => {
    if (!open || !cfg?.enabled) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    if (!getToken()) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    const usd = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(usd) || usd <= 0) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(() => {
      setPreviewLoading(true);
      void (async () => {
        const r = await apiFetch<DepositPreview>("/api/nowpayments/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountUsd: usd,
            promoCode: promo.trim() || undefined,
            partnerReferralCode: promo.trim() || undefined,
          }),
        });
        if (cancelled) return;
        setPreviewLoading(false);
        if (r.ok && r.data) setPreview(r.data);
        else setPreview(null);
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, cfg?.enabled, amount, promo]);

  if (!open) return null;

  const minUsd = cfg?.minUsd ?? 10;
  /** Тільки з відповіді `/api/nowpayments/config` — без «стрибка» після завантаження не показуємо прев’ю в SC. */
  const rubPerServer = cfg?.rubPerUsd;
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
        partnerReferralCode: promo.trim() || undefined,
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

  const parsedUsd = Number(String(amount).replace(",", "."));
  const guestPreviewRub =
    rubPerServer != null && Number.isFinite(parsedUsd) && parsedUsd > 0
      ? Math.floor(parsedUsd * rubPerServer)
      : null;

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
          {/* Ліва колонка: способи оплати (крипта + далі додасте); під «Крипта» — банер FreeKassa */}
          <aside className="flex shrink-0 flex-col border-b border-cb-stroke/70 bg-black/35 lg:w-44 lg:border-b-0 lg:border-r">
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
            <div className="border-t border-cb-stroke/60 px-2 pb-2 pt-1 lg:px-3 lg:pb-3 lg:pt-2">
              <a href="https://freekassa.net/" target="_blank" rel="noopener noreferrer">
                <Image
                  src="https://cdn.freekassa.net/banners/big-dark-1.png"
                  title="Прием платежей на сайте для физических лиц и т.д."
                  alt=""
                  width={468}
                  height={60}
                  className="h-auto w-full max-w-full object-contain"
                />
              </a>
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
              Зачисление на баланс ({SITE_CURRENCY_CODE}) по курсу, который задаёт админ (Админка → Интерфейс / site-ui). В
              интерфейсе суммы отображаются с иконкой молнии.
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

                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Сумма (USD)
                      </span>
                      <div className="flex h-11 items-stretch rounded-xl border border-cb-stroke/80 bg-black/50">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-white"
                          placeholder={`мин. ${minUsd}`}
                        />
                        <span className="flex items-center pr-3 font-mono text-xs text-zinc-500">USD</span>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Промокод (бонус к депозиту)
                      </span>
                      <p className="text-[10px] leading-snug text-zinc-600">
                        Промокод сайта или код партнёра — бонус задаётся в админке.
                      </p>
                      <div className="flex h-11 items-stretch rounded-xl border border-cb-stroke/80 bg-black/50">
                        <span className="flex items-center pl-3 text-zinc-600" aria-hidden>
                          %
                        </span>
                        <input
                          value={promo}
                          onChange={(e) => setPromo(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-zinc-600"
                          placeholder="необязательно"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void submit()}
                      className={`${SITE_MONEY_CTA_COMPACT_CLASS} h-11 shrink-0 sm:min-w-[140px]`}
                    >
                      {busy ? "…" : "Пополнить"}
                    </button>
                  </div>
                  <div className="space-y-1 text-[10px] text-zinc-600">
                    {preview && !previewLoading ? (
                      <>
                        <p className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          База:{" "}
                          <SiteMoney
                            value={preview.creditRubBase}
                            className="text-zinc-400"
                            iconClassName="h-[0.85em] w-[0.85em] text-zinc-400"
                          />{" "}
                          · курс{" "}
                          <span className="font-mono text-zinc-500">{preview.rubPerUsd.toFixed(2)}</span>{" "}
                          {SITE_CURRENCY_CODE}/USD (курс сайта)
                        </p>
                        {preview.bonusPercent > 0 ? (
                          <p className="inline-flex flex-wrap items-center gap-x-1 text-emerald-200/90">
                            Бонус по промокоду +{preview.bonusPercent}%: +{" "}
                            <SiteMoney
                              value={preview.bonusRub}
                              className="text-emerald-200/90"
                              iconClassName="h-[0.85em] w-[0.85em] text-emerald-300"
                            />
                          </p>
                        ) : null}
                        <p className="inline-flex flex-wrap items-center gap-x-1 font-medium text-zinc-300">
                          Итого на баланс:{" "}
                          <SiteMoney
                            value={preview.totalRub}
                            className="text-white"
                            iconClassName="h-[0.85em] w-[0.85em] text-white"
                          />
                        </p>
                        {preview.promoError ? (
                          <p className="text-amber-200/90">{preview.promoError}</p>
                        ) : null}
                        {preview.partnerReferralError ? (
                          <p className="text-amber-200/90">{preview.partnerReferralError}</p>
                        ) : null}
                      </>
                    ) : previewLoading ? (
                      <p className="text-zinc-500">Расчёт суммы…</p>
                    ) : guestPreviewRub != null && rubPerServer != null ? (
                      <p className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        ≈{" "}
                        <SiteMoney
                          value={guestPreviewRub}
                          className="text-zinc-400"
                          iconClassName="h-[0.85em] w-[0.85em] text-zinc-400"
                        />{" "}
                        без бонуса (войдите, чтобы увидеть итог с промокодом). Курс{" "}
                        <span className="font-mono text-zinc-500">{rubPerServer.toFixed(2)}</span>{" "}
                        {SITE_CURRENCY_CODE}/USD (курс сайта)
                      </p>
                    ) : rubPerServer != null ? (
                      <p>
                        Курс <span className="font-mono text-zinc-500">{rubPerServer.toFixed(2)}</span>{" "}
                        {SITE_CURRENCY_CODE}/USD (курс сайта). Введите сумму в USD.
                      </p>
                    ) : (
                      <p className="text-zinc-600">Загрузка курса…</p>
                    )}
                  </div>
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
