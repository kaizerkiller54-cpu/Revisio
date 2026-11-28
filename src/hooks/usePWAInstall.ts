import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Listener = () => void;

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = false;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function checkStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

if (typeof window !== "undefined") {
  globalIsInstalled = checkStandalone();

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });

  const mql = window.matchMedia?.("(display-mode: standalone)");
  if (mql?.addEventListener) {
    mql.addEventListener("change", (e) => {
      if (e.matches) {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
      }
    });
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => globalIsInstalled || checkStandalone());
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const sync = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(globalIsInstalled || checkStandalone());
    };

    listeners.add(sync);
    sync();

    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
    }

    return () => {
      listeners.delete(sync);
    };
  }, []);

  const install = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const promptEvent = globalDeferredPrompt;
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifyListeners();
        return "accepted";
      }
      globalDeferredPrompt = null;
      notifyListeners();
      return "dismissed";
    } catch {
      return "unavailable";
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
