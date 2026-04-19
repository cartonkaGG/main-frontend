"use client";

import { useCallback, useRef, useState } from "react";
import { getToken, joinApiUrl } from "@/lib/api";
import { prepareImageForImgbbUpload } from "@/lib/prepareImageForUpload";

type Props = {
  onUploaded: (directImageUrl: string) => void;
  /** Коротка мітка для імені файлу на ImgBB */
  nameHint?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Завантажує зображення на [ImgBB](https://uk.imgbb.com/) через бекенд (`IMGBB_API_KEY`).
 */
export function ImgbbUploadButton({
  onUploaded,
  nameHint = "case",
  className,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const pick = useCallback(() => {
    setLocalErr(null);
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !file.type.startsWith("image/")) {
        if (file) setLocalErr("Выберите файл изображения.");
        return;
      }
      if (!getToken()) {
        setLocalErr("Нужен вход администратора.");
        return;
      }
      setBusy(true);
      setLocalErr(null);
      try {
        const imageBase64 = await prepareImageForImgbbUpload(file);
        const res = await fetch(joinApiUrl("/api/admin/imgbb/upload"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            credentials: "include",
            body: JSON.stringify({
              imageBase64,
              name: `${nameHint}-${file.name.replace(/[^\w.-]/g, "_").slice(0, 40)}`,
            }),
          });
        const text = await res.text();
        let data: { url?: string; error?: string } = {};
        try {
          data = text ? (JSON.parse(text) as { url?: string; error?: string }) : {};
        } catch {
          data = {};
        }
        if (!res.ok) {
          setLocalErr(data.error || `Ошибка ${res.status}`);
          setBusy(false);
          return;
        }
        if (!data.url) {
          setLocalErr("Сервер не вернул ссылку.");
          setBusy(false);
          return;
        }
        onUploaded(data.url);
      } catch {
        setLocalErr("Не удалось прочитать файл.");
      }
      setBusy(false);
    },
    [nameHint, onUploaded]
  );

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(ev) => void onChange(ev)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={pick}
        className={
          className ||
          "shrink-0 rounded-lg border border-violet-500/40 bg-violet-950/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200 transition hover:bg-violet-900/50 disabled:opacity-50"
        }
      >
        {busy ? "…" : children || "ImgBB"}
      </button>
      {localErr ? <span className="text-[10px] text-red-400">{localErr}</span> : null}
    </div>
  );
}
