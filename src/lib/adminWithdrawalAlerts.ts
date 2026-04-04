/** Знімок заявок для виявлення нових pending у адмінів. */

export type AdminWdStatusSnap = Record<string, { status: string }>;

const SNAP_KEY = "cd_admin_wd_snap_v1";
const NOTIF_KEY = "cd_admin_wd_notifications_v1";

export type AdminWdAlertKind = "new_pending";

export type StoredAdminWdAlert = {
  id: string;
  at: number;
  kind: AdminWdAlertKind;
  withdrawalId: string;
  read: boolean;
  title: string;
  body: string;
  detail?: string;
};

export type AdminWithdrawalListRow = {
  id: string;
  status: string;
  displayName?: string;
  steamId?: string;
  userSub?: string;
  itemSnapshot?: { name?: string };
};

export function loadAdminSnapState(): { map: AdminWdStatusSnap; neverSaved: boolean } {
  if (typeof window === "undefined") return { map: {}, neverSaved: false };
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (raw === null) return { map: {}, neverSaved: true };
    if (raw === "") return { map: {}, neverSaved: false };
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return { map: {}, neverSaved: false };
    const out: AdminWdStatusSnap = {};
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

export function saveAdminSnap(snap: AdminWdStatusSnap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

export function loadAdminAlerts(): StoredAdminWdAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is StoredAdminWdAlert =>
        x &&
        typeof x === "object" &&
        typeof (x as StoredAdminWdAlert).id === "string" &&
        typeof (x as StoredAdminWdAlert).withdrawalId === "string" &&
        typeof (x as StoredAdminWdAlert).at === "number",
    );
  } catch {
    return [];
  }
}

export function saveAdminAlerts(list: StoredAdminWdAlert[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(-80)));
  } catch {
    /* ignore */
  }
}

/**
 * Знімок тільки по поточному списку з API (без накопичення старих id).
 * Нові pending: id не було в попередньому знімку.
 */
export function diffAdminWithdrawalsForAlerts(
  list: AdminWithdrawalListRow[],
  prevSnap: AdminWdStatusSnap,
  firstInit: boolean,
): { nextSnap: AdminWdStatusSnap; newEvents: StoredAdminWdAlert[] } {
  const newEvents: StoredAdminWdAlert[] = [];
  const nextSnap: AdminWdStatusSnap = {};

  for (const w of list) {
    const id = String(w.id || "").trim();
    if (!id) continue;
    const st = String(w.status || "").trim().toLowerCase();
    nextSnap[id] = { status: st };
  }

  if (firstInit) {
    return { nextSnap, newEvents: [] };
  }

  for (const w of list) {
    const id = String(w.id || "").trim();
    if (!id) continue;
    const st = String(w.status || "").trim().toLowerCase();
    const prev = prevSnap[id];
    if (!prev && st === "pending") {
      const itemName = String(w.itemSnapshot?.name || "").trim() || "Предмет";
      const player = String(w.displayName || "").trim() || "Игрок";
      const sid = String(w.steamId || w.userSub || "").trim() || "—";
      newEvents.push({
        id: `${id}:new_pending:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        kind: "new_pending",
        withdrawalId: id,
        read: false,
        title: "Новая заявка на вывод",
        body: itemName,
        detail: `Игрок: ${player} · Steam: ${sid}`,
      });
    }
  }

  return { nextSnap, newEvents };
}

export function mergeAdminAlerts(
  existing: StoredAdminWdAlert[],
  newEvents: StoredAdminWdAlert[],
): StoredAdminWdAlert[] {
  if (newEvents.length === 0) return existing;
  const seen = new Set(existing.map((e) => `${e.withdrawalId}:${e.kind}`));
  const toAdd = newEvents.filter((e) => {
    const k = `${e.withdrawalId}:${e.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return [...toAdd, ...existing].slice(0, 80);
}
