"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PartnerMaterialBanner } from "@/components/PartnerMaterialBanner";

function PartnerMaterialBannerEmbedInner() {
  const searchParams = useSearchParams();
  const codeRaw = searchParams.get("code");
  const code = useMemo(() => {
    const raw = codeRaw?.trim();
    return raw && raw.length > 0 ? raw : null;
  }, [codeRaw]);

  return (
    <main className="relative z-[11] flex min-h-dvh min-w-0 flex-col items-center justify-center bg-black p-4">
      <PartnerMaterialBanner partnerPromoCode={code} />
      <p className="sr-only">StormBattle — материал партнёра для стрима</p>
    </main>
  );
}

export default function PartnerMaterialBannerEmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="relative z-[11] flex min-h-dvh items-center justify-center bg-black text-sm text-zinc-500">
          Загрузка…
        </div>
      }
    >
      <PartnerMaterialBannerEmbedInner />
    </Suspense>
  );
}
