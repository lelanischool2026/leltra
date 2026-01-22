// PWA Registration and utilities

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Check for updates periodically
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000,
          ); // Check every hour
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });
    });
  }
}

// Check if app is installed as PWA
export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

// Prompt for PWA installation
let deferredPrompt: any = null;

export function initInstallPrompt() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;

  return outcome === "accepted";
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}
