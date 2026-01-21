"use client";

import { useEffect } from "react";
import { registerServiceWorker, initInstallPrompt } from "@/lib/pwa";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    initInstallPrompt();
  }, []);

  return <>{children}</>;
}
