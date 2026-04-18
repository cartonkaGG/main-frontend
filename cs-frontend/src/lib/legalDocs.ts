import { apiBase } from "@/lib/api";

export type LegalDocsMeta = {
  terms: { version: number; title: string };
  privacy: { version: number; title: string };
  cookies: { version: number; title: string };
};

export async function fetchLegalDocsMeta(): Promise<LegalDocsMeta | null> {
  try {
    const res = await fetch(`${apiBase}/api/legal-docs`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as LegalDocsMeta;
  } catch {
    return null;
  }
}

export function legalAcceptPayload(meta: LegalDocsMeta) {
  return {
    termsVersion: meta.terms.version,
    privacyVersion: meta.privacy.version,
    cookiesVersion: meta.cookies.version,
  };
}

export const LEGAL_SLUGS = ["terms", "privacy", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(s: string): s is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(s);
}
