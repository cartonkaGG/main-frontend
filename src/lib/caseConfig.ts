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
};

export type AdminCaseFull = {
  slug: string;
  name: string;
  price: number;
  image: string;
  /** Картинка предмета поверх коробки (PNG з прозорістю), опціонально */
  skinImage: string;
  /** Масштаб коробки на сторінці відкриття, % (40–180), 100 = дефолт */
  heroCaseImageScale?: number;
  /** Масштаб PNG скіна над кейсом, % */
  heroSkinImageScale?: number;
  category: string;
  featured: boolean;
  accent: string;
  items: LootRow[];
};
