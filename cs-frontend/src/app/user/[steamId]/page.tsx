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
      <div className="relative mx-auto max-w-[min(92rem,100%)] px-2.5 py-6 sm:px-5 sm:py-9">
        <div className="group/card relative overflow-hidden rounded-2xl border border-orange-500/30 bg-[#060a12] shadow-[0_0_48px_-22px_rgba(234,88,12,0.35)] transition-[box-shadow,border-color] duration-700 ease-out hover:border-orange-400/35 hover:shadow-[0_0_64px_-18px_rgba(249,115,22,0.38)] motion-reduce:transition-none sm:rounded-[1.35rem]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/25 via-transparent to-orange-950/15"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-1/4 top-1/2 h-[min(72vw,520px)] w-[min(72vw,520px)] -translate-y-1/2 rounded-full bg-orange-600/12 blur-3xl motion-reduce:animate-none animate-pp-orb-drift"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-1/4 top-0 h-[min(58vw,440px)] w-[min(58vw,440px)] rounded-full bg-violet-600/14 blur-3xl motion-reduce:animate-none animate-pp-orb-drift-slow"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.055] motion-reduce:opacity-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse 88% 70% at 50% 22%, black, transparent 74%)",
            }}
            aria-hidden
          />

          <div className="relative p-4 sm:p-6">
            <div className="mb-3 flex justify-center sm:justify-start">
              <div className="flex items-center gap-2 motion-reduce:animate-none animate-pp-fade-up">
                <span
                  className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)] motion-reduce:animate-none motion-reduce:shadow-none animate-pp-label-shine"
                  aria-hidden
                />
                <p className="text-center text-[9px] font-bold uppercase tracking-[0.28em] text-orange-300/95 sm:text-left">
                  Публичный профиль
                </p>
              </div>
            </div>

            {loading ? (
              <div
                className="grid grid-cols-1 gap-3 py-1 motion-reduce:animate-none animate-pp-fade-in lg:grid-cols-12"
                aria-busy
              >
                <div className="h-44 rounded-xl bg-zinc-800/75 motion-reduce:animate-none animate-pp-skeleton lg:col-span-4" />
                <div
                  className="h-52 rounded-xl bg-zinc-800/65 motion-reduce:animate-none animate-pp-skeleton lg:col-span-4"
                  style={{ animationDelay: "80ms" }}
                />
                <div className="flex flex-col gap-2 lg:col-span-4">
                  <div
                    className="h-24 rounded-xl bg-zinc-800/55 motion-reduce:animate-none animate-pp-skeleton"
                    style={{ animationDelay: "140ms" }}
                  />
                  <div
                    className="h-24 rounded-xl bg-zinc-800/55 motion-reduce:animate-none animate-pp-skeleton"
                    style={{ animationDelay: "200ms" }}
                  />
                  <div
                    className="h-24 rounded-xl bg-zinc-800/55 motion-reduce:animate-none animate-pp-skeleton"
                    style={{ animationDelay: "260ms" }}
                  />
                </div>
              </div>
            ) : err ? (
              <div className="motion-reduce:animate-none animate-pp-fade-in py-8 text-center">
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
                <div className="motion-reduce:animate-none animate-pp-fade-up flex flex-col gap-3 border-b border-cb-stroke/35 pb-5 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-3">
                  {/* Ліва колонка — користувач + кейси */}
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-cb-stroke/50 bg-gradient-to-b from-white/[0.04] to-black/35 p-4 shadow-inner lg:col-span-4 lg:items-stretch">
                    <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-start lg:flex-col lg:items-center">
                      <div className="relative shrink-0">
                        <div
                          className="pointer-events-none absolute -inset-[2px] rounded-xl opacity-90 motion-reduce:hidden"
                          aria-hidden
                        >
                          <div className="h-full w-full rounded-xl bg-[conic-gradient(from_0deg,#ea5808,#a855f7,#0ea5e9,#f97316,#ea5808)] blur-[0.75px]" />
                        </div>
                        <div className="relative h-[4.75rem] w-[4.75rem] overflow-hidden rounded-xl border border-white/10 bg-black/55 shadow-lg ring-1 ring-white/[0.06] sm:h-[5.25rem] sm:w-[5.25rem]">
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
                        <h1 className="text-base font-black tracking-tight text-white sm:text-lg">{data.displayName}</h1>
                        <p
                          className="mt-0.5 font-mono text-[10px] text-zinc-500"
                          title={data.steamId}
                        >
                          ID {data.steamId.length > 8 ? `…${data.steamId.slice(-6)}` : data.steamId}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://steamcommunity.com/profiles/${encodeURIComponent(data.steamId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-950/25 px-3 py-2 text-xs font-bold text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-950/40"
                    >
                      Steam
                      <span className="text-sky-300/80" aria-hidden>
                        ↗
                      </span>
                    </a>
                  </div>

                  {/* Центр — лучший дроп */}
                  <div className="flex min-h-[12rem] flex-col lg:col-span-4 lg:min-h-[15rem]">
                    {data.bestEverItem && data.bestEverItem.name ? (
                      <div className="relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 via-[#0a0a12] to-black/80 p-3 shadow-[0_0_36px_-14px_rgba(245,158,11,0.28)] sm:min-h-[15.5rem] sm:p-4 lg:min-h-0">
                        <div className="relative z-[1] flex items-start justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/95">
                            Лучший дроп
                          </p>
                          <SiteMoney
                            value={data.bestEverItem.sellPrice}
                            className="text-sm font-black text-amber-100"
                            iconClassName="h-4 w-4 text-amber-400"
                          />
                        </div>
                        <div className="relative z-[1] flex flex-1 items-center justify-center py-1 sm:py-2">
                          <div className="relative h-[12.5rem] w-[94%] max-w-[20rem] sm:h-[14.75rem] sm:max-w-[24rem]">
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
                        <div className="relative z-[1] mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-amber-500/20 pt-2.5">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-left text-xs font-semibold leading-snug text-white sm:text-sm">
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
                      <div className="flex h-full min-h-[11rem] flex-col items-center justify-center rounded-xl border border-dashed border-cb-stroke/45 bg-black/25 p-4 text-center lg:min-h-[13.5rem]">
                        <p className="text-xs text-zinc-500">Нет данных о лучшем предмете</p>
                      </div>
                    )}
                  </div>

                  {/* Права колонка — кейсы, вывод, апгрейды */}
                  {st ? (
                    <div className="flex flex-col gap-2 overflow-visible lg:col-span-4">
                      <div className="group relative z-[1] flex items-center justify-between gap-2 overflow-visible rounded-xl border border-orange-500/25 bg-gradient-to-r from-black/40 to-orange-950/20 px-3 py-2.5 shadow-sm transition hover:border-orange-400/35 sm:py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">Открыто кейсов:</p>
                          <p className="mt-1 text-xl font-black tabular-nums text-white">{st.casesOpened}</p>
                        </div>
                        <PublicProfileStatHeroArt variant="cases" />
                      </div>
                      <div className="group relative z-[2] flex items-center justify-between gap-2 overflow-visible rounded-xl border border-sky-500/25 bg-gradient-to-r from-black/40 to-sky-950/20 px-3 py-2.5 shadow-sm transition hover:border-sky-400/35 sm:py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">Выведено:</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {ruPredmetCountLabel(st.withdrawalsCompletedCount ?? 0)}
                          </p>
                          <div className="mt-1.5">
                            <SiteMoney
                              value={st.withdrawalsCompletedTotalRub ?? 0}
                              className="text-sm font-black text-zinc-100"
                              iconClassName="h-4 w-4 text-amber-400"
                            />
                          </div>
                        </div>
                        <PublicProfileStatHeroArt variant="withdraw" />
                      </div>
                      <div className="group relative z-[3] flex items-center justify-between gap-2 overflow-visible rounded-xl border border-violet-500/25 bg-gradient-to-r from-black/40 to-violet-950/20 px-3 py-2.5 shadow-sm transition hover:border-violet-400/35 sm:py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">Апгрейдов сделано:</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xl font-black tabular-nums text-white">
                            <span
                              className="inline-flex -translate-y-px flex-col text-[9px] font-black leading-[0.55] text-amber-400 motion-reduce:animate-none animate-pp-stat-zap"
                              aria-hidden
                            >
                              <span>▲</span>
                              <span>▲</span>
                            </span>
                            {st.upgradesDone}
                          </p>
                        </div>
                        <PublicProfileStatHeroArt variant="upgrade" />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div id="public-activity" className="mt-6 scroll-mt-20">
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">История предметов</h2>
                  <p className="mt-1 text-xs text-zinc-500">
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
                      <div className="absolute inset-0 z-10 flex items-start justify-center bg-[#060a12]/60 pt-8 backdrop-blur-[1px]">
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
                        className="rounded-xl border-2 border-cb-stroke/70 bg-zinc-950/80 px-8 py-3 text-sm font-bold uppercase tracking-wide text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cb-flame/50 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
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
