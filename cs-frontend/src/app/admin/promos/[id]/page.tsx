"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PromoEditorForm } from "@/components/admin/PromoEditorForm";
import { apiFetch } from "@/lib/api";
import type { AdminPromo } from "@/lib/promoAdmin";

export default function EditPromoPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AdminPromo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await apiFetch<{ promo: AdminPromo }>(`/api/admin/promos/${id}`);
      if (!r.ok) {
        setErr(r.error || "Не найдено");
        return;
      }
      setData(r.data?.promo ?? null);
      setErr(null);
    })();
  }, [id]);

  if (err) {
    return (
      <p className="rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
        {err}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-zinc-500">
        Загрузка…
      </div>
    );
  }

  return <PromoEditorForm mode="edit" initial={data} />;
}
