import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "budgely_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Jamais dans l'aperçu intégré ni si déjà installée
    if (window.self !== window.top) return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!deferred && !showIosHint) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-lg lg:left-auto lg:right-6">
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Installer Budgely</p>
          {deferred ? (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajoutez Budgely à votre écran d'accueil pour un accès immédiat, en plein écran.
              </p>
              <Button size="sm" className="mt-3" onClick={install}>
                Installer
              </Button>
            </>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Touchez <Share className="inline h-3.5 w-3.5" /> puis « Sur l'écran d'accueil ».
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
