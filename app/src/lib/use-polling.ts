"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` immediately, then again `intervalMs` after each call
 * finishes (never overlapping two in-flight calls). Used instead of a
 * WebSocket push on Vercel, where serverless functions can't hold a
 * persistent connection — a short poll is the practical realtime substitute.
 *
 * `pauseWhenHidden` (default off — keep today's behaviour unless a caller
 * opts in): while true, polling stops the moment the tab/screen is hidden
 * (locked tablet, backgrounded browser tab, minimised window) and resumes
 * with an immediate fetch the instant it's looked at again. Only safe for
 * screens where staleness while unwatched has no consequence. The kitchen,
 * staff and reception screens poll to drive an audible new-order/cancel
 * alarm (`playAlertSound` in their callbacks) that must keep ringing even
 * if the display dims or the browser tab is backgrounded — those must NOT
 * pass `pauseWhenHidden`.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number, pauseWhenHidden = false) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const isPaused = () => pauseWhenHidden && typeof document !== "undefined" && document.hidden;

    async function tick() {
      if (cancelled || inFlight || isPaused()) return;
      inFlight = true;
      try {
        await savedCallback.current();
      } finally {
        inFlight = false;
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    }

    function onVisibilityChange() {
      if (cancelled || !pauseWhenHidden || isPaused()) return;
      // Screen just became visible again: fetch now instead of waiting out whatever was left of the interval.
      if (timer) clearTimeout(timer);
      tick();
    }

    if (pauseWhenHidden) document.addEventListener("visibilitychange", onVisibilityChange);
    tick();
    return () => {
      cancelled = true;
      if (pauseWhenHidden) document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, pauseWhenHidden]);
}
