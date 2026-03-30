import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatRub } from "@/lib/money";

export type CaseSummary = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
  featured?: boolean;
  accent: string;
};

export const CASE_FRAMES: Record<string, string> = {
  amber:
    "border-red-600/45 bg-gradient-to-br from-red-600/18 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(255,49,49,0.4)]",
  orange:
    "border-orange-600/45 bg-gradient-to-br from-orange-600/18 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(255,49,49,0.32)]",
  rose:
    "border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(244,63,94,0.3)]",
  violet:
    "border-violet-500/40 bg-gradient-to-br from-violet-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]",
  emerald:
    "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(52,211,153,0.25)]",
  cyan:
    "border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]",
  fuchsia:
    "border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(217,70,239,0.35)]",
  yellow:
    "border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(234,179,8,0.3)]",
  sky:
    "border-sky-500/40 bg-gradient-to-br from-sky-500/15 via-zinc-900/85 to-zinc-950 shadow-[0_0_40px_-12px_rgba(56,189,248,0.3)]",
};

export function CaseCard({ c }: { c: CaseSummary }) {
  const frame = CASE_FRAMES[c.accent] || CASE_FRAMES.amber;
  const cat = CATEGORY_LABELS[c.category] || c.category;

  return (
    <Link
      href={`/cases/${c.slug}`}
      className={`group relative overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-0.5 hover:brightness-110 ${frame}`}
    >
      {c.featured && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-red-600 to-cb-flame px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-red-900/40">
          Топ
        </span>
      )}
      <div className="relative aspect-[5/4] overflow-hidden bg-black/30">
        {c.image ? (
          <Image
            src={c.image}
            alt=""
            fill
            className="object-cover opacity-95 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
            sizes="(max-width: 768px) 100vw, 25vw"
            unoptimized
          />
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
      </div>
      <div className="relative border-t border-cb-stroke/40 bg-black/20 px-4 py-3 backdrop-blur-sm">
        <p className="line-clamp-1 text-base font-semibold text-white">{c.name}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">{cat}</span>
          <span className="font-mono text-sm font-bold text-cb-flame">
            {formatRub(c.price)} ₽
          </span>
        </div>
      </div>
    </Link>
  );
}
