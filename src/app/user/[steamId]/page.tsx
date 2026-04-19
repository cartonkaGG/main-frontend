"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  PublicProfileActivityCard,
  type PublicProfileActivity,
} from "@/components/PublicProfileActivityCard";
import { SiteShell } from "@/components/SiteShell";
import { SiteMoney } from "@/components/SiteMoney";
import { apiFetch } from "@/lib/api";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import { SITE_MONEY_CTA_CLASS } from "@/lib/siteMoneyStyles";
import { PublicProfileStatHeroArt } from "@/components/PublicProfileStatHeroArt";

function ruPredmetCountLabel(n: number): string {
  const k = Math.floor(Math.abs(n)) % 100;
  const d = k % 10;
  let w: string;
  if (k > 10 && k < 20) w = "предметов";
  else if (d === 1) w = "предмет";
  else if (d >= 2 && d <= 4) w = "предмета";
  else w = "предметов";
  return `${n} ${w}`;
}

/** 8 карток у ряд × 4 ряди на сторінці */
const ACTIVITY_PAGE_SIZE = 32;

type PublicUserPayload = {
  steamId: string;
  displayName: string;
  avatar: string;
  stats: {
    casesOpened: number;
    upgradesDone: number;
    withdrawalsCompletedCount: number;
    withdrawalsCompletedTotalRub: number;
  };
  bestEverItem?: {
    name: string;
    rarity: string;
    sellPrice: number;
    image: string | null;
    source?: string;
  } | null;
  activity: PublicProfileActivity[];
  activityTotal: number;
  activityPage: number;
  activityPageSize: number;
};

function normalizePublicResponse(
  d: PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
  requestedPage: number,
) {
  const legacy = d;
  const activity = Array.isArray(d.activity)
    ? d.activity
    : Array.isArray(legacy.recentActivity)
      ? legacy.recentActivity
      : [];
  const activityTotal =
    typeof d.activityTotal === "number"
      ? d.activityTotal
      : Array.isArray(legacy.recentActivity)
        ? legacy.recentActivity.length
        : activity.length;
  const ps =
    typeof d.activityPageSize === "number" && d.activityPageSize > 0
      ? d.activityPageSize
      : ACTIVITY_PAGE_SIZE;
  const ap =
    typeof d.activityPage === "number" && d.activityPage >= 1 ? d.activityPage : requestedPage;
  return { activity, activityTotal, ps, ap };
}

function PublicUserBody({ steamId }: { steamId: string }) {
  const [data, setData] = useState<PublicUserPayload | null>(null);
  const [activityItems, setActivityItems] = useState<PublicProfileActivity[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [lastLoadedPage, setLastLoadedPage] = useState(0);
  const [resolvedPageSize, setResolvedPageSize] = useState(ACTIVITY_PAGE_SIZE);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadMoreBusy, setLoadMoreBusy] = useState(false);

  const fetchActivityPage = useCallback(
    async (page: number) => {
      const q = new URLSearchParams({
        activityPage: String(page),
        activityPageSize: String(ACTIVITY_PAGE_SIZE),
      });
      return apiFetch<PublicUserPayload>(
        `/api/users/${encodeURIComponent(steamId)}/public?${q.toString()}`,
        { cache: "no-store" },
      );
    },
    [steamId],
  );

  useEffect(() => {
    if (!steamId) {
      setErr("Не указан Steam ID");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setActivityItems([]);
    setLastLoadedPage(0);
    setActivityTotal(0);
    void (async () => {
      const r = await fetchActivityPage(1);
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setData(null);
        setErr(r.status === 404 ? "Пользователь не найден" : r.error || "Ошибка загрузки");
        return;
      }
      const d = r.data;
      if (!d) {
        setData(null);
        return;
      }
      const { activity, activityTotal: total, ps, ap } = normalizePublicResponse(
        d as PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
        1,
      );
      setData({
        ...d,
        activity,
        activityTotal: total,
        activityPage: ap,
        activityPageSize: ps,
      });
      setActivityItems(activity);
      setActivityTotal(total);
      setResolvedPageSize(ps);
      setLastLoadedPage(ap);
    })();
    return () => {
      cancelled = true;
    };
  }, [steamId, fetchActivityPage]);

  const loadMore = useCallback(async () => {
    if (!steamId || !data || loadMoreBusy) return;
    if (activityItems.length >= activityTotal) return;
    const nextPage = lastLoadedPage + 1;
    setLoadMoreBusy(true);
    const r = await fetchActivityPage(nextPage);
    setLoadMoreBusy(false);
    if (!r.ok || !r.data) return;
    const { activity, ap } = normalizePublicResponse(
      r.data as PublicUserPayload & { recentActivity?: PublicProfileActivity[] },
      nextPage,
    );
    if (activity.length === 0) return;
    setActivityItems((prev) => [...prev, ...activity]);
    setLastLoadedPage(ap);
  }, [
    steamId,
    data,
    loadMoreBusy,
    activityItems.length,
    activityTotal,
    lastLoadedPage,
    fetchActivityPage,
  ]);

  const st = data?.stats;
  const hasMore = activityTotal > 0 && activityItems.length < activityTotal;

  return (
    <SiteShell>
      <div className="relative mx-auto w-full max-w-[min(96rem,calc(100vw-1.5rem))] px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-12">
        <div className="relative overflow-hidden rounded-2xl border border-cb-stroke/70 bg-gradient-to-b from-[#0a0a0f]/95 via-cb-panel/50 to-black/90 bg-cb-mesh shadow-[inset_0_1px_0_rgba(255,49,49,0.08),0_20px_60px_rgba(0,0,0,0.35)]">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_40%,rgba(255,49,49,0.07)_50%,transparent_60%)]"
            aria-hidden
          />

          <div className="relative px-4 pb-8 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-5 flex justify-center sm:justify-start">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 sm:text-left sm:text-[11px]">
                Публичный профиль
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-2 py-1 lg:grid-cols-12" aria-busy>
                <div className="h-36 animate-pulse rounded-xl border border-cb-stroke/40 bg-black/35 lg:col-span-4" />
                <div className="h-40 animate-pulse rounded-xl border border-cb-stroke/40 bg-black/35 lg:col-span-4" />
                <div className="flex flex-col gap-1.5 lg:col-span-4">
                  <div className="h-[4.25rem] animate-pulse rounded-xl border border-cb-stroke/40 bg-black/35" />
                  <div className="h-[4.25rem] animate-pulse rounded-xl border border-cb-stroke/40 bg-black/35" />
                  <div className="h-[4.25rem] animate-pulse rounded-xl border border-cb-stroke/40 bg-black/35" />
                </div>
              </div>
            ) : err ? (
              <div className="py-8 text-center">
                <p className="text-sm text-red-300/95">{err}</p>
                <Link
                  href="/"
                  className={`${SITE_MONEY_CTA_CLASS} mt-6 inline-flex px-6 py-2.5 text-sm transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100`}
                >
                  На главную
                </Link>
              </div>
            ) : data ? (
              <>
                <div className="flex flex-col gap-3 border-b border-cb-stroke/35 pb-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-3">
                  {/* Ліва колонка — користувач + Steam */}
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-cb-stroke/55 bg-black/40 p-3 shadow-inner sm:gap-2.5 sm:p-3.5 lg:col-span-4">
                    <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-start sm:gap-3 lg:flex-col lg:items-center">
                      <div className="relative shrink-0">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-cb-stroke/60 bg-black/50 ring-2 ring-cb-flame/35 sm:h-[4.25rem] sm:w-[4.25rem]">
                          {data.avatar ? (
                            <Image
                              src={data.avatar}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="96px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-lg text-zinc-600">?</div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 text-center sm:text-left lg:text-center">
                        <h1 className="text-sm font-black tracking-tight text-white sm:text-base">{data.displayName}</h1>
                        <p className="mt-0.5 line-clamp-2 break-all font-mono text-[9px] leading-tight text-zinc-500 sm:text-[10px]">
                          {data.steamId}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://steamcommunity.com/profiles/${encodeURIComponent(data.steamId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-cb-stroke/60 bg-black/45 transition hover:border-sky-500/45 hover:bg-sky-950/20"
                      aria-label="Профиль в Steam"
                      title="Профиль в Steam"
                    >
                      <Image
                        src="/brand/steam-mark.png"
                        alt=""
                        width={26}
                        height={26}
                        className="h-[1.35rem] w-[1.35rem] object-contain"
                        unoptimized
                      />
                    </a>
                  </div>

                  {/* Центр — лучший дроп */}
                  <div className="flex min-h-0 flex-col lg:col-span-4">
                    {data.bestEverItem && data.bestEverItem.name ? (
                      <div className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-cb-stroke/60 bg-gradient-to-br from-amber-950/20 via-[#09090d] to-black/85 p-2.5 shadow-inner ring-1 ring-amber-600/15 sm:p-3">
                        <div className="relative z-[1] flex items-start justify-between gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/95 sm:text-[10px]">
                            Лучший дроп
                          </p>
                          <SiteMoney
                            value={data.bestEverItem.sellPrice}
                            className="text-xs font-black text-amber-100 sm:text-sm"
                            iconClassName="h-3.5 w-3.5 text-amber-400 sm:h-4 sm:w-4"
                          />
                        </div>
                        <div className="relative z-[1] flex flex-1 items-center justify-center py-0.5 sm:py-1">
                          <div className="relative h-[9rem] w-[92%] max-w-[17rem] sm:h-[10.5rem] sm:max-w-[19rem]">
                            <div
                              className="pointer-events-none absolute inset-0 z-0 overflow-visible motion-reduce:opacity-70"
                              aria-hidden
                            >
                              <div className="absolute left-1/2 top-[46%] h-[72%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-amber-300/45 via-amber-500/25 to-orange-600/10 blur-[40px] motion-reduce:blur-md sm:top-1/2 sm:h-[78%] sm:w-[62%] sm:blur-[52px]" />
                              <div className="absolute left-1/2 top-[40%] h-[48%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/25 blur-[28px] motion-reduce:blur-sm sm:top-[38%]" />
                            </div>
                            {data.bestEverItem.image ? (
                              <Image
                                src={
                                  preferHighResSteamEconomyImage(data.bestEverItem.image) ??
                                  data.bestEverItem.image
                                }
                                alt=""
                                fill
                                className={`relative z-[1] object-contain object-center ${SKIN_IMG_QUALITY_CLASS} -rotate-6 drop-shadow-[0_14px_32px_rgba(0,0,0,0.6)] drop-shadow-[0_0_28px_rgba(251,191,36,0.5)] drop-shadow-[0_0_56px_rgba(245,158,11,0.22)] transition-transform duration-500 hover:-rotate-3 hover:scale-[1.03] motion-reduce:hover:scale-100`}
                                sizes="(max-width:640px) 320px, 384px"
                                quality={100}
                                unoptimized
                              />
                            ) : (
                              <div className="relative z-[1] flex h-full items-center justify-center rounded-xl bg-black/35 text-2xl text-zinc-600">
                                ?
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="relative z-[1] mt-auto flex flex-wrap items-end justify-between gap-1.5 border-t border-amber-500/20 pt-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-left text-[11px] font-semibold leading-snug text-white sm:text-xs">
                              {data.bestEverItem.name}
                            </p>
                            {data.bestEverItem.rarity ? (
                              <p className="mt-0.5 text-left text-[10px] text-zinc-500">{data.bestEverItem.rarity}</p>
                            ) : null}
                          </div>
                          {data.bestEverItem.source ? (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                data.bestEverItem.source === "upgrade"
                                  ? "border-violet-500/40 bg-violet-950/50 text-violet-200/95"
                                  : "border-emerald-500/40 bg-emerald-950/45 text-emerald-200/95"
                              }`}
                            >
                              {data.bestEverItem.source === "upgrade" ? "Апгрейд" : "Кейс"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-xl border border-dashed border-cb-stroke/45 bg-black/25 p-3 text-center sm:min-h-[9rem]">
                        <p className="text-xs text-zinc-500">Нет данных о лучшем предмете</p>
                      </div>
                    )}
                  </div>

                  {/* Права колонка — кейсы, вывод, апгрейды */}
                  {st ? (
                    <div className="flex flex-col gap-1.5 overflow-visible lg:col-span-4">
                      <div className="group relative z-[1] flex min-h-0 items-center justify-between gap-1.5 overflow-hidden rounded-xl border border-cb-stroke/55 bg-black/40 px-2.5 py-2 shadow-inner transition hover:border-cb-flame/25 sm:px-3">
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[10px]">
                            Открыто кейсов
                          </p>
                          <p className="mt-0.5 font-mono text-lg font-black tabular-nums leading-none text-cb-flame sm:text-xl">
                            {st.casesOpened}
                          </p>
                        </div>
                        <PublicProfileStatHeroArt variant="cases" compact />
                      </div>
                      <div className="group relative z-[2] flex min-h-0 items-center justify-between gap-1.5 overflow-hidden rounded-xl border border-cb-stroke/55 bg-black/40 px-2.5 py-2 shadow-inner transition hover:border-cb-flame/25 sm:px-3">
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[10px]">Выведено</p>
                          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-[11px]">
                            {ruPredmetCountLabel(st.withdrawalsCompletedCount ?? 0)}
                          </p>
                          <div className="mt-0.5">
                            <SiteMoney
                              value={st.withdrawalsCompletedTotalRub ?? 0}
                              className="text-xs font-black text-zinc-200 sm:text-sm"
                              iconClassName="h-3.5 w-3.5 text-cb-flame sm:h-4 sm:w-4"
                            />
                          </div>
                        </div>
                        <PublicProfileStatHeroArt variant="withdraw" compact />
                      </div>
                      <div className="group relative z-[3] flex min-h-0 items-center justify-between gap-1.5 overflow-hidden rounded-xl border border-cb-stroke/55 bg-black/40 px-2.5 py-2 shadow-inner transition hover:border-cb-flame/25 sm:px-3">
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 sm:text-[10px]">
                            Апгрейдов сделано
                          </p>
                          <p className="mt-0.5 font-mono text-lg font-black tabular-nums leading-none text-cb-flame sm:text-xl">
                            {st.upgradesDone}
                          </p>
                        </div>
                        <PublicProfileStatHeroArt variant="upgrade" compact />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div id="public-activity" className="mt-6 scroll-mt-20">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:text-xs">
                    История предметов
                  </h2>
                  <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">
                    8 предметов в ширину, подгружается по {resolvedPageSize} шт.
                    {activityTotal > 0 ? (
                      <>
                        {" "}
                        · показано{" "}
                        <span className="font-semibold text-zinc-400">{activityItems.length}</span> из{" "}
                        <span className="font-semibold text-zinc-400">{activityTotal}</span>
                      </>
                    ) : null}
                  </p>

                  <div className="relative mt-4">
                    {loadMoreBusy ? (
                      <div className="absolute inset-0 z-10 flex items-start justify-center bg-black/55 pt-8 backdrop-blur-[1px]">
                        <span className="text-xs text-zinc-400">Загрузка…</span>
                      </div>
                    ) : null}
                    {activityItems.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-cb-stroke/50 bg-black/20 px-4 py-10 text-center text-sm text-zinc-500">
                        Пока нет записей в логах.
                      </p>
                    ) : (
                      <div className="-mx-2 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                        <div
                          className="mx-auto grid w-full min-w-[36rem] grid-cols-8 gap-1.5 sm:min-w-0 sm:gap-2"
                          style={{ gridAutoRows: "minmax(0, auto)" }}
                        >
                          {activityItems.map((row, i) => (
                            <PublicProfileActivityCard
                              key={`${row.kind}-${row.at}-${i}`}
                              row={row}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {hasMore ? (
                    <div className="mt-6 flex justify-center border-t border-cb-stroke/25 pt-6">
                      <button
                        type="button"
                        disabled={loadMoreBusy}
                        onClick={() => void loadMore()}
                        className="rounded-xl border border-cb-stroke/60 bg-black/40 px-6 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-300 shadow-inner transition hover:border-cb-flame/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {loadMoreBusy ? "Загрузка…" : "Загрузить ещё"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-center sm:justify-start">
                  <Link href="/" className={`${SITE_MONEY_CTA_CLASS} px-6 py-2.5 text-sm`}>
                    На главную
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

export default function PublicUserPage({ params }: { params: { steamId: string } }) {
  const steamId = decodeURIComponent(params.steamId || "").trim();
  return <PublicUserBody key={steamId} steamId={steamId} />;
}
