"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function configuredSiteOrigin(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) return null;
  try {
    const base = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    return new URL(base).origin;
  } catch {
    return null;
  }
}

function resolveShareOrigin(): string {
  const fromEnv = configuredSiteOrigin();
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function buildWideEmbedUrl(origin: string, partnerPromoCode: string | null): string {
  const path = "/embed/partner-material-wide";
  const u = new URL(path, origin.endsWith("/") ? origin : `${origin}/`);
  const c = partnerPromoCode?.trim();
  if (c) u.searchParams.set("code", c);
  return u.toString();
}

type WideShareProps = {
  partnerPromoCode: string | null;
};

/** Окрема посилання на широкий баннер з анімацією текстів — для OBS / соцмереж. */
export function PartnerMaterialWideBannerShare({ partnerPromoCode }: WideShareProps) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(resolveShareOrigin());
  }, []);

  const previewUrl = useMemo(() => {
    if (!origin) return "";
    return buildWideEmbedUrl(origin, partnerPromoCode);
  }, [origin, partnerPromoCode]);

  const onCopy = useCallback(async () => {
    setErr(false);
    const o = resolveShareOrigin();
    if (!o) return;
    try {
      await navigator.clipboard.writeText(buildWideEmbedUrl(o, partnerPromoCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setErr(true);
    }
  }, [partnerPromoCode]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-950/80 p-4 sm:p-5">
      <p className="text-sm font-medium text-zinc-200">Ссылка — широкий баннер (анимация текста)</p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        Storm Battle → +20% к депозиту → промокод. Параметр <span className="font-mono text-zinc-400">?code=</span> в ссылке
        подставляет код на баннер.
      </p>
      {previewUrl ? (
        <p className="mt-3 break-all font-mono text-[11px] leading-snug text-zinc-600 sm:text-xs">{previewUrl}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-red-700 to-cb-flame px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_24px_rgba(220,38,38,0.25)] transition hover:brightness-110 active:brightness-95"
        >
          {copied ? "Скопировано" : "Скопировать ссылку"}
        </button>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Открыть в новой вкладке
          </a>
        ) : null}
      </div>
      {err ? <p className="mt-2 text-xs text-amber-200/90">Не удалось скопировать — выделите ссылку выше вручную.</p> : null}
    </div>
  );
}
