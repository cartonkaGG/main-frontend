import { CASE_FRAMES } from "@/components/CaseCard";

export const ACCENT_KEYS = Object.keys(CASE_FRAMES) as string[];

/** Узгоджено з backend `caseConstants.LOOT_RARITIES` */
export const RARITY_OPTIONS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "consumer",
  "industrial",
  "milspec",
  "mil-spec",
  "restricted",
  "classified",
  "covert",
  "extraordinary",
  "contraband",
] as const;

export const CATEGORY_SUGGESTIONS = [
  "popular",
  "serial",
  "brand",
  "knife",
  "valve",
];

export type LootRow = {
  name: string;
  rarity: (typeof RARITY_OPTIONS)[number];
  sellPrice: number;
  weight: number;
  image: string;
  /** Якщо задано — для цін з market.csgo.com (точний market_hash_name з їхнього JSON) */
  dmarketTitle?: string;
};

export type AdminCaseFull = {
  slug: string;
  name: string;
  price: number;
  image: string;
  /** Картинка предмета поверх коробки (PNG з прозорістю), опціонально */
  skinImage: string;
  /** Масштаб коробки на картці головної, % (× глобальний з /admin/site-ui) */
  cardCaseImageScale?: number;
  cardSkinImageScale?: number;
  /** Масштаб коробки в hero на /cases/[slug], % */
  heroCaseImageScale?: number;
  /** Масштаб PNG скіна на сторінці кейсу, % */
  heroSkinImageScale?: number;
  category: string;
  /** Порядок на головній у межах категорії */
  homeOrder?: number;
  featured: boolean;
  /** Не показывать в каталоге и блокировать открытие на сайте */
  hidden?: boolean;
  accent: string;
  items: LootRow[];
};
