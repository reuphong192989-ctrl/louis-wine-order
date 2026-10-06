"use client";

import { useEffect, useState } from "react";

export type PushStatus =
  | "unsupported" // browser has no Push API at all
  | "ios-needs-install" // iOS Safari — push only works once added to Home Screen
  | "default" // supported, not yet asked
  | "denied" // user said no — browser will not ask again
  | "subscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Registers the push service worker and reports/drives subscription state for the "Bật thông báo" banner. */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>("default");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (isIos() && !isStandalone()) return setStatus("ios-needs-install");
        return setStatus("unsupported");
      }
      if (isIos() && !isStandalone()) return setStatus("ios-needs-install");
      if (Notification.permission === "denied") return setStatus("denied");

      const reg = await navigator.serviceWorker.register("/push-sw.js").catch(() => null);
      if (!reg) return setStatus("unsupported");
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      if (!cancelled) setStatus(sub ? "subscribed" : "default");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe(): Promise<void> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "default");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setStatus("subscribed");
  }

  return { status, subscribe };
}
