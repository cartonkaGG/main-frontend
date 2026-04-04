const SITE_MONEY_CTA_CORE =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-red-500 to-[#b91c1c] text-sm font-bold text-white shadow-[0_6px_22px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:brightness-110 disabled:opacity-45";

/** CTA з грошима (відкриття, продаж, поповнення). */
export const SITE_MONEY_CTA_CLASS = `${SITE_MONEY_CTA_CORE} px-4 py-3`;

/** Компактний CTA (шапка, мобільне меню). */
export const SITE_MONEY_CTA_COMPACT_CLASS = `${SITE_MONEY_CTA_CORE} px-4 py-2 text-[11px] font-black uppercase tracking-wide`;

/** Дуже компактний (мобільна шапка). */
export const SITE_MONEY_CTA_TINY_CLASS = `${SITE_MONEY_CTA_CORE} px-3 py-2 text-[10px] font-black uppercase tracking-wide`;

/** CTA на всю ширину в мобільному ряді. */
export const SITE_MONEY_CTA_WIDE_CLASS = `${SITE_MONEY_CTA_CLASS} w-full flex-1 sm:w-auto sm:flex-none`;
