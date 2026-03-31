import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatRub } from "@/lib/money";
import { preferHighResSteamEconomyImage } from "@/lib/steamImage";

export type CaseSummary = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  skinImage?: string | null;
  /** % для картки каталогу (редактор); × глобальний homeCaseImageScale */
  cardCaseImageScale?: number;
  cardSkinImageScale?: number;
  category: string;
  featured?: boolean;
  accent: string;
};

/** Рамка, внутренний блик и более заметное цветное свечение — карточка читается на сетке фона */
export const CASE_FRAMES: Record<string, string> = {
  amber:
    "border-red-400/55 bg-gradient-to-br from-red-950/65 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_0_0_1px_rgba(255,49,49,0.12),0_22px_56px_-10px_rgba(255,49,49,0.5),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  orange:
    "border-orange-400/50 bg-gradient-to-br from-orange-950/55 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(249,115,22,0.1),0_22px_56px_-10px_rgba(249,115,22,0.38),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  rose:
    "border-rose-400/50 bg-gradient-to-br from-rose-950/50 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(244,63,94,0.11),0_22px_56px_-10px_rgba(244,63,94,0.4),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  violet:
    "border-violet-400/50 bg-gradient-to-br from-violet-950/55 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(139,92,246,0.12),0_22px_56px_-10px_rgba(139,92,246,0.42),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  emerald:
    "border-emerald-400/48 bg-gradient-to-br from-emerald-950/45 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(52,211,153,0.1),0_22px_56px_-10px_rgba(52,211,153,0.32),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  cyan:
    "border-cyan-400/48 bg-gradient-to-br from-cyan-950/45 via-[#0a1012] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(34,211,238,0.1),0_22px_56px_-10px_rgba(34,211,238,0.32),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  fuchsia:
    "border-fuchsia-400/50 bg-gradient-to-br from-fuchsia-950/50 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(217,70,239,0.11),0_22px_56px_-10px_rgba(217,70,239,0.4),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  yellow:
    "border-yellow-400/45 bg-gradient-to-br from-yellow-950/40 via-[#100a0e] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(234,179,8,0.1),0_22px_56px_-10px_rgba(234,179,8,0.34),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
  sky:
    "border-sky-400/50 bg-gradient-to-br from-sky-950/50 via-[#0a0e12] to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(56,189,248,0.11),0_22px_56px_-10px_rgba(56,189,248,0.36),0_8px_28px_-6px_rgba(0,0,0,0.75)]",
};

export type CaseCardProps = {
  c: CaseSummary;
  /** Глобальный множитель из /admin/site-ui, % (100 = без изменений); произведение с hero* кейса */
  homeCaseScalePct?: number;
  /** Глобальный множитель для скинов на главной, % */
  homeSkinScalePct?: number;
};

export function CaseCard({
  c,
  homeCaseScalePct = 100,
  homeSkinScalePct = 100,
}: CaseCardProps) {
  const frame = CASE_FRAMES[c.accent] || CASE_FRAMES.amber;
  const cat = CATEGORY_LABELS[c.category] || c.category;
  const cardCase = Math.min(180, Math.max(40, Math.round(Number(c.cardCaseImageScale) || 100)));
  const cardSkin = Math.min(180, Math.max(40, Math.round(Number(c.cardSkinImageScale) || 100)));
  const homeCase = Math.min(180, Math.max(40, Math.round(Number(homeCaseScalePct) || 100)));
  const homeSkin = Math.min(180, Math.max(40, Math.round(Number(homeSkinScalePct) || 100)));
  const casePct = Math.min(180, Math.max(40, Math.round((homeCase * cardCase) / 100)));
  const skinPct = Math.min(180, Math.max(40, Math.round((homeSkin * cardSkin) / 100)));
  const caseS = casePct / 100;
  const skinS = skinPct / 100;

  const caseSrc = c.image ? preferHighResSteamEconomyImage(c.image) ?? c.image : null;
  const skinSrc = c.skinImage ? preferHighResSteamEconomyImage(c.skinImage) ?? c.skinImage : null;

  /** Коробка: усиленный контраст, многослойное свечение и «ореол» */
  const caseImageClass =
    "relative z-[2] object-contain object-bottom opacity-100 transition duration-500 [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden] contrast-[1.15] saturate-[1.32] drop-shadow-[0_22px_56px_rgba(0,0,0,0.97),0_14px_36px_rgba(0,0,0,0.82),0_0_52px_rgba(255,49,49,0.58),0_0_100px_rgba(255,49,49,0.34),0_0_160px_rgba(255,49,49,0.14),0_0_3px_rgba(255,255,255,0.5),0_0_10px_rgba(249,115,22,0.3)] group-hover:contrast-[1.24] group-hover:saturate-[1.52] group-hover:drop-shadow-[0_28px_68px_rgba(0,0,0,0.99),0_18px_44px_rgba(0,0,0,0.9),0_0_72px_rgba(255,49,49,0.78),0_0_140px_rgba(255,49,49,0.48),0_0_220px_rgba(255,49,49,0.22),0_0_5px_rgba(255,255,255,0.75),0_0_18px_rgba(249,115,22,0.55)] group-hover:brightness-[1.16]";

  const caseSizes = "(max-width: 640px) 92vw, (max-width: 1280px) 34vw, (max-width: 1536px) 28vw, 520px";
  const skinSizes = "(max-width: 640px) 58vw, (max-width: 1280px) 24vw, 400px";

  return (
    <Link
      href={`/cases/${c.slug}`}
      className={`group relative isolate overflow-hidden rounded-2xl border transition duration-300 ease-out [transition-property:transform,filter,box-shadow] hover:-translate-y-1 hover:brightness-[1.05] hover:ring-2 hover:ring-cb-flame/35 hover:ring-offset-2 hover:ring-offset-[#020204] ${frame}`}
    >
      {c.featured && (
        <span className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-gradient-to-r from-red-600/95 to-cb-flame px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_4px_16px_rgba(255,49,49,0.45)] backdrop-blur-sm">
          Топ
        </span>
      )}
      <div className="relative aspect-[5/4] overflow-hidden rounded-t-2xl bg-gradient-to-b from-zinc-800/20 via-zinc-900/35 to-zinc-950/75">
        {caseSrc && skinSrc ? (
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-105">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <div className="relative h-full w-full origin-bottom transition duration-500 ease-out will-change-transform group-hover:scale-[1.06]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[56%] z-0 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_100%_85%_at_50%_52%,rgba(255,49,49,0.32),rgba(255,49,49,0.08)_50%,transparent_72%)] opacity-90 blur-[40px] transition duration-500 group-hover:opacity-100 group-hover:blur-[48px] sm:top-[55%]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[57%] z-[1] h-[58%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] bg-[radial-gradient(ellipse_96%_82%_at_50%_54%,rgba(255,49,49,0.92),rgba(255,49,49,0.28)_36%,rgba(255,49,49,0.08)_52%,transparent_76%)] opacity-100 blur-[28px] transition duration-500 group-hover:blur-[36px] sm:top-[56%] sm:h-[52%] sm:w-[60%]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[60%] z-[1] h-[32%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.26),rgba(255,255,255,0.06)_45%,transparent_68%)] opacity-90 blur-lg transition duration-500 group-hover:opacity-100 sm:top-[59%]"
                />
                <Image
                  src={caseSrc}
                  alt=""
                  fill
                  className={caseImageClass}
                  sizes={caseSizes}
                  quality={100}
                  priority={Boolean(c.featured)}
                  unoptimized
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[8%] pb-[12%]">
              <div
                className="relative aspect-square w-[72%] max-w-[220px] origin-center"
                style={{ transform: `scale(${skinS})` }}
              >
                <div className="cb-case-skin-float-y relative h-full w-full">
                  <Image
                    src={skinSrc}
                    alt=""
                    fill
                    className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
                    sizes={skinSizes}
                    quality={100}
                    priority={Boolean(c.featured)}
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        ) : caseSrc ? (
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-105">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <div className="relative h-full w-full origin-bottom transition duration-500 ease-out will-change-transform group-hover:scale-[1.06]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[56%] z-0 h-[72%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(ellipse_100%_85%_at_50%_52%,rgba(255,49,49,0.32),rgba(255,49,49,0.08)_50%,transparent_72%)] opacity-90 blur-[40px] transition duration-500 group-hover:opacity-100 group-hover:blur-[48px] sm:top-[55%]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[57%] z-[1] h-[58%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] bg-[radial-gradient(ellipse_96%_82%_at_50%_54%,rgba(255,49,49,0.92),rgba(255,49,49,0.28)_36%,rgba(255,49,49,0.08)_52%,transparent_76%)] opacity-100 blur-[28px] transition duration-500 group-hover:blur-[36px] sm:top-[56%] sm:h-[52%] sm:w-[60%]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[60%] z-[1] h-[32%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.26),rgba(255,255,255,0.06)_45%,transparent_68%)] opacity-90 blur-lg transition duration-500 group-hover:opacity-100 sm:top-[59%]"
                />
                <Image
                  src={caseSrc}
                  alt=""
                  fill
                  className={caseImageClass}
                  sizes={caseSizes}
                  quality={100}
                  priority={Boolean(c.featured)}
                  unoptimized
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-5xl font-black text-white/10 transition group-hover:text-white/20">
              {c.name.slice(0, 1)}
            </span>
            <span className="px-4 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
              {cat}
            </span>
          </div>
        )}
        {skinSrc && !c.image ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[8%]">
            <div
              className="relative aspect-square w-[72%] max-w-[220px] origin-center"
              style={{ transform: `scale(${skinS})` }}
            >
              <div className="cb-case-skin-float-y relative h-full w-full">
                <Image
                  src={skinSrc}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
                  sizes={skinSizes}
                  quality={100}
                  unoptimized
                />
              </div>
            </div>
          </div>
        ) : null}
        {/* Без полного затемнения над картинкой — только узкая полоса снизу к футеру */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-11 bg-gradient-to-t from-black/45 to-transparent sm:h-12" />
        <div
          className="pointer-events-none absolute bottom-0 left-3 right-3 z-[7] h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[8] rounded-t-2xl bg-[linear-gradient(125deg,transparent_38%,rgba(255,255,255,0.055)_50%,transparent_62%)] opacity-0 transition duration-500 group-hover:opacity-100" />
      </div>
      <div className="relative rounded-b-2xl border-t border-white/[0.07] bg-gradient-to-b from-zinc-950/95 via-black/92 to-black px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
        <p className="line-clamp-1 text-sm font-bold leading-tight tracking-tight text-white sm:text-[15px]">
          {c.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
          <span className="rounded border border-white/[0.06] bg-black/35 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            {cat}
          </span>
          <span
            className="inline-flex items-center rounded-md border border-orange-500/35 bg-gradient-to-r from-[#c2410c]/90 via-[#ea580c] to-[#dc2626] px-2 py-0.5 font-mono text-[11px] font-black tabular-nums tracking-tight text-white shadow-[0_2px_10px_rgba(234,88,12,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] sm:text-xs"
            title={`${formatRub(c.price)} ₽`}
          >
            {formatRub(c.price)}&nbsp;₽
          </span>
        </div>
      </div>
    </Link>
  );
}
