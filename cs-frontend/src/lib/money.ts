/** Внутрішня валюта сайту (storm-coin); у UI — `SiteMoney` / блискавка або `SITE_CURRENCY_CODE`. */
export const SITE_CURRENCY_CODE = "SC";
export const SITE_CURRENCY_NAME = "storm-coin";

/** Формат числа балансу / ціни в одиницях сайту (раніше в UI позначалися як ₽). */
export function formatRub(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const s = n.toFixed(2);
  return s.endsWith(".00") ? s.slice(0, -3) : s;
}

/** Для рядків і aria: «123 SC». */
export function formatSiteAmount(value: number | null | undefined): string {
  return `${formatRub(value)} ${SITE_CURRENCY_CODE}`;
}

function groupThousandsInInt(intStr: string): string {
  const neg = intStr.startsWith("-");
  const d = neg ? intStr.slice(1) : intStr;
  const grouped = d.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return (neg ? "-" : "") + grouped;
}

/** Як `formatRub`, але з розрядним розділювачем (вузький пробіл між трійками цифр). */
export function formatRubSpaced(value: number | null | undefined): string {
  const base = formatRub(value);
  const dot = base.indexOf(".");
  if (dot === -1) return groupThousandsInInt(base);
  const intPart = base.slice(0, dot);
  const frac = base.slice(dot + 1);
  return `${groupThousandsInInt(intPart)}.${frac}`;
}

/** Як `formatSiteAmount`, з розрядним розділювачем у числі. */
export function formatSiteAmountSpaced(value: number | null | undefined): string {
  return `${formatRubSpaced(value)} ${SITE_CURRENCY_CODE}`;
}

