"use client";

import { useEffect, useState } from "react";

type FlashLevel = 0 | 1 | 2;

/**
 * Фонова гроза: дощ + блискавка (кольори void / cb-flame). Без звуку.
 */
export function StormAtmosphere() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [flash, setFlash] = useState<FlashLevel>(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    /** У браузері id таймера — number (не NodeJS.Timeout). */
    let t: number | undefined;

    function oneStrike() {
      if (cancelled) return;
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
        oneStrike();
        if (double) {
          window.setTimeout(() => oneStrike(), 160 + Math.random() * 280);
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();
    return () => {
      cancelled = true;
      if (t !== undefined) window.clearTimeout(t);
    };
  }, [reducedMotion]);

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
