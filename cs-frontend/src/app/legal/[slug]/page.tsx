import { notFound } from "next/navigation";
import { LegalDocClient } from "./LegalDocClient";
import { isLegalSlug } from "@/lib/legalDocs";

export default function LegalDocumentPage({ params }: { params: { slug: string } }) {
  if (!isLegalSlug(params.slug)) {
    notFound();
  }
  return <LegalDocClient slug={params.slug} />;
}
