import { CASE_FRAMES } from "@/components/CaseCard";

export const ACCENT_KEYS = Object.keys(CASE_FRAMES) as string[];

export const RARITY_OPTIONS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
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
  category: string;
  featured: boolean;
  accent: string;
  items: LootRow[];
};
