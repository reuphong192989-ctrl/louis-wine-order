"use client";

import { useCallback, useRef, useState } from "react";

/** fetch() that gives up after `timeoutMs` so one hung request (weak TV-box Wi-Fi) can't stall polling forever. */
export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tracks consecutive poll failures. `lost` turns true only after `threshold` failures in a row
 * and clears on the first success, so a single dropped request never flashes a "connection lost" banner.
 */
export function useConnectionHealth(threshold = 3) {
  const failures = useRef(0);
  const [lost, setLost] = useState(false);
  const reportOk = useCallback(() => {
    failures.current = 0;
    setLost(false);
  }, []);
  const reportFail = useCallback(() => {
    failures.current += 1;
    if (failures.current >= threshold) setLost(true);
  }, [threshold]);
  return { lost, reportOk, reportFail };
}
