const LS_KEY = "cd-roulette-sound-muted";

export function getRouletteSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_KEY) === "1";
}

export function setRouletteSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, muted ? "1" : "0");
}

function playRouletteClack(ctx: AudioContext, intensity: number) {
  const t = ctx.currentTime;
  const n = Math.min(1, Math.max(0.35, intensity));
  const base = 88 + Math.random() * 22;

  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o1.type = "triangle";
  o2.type = "sine";
  o1.frequency.setValueAtTime(base * 1.15, t);
  o1.frequency.exponentialRampToValueAtTime(base * 0.72, t + 0.06);
  o2.frequency.setValueAtTime(base * 2.4, t);
  o2.frequency.exponentialRampToValueAtTime(base * 1.8, t + 0.04);

  const vol = 0.09 * n;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0015, t + 0.085);

  o1.connect(g);
  o2.connect(g);
  g.connect(ctx.destination);
  o1.start(t);
  o2.start(t);
  o1.stop(t + 0.09);
  o2.stop(t + 0.09);
}

/**
 * Звук прокрутки «рулетки»: кроки уповільнюються до зупинки (як колесо з перешкодами).
 */
export function startRouletteSpinTicks(
  durationMs: number,
  muted: boolean,
): () => void {
  if (muted || typeof window === "undefined") return () => {};

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return () => {};

  const ctx = new AC();
  let closed = false;
  let tickId = 0;
  const startWall = performance.now();

  void ctx.resume().catch(() => {});

  const finish = () => {
    if (closed) return;
    closed = true;
    window.clearTimeout(tickId);
    ctx.close().catch(() => {});
  };

  /** Плануємо лише тики звуку, без RAF на кожен кадр — менше навантаження під час рулетки */
  const scheduleClack = () => {
    if (closed) return;
    const elapsed = performance.now() - startWall;
    const progress = Math.min(1, elapsed / durationMs);

    if (elapsed >= durationMs) {
      playRouletteClack(ctx, 1);
      finish();
      return;
    }

    const slow = progress * progress;
    playRouletteClack(ctx, 0.55 + 0.45 * (1 - slow * 0.35));
    const gapMs = 38 + slow * 195 + Math.random() * 12;
    tickId = window.setTimeout(scheduleClack, gapMs);
  };

  tickId = window.setTimeout(scheduleClack, 0);

  const safetyTimeoutId = setTimeout(finish, durationMs + 200);

  return () => {
    window.clearTimeout(tickId);
    clearTimeout(safetyTimeoutId);
    if (!closed) {
      closed = true;
      ctx.close().catch(() => {});
    }
  };
}

/** Короткий «клік» при виборі скінів на апгрейді (тихіше за кроки рулетки). */
export function playUpgradeChipClick(muted: boolean): void {
  if (muted || typeof window === "undefined") return;

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const ctx = new AC();
  void ctx.resume().catch(() => {});

  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(520 + Math.random() * 40, t);
  o.frequency.exponentialRampToValueAtTime(280, t + 0.045);

  g.gain.setValueAtTime(0.035, t);
  g.gain.exponentialRampToValueAtTime(0.0012, t + 0.055);

  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.06);

  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, 140);
}
