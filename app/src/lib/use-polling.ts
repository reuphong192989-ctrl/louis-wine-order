"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` immediately, then again `intervalMs` after each call
 * finishes (never overlapping two in-flight calls). Used instead of a
 * WebSocket push on Vercel, where serverless functions can't hold a
 * persistent connection — a short poll is the practical realtime substitute.
 */
export function usePolling(callback: () => void | Promise<void>, intervalMs: number) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        await savedCallback.current();
      } finally {
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);
}
