"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerFaqAccordion } from "@/components/PartnerFaqAccordion";
import { PartnerMaterialBanner } from "@/components/PartnerMaterialBanner";
import { PartnerMaterialBannerShare } from "@/components/PartnerMaterialBannerShare";
import { PartnerMaterialWideBannerShare } from "@/components/PartnerMaterialWideBannerShare";
import { PartnerMaterialWideTitleBanner } from "@/components/PartnerMaterialWideTitleBanner";
import { PartnerLevelsProgress } from "@/components/PartnerLevelsProgress";
import { usePartnerCabinetTab } from "@/contexts/PartnerCabinetTabContext";

type Dash = {
  partner: {
    id: string;
    percentBps: number;
    percentDisplay: string;
    /** Рівень партнерки / рефералки (стартово 1). */
    level: number;
    totalEarnedConfirmedRub: number;
    totalEarnedPendingRub: number;
    totalPaidOutRub: number;
    usersActivated: number;
    depositsCount: number;
    depositsVolumeRub: number;
  };
  user?: {
    steamId: string | null;
    displayName: string | null;
    username: string | null;
    avatar: string;
  } | null;
  codes: { id: string; code: string; label: string; active: boolean; depositBonusPercent?: number }[];
  earnings: {
    id: string;
    at: string;
    orderId: string;
    netDepositRub: number;
    percentBps: number;
    rewardRub: number;
    status: string;
  }[];
};

export default function PartnerDashboardPage() {
  const { tab } = usePartnerCabinetTab();
  const [data, setData] = useState<Dash | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const r = await apiFetch<Dash>("/api/partner/me");
    if (!r.ok) setErr(r.error || "Ошибка загрузки");
    else setData(r.data || null);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /** Промокод для баннера «Материал»: перший активный или любой первый из списка. */
  const materialPartnerPromoCode = useMemo(() => {
    const list = data?.codes ?? [];
    const picked = list.find((c) => c.active) ?? list[0];
    const raw = picked?.code?.trim();
    return raw && raw.length > 0 ? raw : null;
  }, [data?.codes]);

  if (err) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!data?.partner) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cb-flame/30 border-t-cb-flame" />
      </div>
    );
  }

  const p = data.partner;

  return (
    <div className="py-16">
      {tab === "analytics" ? (
      <div className="space-y-8">
        <PartnerLevelsProgress
          initialReferralsCount={Math.max(0, Math.floor(Number(p.usersActivated) || 0))}
          totalEarnedRub={Math.max(0, Math.floor(Number(p.totalEarnedPendingRub) || 0))}
          pendingEarnedRub={Math.max(0, Math.floor(Number(p.totalEarnedPendingRub) || 0))}
          totalPaidOutRub={Math.max(0, Math.floor(Number(p.totalPaidOutRub) || 0))}
          promoCodes={(data?.codes ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            active: c.active,
            depositBonusPercent: c.depositBonusPercent,
          }))}
          onBalanceClaimed={() => void loadDashboard()}
        />
      </div>
      ) : null}

      {tab === "material" ? (
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Материал</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Баннер и материалы для продвижения StormBattle — можно размещать на стримах и в соцсетях.
            </p>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Баннер для OBS и описания</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Горизонтальная карточка: логотип, оффер и переворот на промокод — вставьте ссылку ниже в источник «Браузер».
              </p>
            </div>
            <PartnerMaterialBannerShare partnerPromoCode={materialPartnerPromoCode} />
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4 md:p-5">
              <PartnerMaterialBanner partnerPromoCode={materialPartnerPromoCode} />
            </div>
          </section>

          <section className="space-y-4 border-t border-white/[0.06] pt-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Широкий баннер · анимация</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Тексты сменяются по кругу — удобно как заголовок под стримом или в шапке поста.
              </p>
            </div>
            <PartnerMaterialWideBannerShare partnerPromoCode={materialPartnerPromoCode} />
            <div className="flex justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-6">
              <PartnerMaterialWideTitleBanner partnerPromoCode={materialPartnerPromoCode} />
            </div>
          </section>
        </div>
      ) : null}

      {tab === "faq" ? <PartnerFaqAccordion showLevels={false} /> : null}
    </div>
  );
}
