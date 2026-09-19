"use client";

import { useEffect } from "react";

/** Registers public/sw.js. Production only: a service worker in dev keeps serving stale
 * responses across hot reloads, which reads as "my change didn't work". */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: without it the site still works, it just shows the browser's own
      // offline screen instead of ours.
    });
  }, []);
  return null;
}
