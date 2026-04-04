import Image from "next/image";
import Link from "next/link";
import { SitePriceBadge } from "@/components/SitePriceBadge";
import { preferHighResSteamEconomyImage } from "@/lib/steamImage";

/** RGB акценту кейса (як у CASE_FRAMES) — підсвітка ззаду відповідає полю Accent у редакторі. */
const ACCENT_RGB: Record<string, readonly [number, number, number]> = {
  amber: [255, 49, 49],
  orange: [249, 115, 22],
  rose: [244, 63, 94],
  violet: [139, 92, 246],
  emerald: [52, 211, 153],
  cyan: [34, 211, 238],
  fuchsia: [217, 70, 239],
  yellow: [234, 179, 8],
  sky: [56, 189, 248],
};

function rgbForAccent(accent: string | undefined): readonly [number, number, number] {
  const k = String(accent || "amber").toLowerCase();
  return ACCENT_RGB[k] ?? ACCENT_RGB.amber;
}

/** Два кольорові ореоли + нейтральний блік (як раніше). */
function CaseGlowBackdrops({ accent }: { accent: string }) {
  const [r, g, b] = rgbForAccent(accent);
  const outer = `radial-gradient(ellipse 100% 85% at 50% 52%, rgba(${r},${g},${b},0.38), rgba(${r},${g},${b},0.11) 50%, transparent 78%)`;
  const mid = `radial-gradient(ellipse 96% 82% at 50% 54%, rgba(${r},${g},${b},0.95), rgba(${r},${g},${b},0.32) 36%, rgba(${r},${g},${b},0.1) 52%, transparent 80%)`;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[56%] z-0 h-[86%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-95 blur-[48px] transition duration-500 group-hover:opacity-100 group-hover:blur-[56px] sm:top-[55%]"
        style={{ background: outer }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[57%] z-[1] h-[70%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] opacity-100 blur-[34px] transition duration-500 group-hover:blur-[42px] sm:top-[56%] sm:h-[64%] sm:w-[72%]"
        style={{ background: mid }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[60%] z-[1] h-[38%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),rgba(255,255,255,0.07)_45%,transparent_70%)] opacity-95 blur-xl transition duration-500 group-hover:opacity-100 sm:top-[59%]"
      />
    </>
  );
}

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

/** Кольорові рамки для адмінки / прев’ю акценту (на головній картці не використовуються). */
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
  homeCaseScalePct?: number;
  homeSkinScalePct?: number;
};

export function CaseCard({
  c,
  homeCaseScalePct = 100,
  homeSkinScalePct = 100,
}: CaseCardProps) {
  const cardCase = Math.min(180, Math.max(40, Math.round(Number(c.cardCaseImageScale) || 100)));
  const cardSkin = Math.min(180, Math.max(40, Math.round(Number(c.cardSkinImageScale) || 100)));
  const homeCase = Math.min(180, Math.max(40, Math.round(Number(homeCaseScalePct) || 100)));
  const homeSkin = Math.min(180, Math.max(40, Math.round(Number(homeSkinScalePct) || 100)));
  const casePctRaw = Math.min(180, Math.max(40, Math.round((homeCase * cardCase) / 100)));
  const skinPctRaw = Math.min(180, Math.max(40, Math.round((homeSkin * cardSkin) / 100)));
  /** Легке збільшення прев’ю в каталозі (обмежено 180%). Кейс трохи більший за скін. */
  const caseBoost = 1.14;
  const skinBoost = 1.08;
  const casePct = Math.min(180, Math.max(40, Math.round(casePctRaw * caseBoost)));
  const skinPct = Math.min(180, Math.max(40, Math.round(skinPctRaw * skinBoost)));
  const caseS = casePct / 100;
  const skinS = skinPct / 100;

  const caseSrc = c.image ? preferHighResSteamEconomyImage(c.image, "caseArt") ?? c.image : null;
  const skinSrc = c.skinImage ? preferHighResSteamEconomyImage(c.skinImage) ?? c.skinImage : null;
  const [nr, ng, nb] = rgbForAccent(c.accent);
  /** Неон як у задній підсвітці кейса (той самий accent). */
  const caseNameGlow = `0 0 10px rgba(${nr},${ng},${nb},0.85), 0 0 22px rgba(${nr},${ng},${nb},0.55), 0 0 38px rgba(${nr},${ng},${nb},0.32), 0 1px 2px rgba(0,0,0,0.92)`;
  const caseNameGlowHover = `0 0 14px rgba(${nr},${ng},${nb},0.95), 0 0 30px rgba(${nr},${ng},${nb},0.68), 0 0 52px rgba(${nr},${ng},${nb},0.4), 0 1px 2px rgba(0,0,0,0.92)`;

  const caseImageClass =
    "relative z-[2] object-contain object-bottom opacity-100 transition duration-500 [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden] contrast-[1.15] saturate-[1.32] drop-shadow-[0_22px_56px_rgba(0,0,0,0.97),0_14px_36px_rgba(0,0,0,0.82),0_0_52px_rgba(255,49,49,0.58),0_0_100px_rgba(255,49,49,0.34),0_0_160px_rgba(255,49,49,0.14),0_0_3px_rgba(255,255,255,0.5),0_0_10px_rgba(249,115,22,0.3)] group-hover:contrast-[1.24] group-hover:saturate-[1.52] group-hover:drop-shadow-[0_28px_68px_rgba(0,0,0,0.99),0_18px_44px_rgba(0,0,0,0.9),0_0_72px_rgba(255,49,49,0.78),0_0_140px_rgba(255,49,49,0.48),0_0_220px_rgba(255,49,49,0.22),0_0_5px_rgba(255,255,255,0.75),0_0_18px_rgba(249,115,22,0.55)] group-hover:brightness-[1.16]";

  const caseSizes = "(max-width: 640px) 92vw, (max-width: 1280px) 36vw, (max-width: 1536px) 30vw, 560px";
  const skinSizes = "(max-width: 640px) 62vw, (max-width: 1280px) 26vw, 440px";

  return (
    <Link
      href={`/cases/${c.slug}`}
      className="group relative z-0 block overflow-visible rounded-xl outline-none transition-[z-index] duration-0 hover:z-[8] focus-visible:z-[8] focus-visible:ring-2 focus-visible:ring-cb-flame/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020204]"
      style={
        {
          ["--case-name-glow" as string]: caseNameGlow,
          ["--case-name-glow-hover" as string]: caseNameGlowHover,
        } as React.CSSProperties
      }
    >
      <div className="transition duration-300 ease-out [transition-property:transform,opacity] group-hover:scale-[1.02] group-hover:opacity-[0.97]">
        {/*
          Негативний margin-top згортається з батьком — зсувається вся картка.
          translateY зміщує лише візуально назву вгору (потік лишається).
        */}
        <div className="relative z-[11] mb-1.5 -translate-y-2 px-0.5 text-center sm:-translate-y-3 sm:mb-2">
          <p
            className="line-clamp-2 w-full text-[17px] font-bold leading-snug tracking-tight text-white transition-[text-shadow] duration-300 [text-shadow:var(--case-name-glow)] group-hover:[text-shadow:var(--case-name-glow-hover)] sm:text-[19px]"
          >
            {c.name}
          </p>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-visible rounded-xl bg-transparent">
          {caseSrc && skinSrc ? (
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-[1.02]">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <div className="relative h-full w-full origin-bottom transition duration-500 ease-out will-change-transform group-hover:scale-[1.025]">
                <CaseGlowBackdrops accent={c.accent} />
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
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[10%] pb-[14%] sm:p-[9%] sm:pb-[13%]">
              <div
                className="relative aspect-square w-[78%] max-w-[248px] origin-center"
                style={{ transform: `scale(${skinS})` }}
              >
                <div className="cb-case-skin-float-y relative h-full w-full">
                  <Image
                    src={skinSrc}
                    alt=""
                    fill
                    className="object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.58)] [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
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
          <div className="absolute inset-0 origin-center transition duration-500 ease-out group-hover:scale-[1.02]">
            <div
              className="absolute inset-x-0 bottom-0 top-[-4%] origin-bottom sm:top-[-5%]"
              style={{ transform: `scale(${caseS})` }}
            >
              <div className="relative h-full w-full origin-bottom transition duration-500 ease-out will-change-transform group-hover:scale-[1.025]">
                <CaseGlowBackdrops accent={c.accent} />
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
          <div className="flex h-full w-full flex-col items-center justify-center bg-white/[0.03]">
            <span className="text-6xl font-black text-white/10 transition group-hover:text-white/20 sm:text-7xl">
              {c.name.slice(0, 1)}
            </span>
          </div>
        )}
        {skinSrc && !c.image ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-[8%]">
            <div
              className="relative aspect-square w-[78%] max-w-[248px] origin-center"
              style={{ transform: `scale(${skinS})` }}
            >
              <div className="cb-case-skin-float-y relative h-full w-full">
                <Image
                  src={skinSrc}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_8px_28px_rgba(0,0,0,0.58)] [transform:translateZ(0)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
                  sizes={skinSizes}
                  quality={100}
                  unoptimized
                />
              </div>
            </div>
          </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 z-[8] rounded-xl bg-[linear-gradient(125deg,transparent_38%,rgba(255,255,255,0.04)_50%,transparent_62%)] opacity-0 transition duration-500 group-hover:opacity-100" />
        </div>
      </div>
      <div className="mt-2 flex flex-col items-center px-0.5 text-center sm:mt-2.5">
        <SitePriceBadge value={c.price} size="md" />
      </div>
    </Link>
  );
}
