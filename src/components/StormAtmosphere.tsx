"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FlashLevel = 0 | 1 | 2;

/**
 * Фонова гроза: дощ + блискавка (кольори void / cb-flame). Шар у cb-backdrop під віньєткою.
 * Гром — Web Audio; після першого кліку/натискання клавіші на сторінці.
 */
export function StormAtmosphere() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [flash, setFlash] = useState<FlashLevel>(0);
  const audioReadyRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const playThunder = useCallback(() => {
    if (reducedMotion) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      void ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
      master.connect(ctx.destination);

      const noiseDur = 0.52;
      const bufferSize = Math.floor(ctx.sampleRate * noiseDur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.8;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = "lowpass";
      bp.frequency.setValueAtTime(380, now);
      bp.frequency.exponentialRampToValueAtTime(85, now + noiseDur);
      noise.connect(bp);
      bp.connect(master);
      noise.start(now);
      noise.stop(now + noiseDur);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.32);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, now);
      og.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc.connect(og);
      og.connect(master);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      /* */
    }
  }, [reducedMotion]);

  useEffect(() => {
    const unlock = () => {
      audioReadyRef.current = true;
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;

    function oneStrike(playSound: boolean) {
      if (cancelled) return;
      if (playSound && audioReadyRef.current) playThunder();
      setFlash(1);
      window.setTimeout(() => {
        if (cancelled) return;
        setFlash(2);
      }, 35 + Math.random() * 35);
      window.setTimeout(() => {
        if (cancelled) return;
        setFlash(0);
      }, 85 + Math.random() * 100);
    }

    function scheduleNext() {
      const delay = 4800 + Math.random() * 13000;
      t = window.setTimeout(() => {
        if (cancelled) return;
        const double = Math.random() < 0.36;
        oneStrike(true);
        if (double) {
          window.setTimeout(() => oneStrike(true), 160 + Math.random() * 280);
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [reducedMotion, playThunder]);

  return (
    <div className="cb-storm pointer-events-none absolute inset-0 z-[0] overflow-hidden" aria-hidden>
      {!reducedMotion && (
        <>
          <div className="cb-storm-rain cb-storm-rain--a" />
          <div className="cb-storm-rain cb-storm-rain--b" />
          <div className="cb-storm-rain cb-storm-rain--c" />
          <div className="cb-storm-mist" />
        </>
      )}
      <div
        className={
          flash === 1 ? "cb-storm-flash cb-storm-flash--peak" : flash === 2 ? "cb-storm-flash cb-storm-flash--tail" : "cb-storm-flash"
        }
      />
    </div>
  );
}
