"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";

type PartnerBehavior = {
  minDepositRub: number;
  promoBindMode: "user" | "order";
};

type PartnerPromoRow = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  depositBonusPercent: number;
};

type PartnerRow = {
  _id: string;
  userSub: string;
  percentBps: number;
  active: boolean;
  internalNote?: string;
  totalEarnedConfirmedRub?: number;
  totalEarnedPendingRub?: number;
  totalPaidOutRub?: number;
  usersActivated?: number;
  minDepositRub?: number;
  promoBindMode?: string;
  /** Профиль из User (для админки) */
  steamId?: string | null;
  displayName?: string;
  avatar?: string;
  codes?: PartnerPromoRow[];
};

type CabinetDash = {
  user?: {
    steamId: string | null;
    displayName: string | null;
    username: string | null;
    avatar: string;
  } | null;
  partner: {
    id: string;
    percentBps: number;
    percentDisplay: string;
    level?: number;
    active: boolean;
    totalEarnedConfirmedRub: number;
    totalEarnedPendingRub: number;
    totalPaidOutRub: number;
    usersActivated: number;
    depositsCount: number;
    depositsVolumeRub: number;
    minDepositRub: number;
    promoBindMode: string;
  };
  codes: {
    id: string;
    code: string;
    label: string;
    active: boolean;
    depositBonusPercent: number;
  }[];
  earnings: {
    id: string;
    at: string;
    orderId: string;
    netDepositRub: number;
    percentBps: number;
    rewardRub: number;
    status: string;
  }[];
};

function defaultBehavior(p: PartnerRow): PartnerBehavior {
  return {
    minDepositRub: p.minDepositRub ?? 100,
    promoBindMode: p.promoBindMode === "order" ? "order" : "user",
  };
}

function formatEarningStatusRu(status: string) {
  switch (status) {
    case "pending":
      return "ожидает зачисления";
    case "credited":
      return "зачислено на баланс";
    case "confirmed":
      return "подтверждено (старые данные)";
    case "void":
      return "отменено";
    default:
      return status;
  }
}

function PartnerPromoEditRow({
  partnerId,
  c,
  onSaved,
  onError,
}: {
  partnerId: string;
  c: PartnerPromoRow;
  onSaved: () => void;
  onError?: (msg: string) => void;
}) {
  const [code, setCode] = useState(c.code);
  const [label, setLabel] = useState(c.label || "");
  const [active, setActive] = useState(c.active);
  const [pct, setPct] = useState(String(c.depositBonusPercent));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setCode(c.code);
    setLabel(c.label || "");
    setActive(c.active);
    setPct(String(c.depositBonusPercent));
  }, [c.id, c.code, c.label, c.active, c.depositBonusPercent]);

  async function save() {
    const v = Math.min(100, Math.max(0, Math.floor(Number(String(pct).replace(",", ".")) || 0)));
    const normCode = String(code || "").trim();
    if (normCode.length < 2) {
      onError?.("Код: минимум 2 символа");
      return;
    }
    setBusy(true);
    const r = await apiFetch(`/api/admin/partners/${partnerId}/promo-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: normCode,
        label: label.trim(),
        active,
        depositBonusPercent: v,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      onError?.(r.error || "Ошибка");
      return;
    }
    onSaved();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-cb-stroke/50 bg-black/25 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex min-w-[8rem] flex-col gap-0.5 text-[10px] text-zinc-500">
        Код
        <input
          className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 font-mono text-sm text-white"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={48}
        />
      </label>
      <label className="flex min-w-[6rem] flex-1 flex-col gap-0.5 text-[10px] text-zinc-500">
        Метка
        <input
          className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 text-sm text-white"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
        <input
          type="checkbox"
          className="rounded border-cb-stroke/80"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Активен
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-zinc-500">
        Бонус к депозиту %
        <input
          type="number"
          min={0}
          max={100}
          className="w-16 rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 font-mono text-sm text-white"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded border border-emerald-800/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-50"
      >
        {busy ? "…" : "Сохранить"}
      </button>
    </div>
  );
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [behaviorDraft, setBehaviorDraft] = useState<Record<string, PartnerBehavior>>({});
  const [steamId, setSteamId] = useState("");
  const [pct, setPct] = useState("5");
  const [note, setNote] = useState("");
  const [promoByPartner, setPromoByPartner] = useState<
    Record<string, { code: string; label: string; depositBonusPercent: string }>
  >({});
  const [msg, setMsg] = useState<string | null>(null);
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [cabinetData, setCabinetData] = useState<CabinetDash | null>(null);
  const [cabinetLoading, setCabinetLoading] = useState(false);

  const load = useCallback(async () => {
    const a = await apiFetch<{ partners: PartnerRow[] }>("/api/admin/partners/list");
    if (a.ok && a.data?.partners) {
      setPartners(a.data.partners);
      setBehaviorDraft({});
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPartner() {
    setMsg(null);
    const percentBps = Math.round(parseFloat(pct.replace(",", ".")) * 100);
    const r = await apiFetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steamId: steamId.trim(),
        percentBps,
        internalNote: note.trim(),
      }),
    });
    if (!r.ok) setMsg(r.error || "Ошибка");
    else {
      setMsg("Партнёр создан. Роль в профиле не меняется — доступ в кабинет по записи Partner.");
      setSteamId("");
      void load();
    }
  }

  function behaviorFor(p: PartnerRow): PartnerBehavior {
    return behaviorDraft[p._id] ?? defaultBehavior(p);
  }

  function setBehaviorField(partnerId: string, p: PartnerRow, patch: Partial<PartnerBehavior>) {
    const cur = behaviorFor(p);
    setBehaviorDraft((d) => ({
      ...d,
      [partnerId]: { ...cur, ...patch },
    }));
  }

  async function savePartnerBehavior(partnerId: string, p: PartnerRow) {
    setMsg(null);
    const b = behaviorFor(p);
    const r = await apiFetch(`/api/admin/partners/${partnerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minDepositRub: b.minDepositRub,
        promoBindMode: b.promoBindMode,
      }),
    });
    if (!r.ok) setMsg(r.error || "Ошибка");
    else {
      setMsg("Настройки партнёра сохранены.");
      setBehaviorDraft((d) => {
        const next = { ...d };
        delete next[partnerId];
        return next;
      });
      void load();
    }
  }

  async function openCabinet(partnerId: string) {
    setCabinetId(partnerId);
    setCabinetData(null);
    setCabinetLoading(true);
    setMsg(null);
    const r = await apiFetch<CabinetDash>(`/api/admin/partners/${partnerId}/cabinet`);
    setCabinetLoading(false);
    if (!r.ok) {
      setMsg(r.error || "Не удалось загрузить кабинет");
      return;
    }
    if (!r.data?.partner) {
      setMsg("Пустой ответ сервера — проверьте MongoDB и данные партнёра.");
      return;
    }
    setCabinetData(r.data);
  }

  async function addPromo(partnerId: string) {
    const row = promoByPartner[partnerId] || { code: "", label: "", depositBonusPercent: "0" };
    if (!row.code.trim()) return;
    const depositBonusPercent = Math.min(
      100,
      Math.max(0, Math.floor(Number(String(row.depositBonusPercent).replace(",", ".")) || 0))
    );
    const r = await apiFetch(`/api/admin/partners/${partnerId}/promo-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: row.code, label: row.label, depositBonusPercent }),
    });
    if (!r.ok) setMsg(r.error || "Ошибка");
    else {
      setMsg("Код добавлен.");
      setPromoByPartner((p) => ({ ...p, [partnerId]: { code: "", label: "", depositBonusPercent: "0" } }));
      void load();
    }
  }

  async function creditPartnerBalance(partnerId: string) {
    setMsg(null);
    const r = await apiFetch<{ creditedRub?: number }>(`/api/admin/partners/${partnerId}/credit-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) setMsg(r.error || "Ошибка");
    else {
      const n = r.data?.creditedRub;
      setMsg(
        typeof n === "number" ? `На баланс сайта зачислено ${n} ₽.` : "Средства зачислены на баланс партнёра."
      );
      void load();
    }
  }

  async function deletePartner(partnerId: string, displayLabel: string) {
    const ok = window.confirm(
      `Удалить партнёра «${displayLabel}»? Будут удалены промокоды, начисления и привязки рефералов. Роль пользователя станет обычной (user). Действие необратимо.`,
    );
    if (!ok) return;
    setMsg(null);
    const r = await apiFetch(`/api/admin/partners/${partnerId}`, { method: "DELETE" });
    if (!r.ok) {
      setMsg(r.error || "Ошибка удаления");
      return;
    }
    if (cabinetId === partnerId) {
      setCabinetId(null);
      setCabinetData(null);
    }
    setMsg("Партнёр удалён.");
    void load();
  }

  return (
    <div className="space-y-10 text-sm">
      <div>
        <h1 className="text-xl font-bold text-white">Партнёрская программа</h1>
        <p className="mt-1 text-zinc-500">
          Партнёр создаётся вручную по Steam ID. Процент — от чистой базы депозита (₽ без бонуса промокода сайта).
          Начисления ждут одобрения администратора; на баланс сайта зачисляются только после нажатия «Зачислить на баланс».
        </p>
      </div>

      {msg ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-emerald-200">{msg}</p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-cb-stroke/70 bg-black/30 p-4">
        <h2 className="font-semibold text-white">Новый партнёр</h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Steam ID"
            className="rounded border border-cb-stroke/80 bg-black/50 px-3 py-2 font-mono text-white"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
          />
          <input
            placeholder="% (напр. 5)"
            className="w-24 rounded border border-cb-stroke/80 bg-black/50 px-3 py-2 font-mono text-white"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
          <input
            placeholder="Заметка"
            className="min-w-[120px] flex-1 rounded border border-cb-stroke/80 bg-black/50 px-3 py-2 text-white"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void createPartner()}
            className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-2 text-amber-200"
          >
            Создать
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-white">Партнёры</h2>
        {partners.length === 0 ? (
          <p className="text-zinc-500">Пока пусто (нужна MongoDB).</p>
        ) : (
          <div className="space-y-6">
            {partners.map((p) => {
              const b = behaviorFor(p);
              return (
                <div
                  key={p._id}
                  className="rounded-xl border border-cb-stroke/60 bg-black/35 p-4 text-zinc-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                      <PartnerFace
                        avatar={p.avatar}
                        displayName={p.displayName || p.userSub}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {p.displayName?.trim() || "— без ника —"}
                        </p>
                        <p className="font-mono text-xs text-zinc-500">
                          Steam ID: {p.steamId ?? "—"}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-600">userSub: {p.userSub}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openCabinet(p._id)}
                        className="rounded-lg border border-sky-600/50 bg-sky-950/30 px-3 py-1.5 text-xs text-sky-200"
                      >
                        Просмотреть кабинет
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deletePartner(p._id, p.displayName?.trim() || p.steamId || p.userSub)
                        }
                        className="rounded-lg border border-red-900/60 bg-red-950/25 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/40"
                      >
                        Удалить партнёра
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>
                      %: <b className="text-white">{(p.percentBps / 100).toFixed(2)}%</b>
                    </span>
                    <span>активаций: {p.usersActivated ?? 0}</span>
                    <span>ожидает зачисления: {p.totalEarnedPendingRub ?? 0} ₽</span>
                    <span>зачислено на баланс (всего): {p.totalPaidOutRub ?? 0} ₽</span>
                    {(p.totalEarnedConfirmedRub ?? 0) > 0 ? (
                      <span className="text-zinc-600">устар. подтверждено: {p.totalEarnedConfirmedRub} ₽</span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-3 rounded-lg border border-cb-stroke/50 bg-black/25 p-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Настройки этого партнёра
                    </h3>
                    <label className="flex flex-wrap items-center gap-2 text-zinc-400">
                      Мин. сумма заказа (база ₽) для начисления партнёру
                      <input
                        type="number"
                        className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 font-mono text-white"
                        value={b.minDepositRub}
                        onChange={(e) =>
                          setBehaviorField(p._id, p, {
                            minDepositRub: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-wrap items-center gap-2 text-zinc-400">
                      Режим привязки кода
                      <select
                        className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 text-white"
                        value={b.promoBindMode}
                        onChange={(e) =>
                          setBehaviorField(p._id, p, {
                            promoBindMode: e.target.value as "user" | "order",
                          })
                        }
                      >
                        <option value="user">user — после активации все депозиты этого аккаунта</option>
                        <option value="order">order — только ордера с указанным кодом</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void savePartnerBehavior(p._id, p)}
                      className="rounded-lg border border-cb-flame/50 bg-cb-flame/15 px-4 py-2 text-cb-flame"
                    >
                      Сохранить настройки
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Промокоды партнёра (в поле «промокод» при пополнении; бонус % к базе депозита)
                    </p>
                    {(p.codes || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(p.codes || []).map((c) => (
                          <PartnerPromoEditRow
                            key={c.id}
                            partnerId={p._id}
                            c={c}
                            onError={(m) => setMsg(m)}
                            onSaved={() => {
                              setMsg("Промокод сохранён.");
                              void load();
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600">Кодов пока нет.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input
                        placeholder="Новый код"
                        className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 font-mono text-white"
                        value={promoByPartner[p._id]?.code || ""}
                        onChange={(e) =>
                          setPromoByPartner((x) => ({
                            ...x,
                            [p._id]: {
                              ...(x[p._id] || { label: "", depositBonusPercent: "0" }),
                              code: e.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        placeholder="метка"
                        className="rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 text-white"
                        value={promoByPartner[p._id]?.label || ""}
                        onChange={(e) =>
                          setPromoByPartner((x) => ({
                            ...x,
                            [p._id]: {
                              ...(x[p._id] || { code: "", depositBonusPercent: "0" }),
                              label: e.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        placeholder="бонус %"
                        title="Процент бонуса к сумме депозита (база ₽)"
                        className="w-20 rounded border border-cb-stroke/80 bg-black/50 px-2 py-1 font-mono text-white"
                        value={promoByPartner[p._id]?.depositBonusPercent ?? "0"}
                        onChange={(e) =>
                          setPromoByPartner((x) => ({
                            ...x,
                            [p._id]: {
                              ...(x[p._id] || { code: "", label: "" }),
                              depositBonusPercent: e.target.value,
                            },
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => void addPromo(p._id)}
                        className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300"
                      >
                        Добавить код
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cb-stroke/40 pt-3">
                    <button
                      type="button"
                      disabled={(p.totalEarnedPendingRub ?? 0) < 1}
                      onClick={() => void creditPartnerBalance(p._id)}
                      className="rounded border border-emerald-700/50 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Зачислить на баланс сайта ({p.totalEarnedPendingRub ?? 0} ₽ ожидает)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {cabinetId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-cb-stroke/70 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">Кабинет партнёра (как видит партнёр)</h2>
              <button
                type="button"
                className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300"
                onClick={() => {
                  setCabinetId(null);
                  setCabinetData(null);
                }}
              >
                Закрыть
              </button>
            </div>
            {cabinetLoading ? (
              <p className="text-zinc-500">Загрузка…</p>
            ) : cabinetData?.partner ? (
              <CabinetPreview data={cabinetData} />
            ) : (
              <p className="text-zinc-500">Нет данных</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PartnerFace({
  avatar,
  displayName,
}: {
  avatar?: string;
  displayName: string;
}) {
  const initial = (displayName?.trim()?.charAt(0) || "?").toUpperCase();
  if (avatar?.trim()) {
    return (
      <Image
        src={avatar}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-lg font-bold text-white">
      {initial}
    </div>
  );
}

function CabinetPreview({ data }: { data: CabinetDash }) {
  const p = data.partner;
  const u = data.user;
  return (
    <div className="space-y-6">
      {u ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-cb-stroke/50 bg-black/30 p-3">
          <PartnerFace avatar={u.avatar} displayName={u.displayName || u.username || "—"} />
          <div>
            <p className="font-medium text-white">{u.displayName || u.username || "—"}</p>
            <p className="font-mono text-xs text-zinc-500">Steam ID: {u.steamId ?? "—"}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-cb-stroke/50 bg-black/30 p-3 text-xs text-zinc-400">
        <p className="font-semibold text-zinc-300">Правила начислений (этот партнёр)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Мин. сумма заказа (база ₽) для начисления: {p.minDepositRub} ₽</li>
          <li>
            Режим привязки:{" "}
            {p.promoBindMode === "order"
              ? "order — только ордера с указанным кодом"
              : "user — после активации все депозиты этого аккаунта"}
          </li>
          <li>Выплата только на баланс сайта после одобрения администратором (без отыгрыша).</li>
        </ul>
      </div>

      <div>
        <p className="text-sm text-zinc-500">
          Ставка: <span className="font-mono text-emerald-300">{p.percentDisplay}%</span> от чистого депозита.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Активаций по коду" value={p.usersActivated} />
        <Stat label="Депозитов (счётчик)" value={p.depositsCount} />
        <Stat label="Оборот депозитов" money value={p.depositsVolumeRub} />
        <Stat label="Ожидает зачисления админом" money value={p.totalEarnedPendingRub} />
        <Stat label="Зачислено на баланс (всего)" money value={p.totalPaidOutRub} />
        {(p.totalEarnedConfirmedRub ?? 0) > 0 ? (
          <Stat label="Устар. подтверждено" money value={p.totalEarnedConfirmedRub} />
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Реферальные коды
        </h3>
        <div className="space-y-2">
          {data.codes?.length ? (
            data.codes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cb-stroke/70 bg-black/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="font-mono text-lg text-white">{c.code}</span>
                  {(c.depositBonusPercent ?? 0) > 0 ? (
                    <p className="text-xs text-emerald-200/90">бонус к депозиту: {c.depositBonusPercent}%</p>
                  ) : null}
                </div>
                <span className="text-xs text-zinc-500">{c.active ? "активен" : "выкл."}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">Коды выдаёт администратор.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          История начислений
        </h3>
        <div className="overflow-x-auto rounded-xl border border-cb-stroke/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-cb-stroke/60 bg-black/30 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Дата</th>
                <th className="px-3 py-2">Депозит (нетто ₽)</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Начисление</th>
                <th className="px-3 py-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {(data.earnings || []).map((e) => (
                <tr key={e.id} className="border-b border-cb-stroke/40">
                  <td className="px-3 py-2 text-zinc-400">
                    {e.at ? new Date(e.at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{e.netDepositRub}</td>
                  <td className="px-3 py-2">{(e.percentBps / 100).toFixed(2)}%</td>
                  <td className="px-3 py-2 font-mono text-emerald-300">{e.rewardRub} ₽</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{formatEarningStatusRu(e.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  money,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <div className="rounded-xl border border-cb-stroke/70 bg-black/35 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {money ? <SiteMoney value={value} className="inline text-white" /> : value}
      </p>
    </div>
  );
}
