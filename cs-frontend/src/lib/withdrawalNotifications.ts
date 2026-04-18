/** Знімок заявок для виявлення змін статусу (localStorage). */
export type WithdrawalStatusSnap = Record<string, { status: string }>;

const SNAP_KEY = "cd_withdrawal_status_snap_v1";
const NOTIF_KEY = "cd_nav_withdrawal_notifications_v1";

export type WithdrawalNotifKind = "completed" | "cancelled" | "failed";

export type StoredWithdrawalNotification = {
  id: string;
  at: number;
  kind: WithdrawalNotifKind;
  withdrawalId: string;
  read: boolean;
  title: string;
  body: string;
  /** Причина отмены, текст ошибки и т.п. */
  detail?: string;
};

export type PublicWithdrawalMineRow = {
  id: string;
  status: string;
  updatedAt?: string;
  resolvedAt?: string;
  lastError?: string;
  adminNote?: string;
  playerCancelledAt?: string;
  itemSnapshot?: { itemId?: string; name?: string };
};

function terminalStatus(s: string): WithdrawalNotifKind | null {
  const x = String(s || "").toLowerCase();
  if (x === "completed") return "completed";
  if (x === "cancelled") return "cancelled";
  if (x === "failed") return "failed";
  return null;
}

/** `neverSaved`: ключа ще не було — один раз знімаємо знімок без сповіщень. */
export function loadSnapState(): { map: WithdrawalStatusSnap; neverSaved: boolean } {
  if (typeof window === "undefined") return { map: {}, neverSaved: false };
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (raw === null) return { map: {}, neverSaved: true };
    if (raw === "") return { map: {}, neverSaved: false };
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return { map: {}, neverSaved: false };
    const out: WithdrawalStatusSnap = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (v && typeof v === "object" && typeof (v as { status?: string }).status === "string") {
        out[k] = { status: (v as { status: string }).status };
      }
    }
    return { map: out, neverSaved: false };
  } catch {
    return { map: {}, neverSaved: false };
  }
}

export function saveStatusSnap(snap: WithdrawalStatusSnap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

export function loadStoredNotifications(): StoredWithdrawalNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is StoredWithdrawalNotification =>
        x &&
        typeof x === "object" &&
        typeof (x as StoredWithdrawalNotification).id === "string" &&
        typeof (x as StoredWithdrawalNotification).withdrawalId === "string" &&
        typeof (x as StoredWithdrawalNotification).at === "number",
    );
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: StoredWithdrawalNotification[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = list.slice(-80);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

function ruMessage(
  kind: WithdrawalNotifKind,
  itemName: string,
  w: PublicWithdrawalMineRow,
): { title: string; body: string; detail?: string } {
  const name = itemName.trim() || "Предмет";
  if (kind === "completed") {
    return {
      title: "Скин успешно выведен",
      body: `${name} отправлен на ваш Steam.`,
    };
  }
  if (kind === "cancelled") {
    const note = String(w.adminNote || "").trim();
    const reason = note || "Причина не указана.";
    return {
      title: "Вывод скина отменён",
      body: `${name}.`,
      detail: `Причина: ${reason}`,
    };
  }
  const err = String(w.lastError || "").trim();
  return {
    title: "Ошибка вывода скина",
    body: `${name}.`,
    detail: err || "Попробуйте позже или напишите в поддержку.",
  };
}

/**
 * Оновлює snap і повертає нові події для додавання в список сповіщень.
 * Перший запуск (немає snap): лише зберігає поточні статуси без подій.
 */
export function diffWithdrawalsForNotifications(
  list: PublicWithdrawalMineRow[],
  prevSnap: WithdrawalStatusSnap,
  /** true лише коли localStorage ще не містив знімок (перший візит). */
  firstInit: boolean,
): { nextSnap: WithdrawalStatusSnap; newEvents: StoredWithdrawalNotification[] } {
  const nextSnap: WithdrawalStatusSnap = { ...prevSnap };
  const newEvents: StoredWithdrawalNotification[] = [];

  if (firstInit) {
    for (const w of list) {
      const id = String(w.id || "").trim();
      if (!id) continue;
      const st = String(w.status || "").trim().toLowerCase();
      nextSnap[id] = { status: st };
    }
    return { nextSnap, newEvents: [] };
  }

  for (const w of list) {
    const id = String(w.id || "").trim();
    if (!id) continue;
    const st = String(w.status || "").trim().toLowerCase();
    const term = terminalStatus(st);
    const prev = prevSnap[id];

    if (!prev) {
      nextSnap[id] = { status: st };
      if (term) {
        const itemName = String(w.itemSnapshot?.name || "").trim() || "Предмет";
        const msg = ruMessage(term, itemName, w);
        newEvents.push({
          id: `${id}:${term}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          kind: term,
          withdrawalId: id,
          read: false,
          title: msg.title,
          body: msg.body,
          detail: msg.detail,
        });
      }
      continue;
    }

    if (prev.status !== st) {
      nextSnap[id] = { status: st };
      if (term) {
        const itemName = String(w.itemSnapshot?.name || "").trim() || "Предмет";
        const msg = ruMessage(term, itemName, w);
        newEvents.push({
          id: `${id}:${term}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          kind: term,
          withdrawalId: id,
          read: false,
          title: msg.title,
          body: msg.body,
          detail: msg.detail,
        });
      }
    } else {
      nextSnap[id] = { status: st };
    }
  }

  return { nextSnap, newEvents };
}

/**
 * Підтягує актуальний `adminNote` з /api/withdrawals/mine для вже збережених
 * сповіщень про скасування (якщо перший знімок прийшов без причини).
 */
export function enrichCancelledDetailsFromMine(
  list: PublicWithdrawalMineRow[],
  items: StoredWithdrawalNotification[],
): StoredWithdrawalNotification[] {
  const byId = new Map(list.map((w) => [String(w.id || "").trim(), w]));
  let changed = false;
  const next = items.map((n) => {
    if (n.kind !== "cancelled") return n;
    const w = byId.get(n.withdrawalId);
    if (!w) return n;
    const note = String(w.adminNote || "").trim();
    if (!note) return n;
    const detail = `Причина: ${note}`;
    if (n.detail === detail) return n;
    changed = true;
    return { ...n, detail };
  });
  return changed ? next : items;
}

export function mergeNewNotifications(
  existing: StoredWithdrawalNotification[],
  newEvents: StoredWithdrawalNotification[],
): StoredWithdrawalNotification[] {
  if (newEvents.length === 0) return existing;
  const seen = new Set(
    existing.map((e) => `${e.withdrawalId}:${e.kind}`),
  );
  const toAdd = newEvents.filter((e) => {
    const k = `${e.withdrawalId}:${e.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return [...toAdd, ...existing].slice(0, 80);
}
