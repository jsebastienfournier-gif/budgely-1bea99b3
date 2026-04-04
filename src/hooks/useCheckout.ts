import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { invokeAuthenticatedFunction } from "@/lib/edge-functions";

const POPUP_BLOCKED_MESSAGE = "Autorisez l'ouverture de la fenêtre de paiement, puis réessayez.";

const openPendingWindow = (title: string, message: string) => {
  const popup = window.open("", "_blank");

  if (!popup) {
    return null;
  }

  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>${title}</title></head><body><p>${message}</p></body></html>`);
  popup.document.close();

  return popup;
};

const redirectPopup = (popup: Window | null, url: string) => {
  if (!popup || popup.closed) {
    throw new Error(POPUP_BLOCKED_MESSAGE);
  }

  popup.location.replace(url);
};

export const useCheckout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const checkout = async (priceId: string) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour souscrire.", variant: "destructive" });
      return;
    }

    const popup = openPendingWindow("Redirection vers le paiement", "Ouverture sécurisée de la page de paiement...");
    if (!popup) {
      toast({ title: "Fenêtre bloquée", description: POPUP_BLOCKED_MESSAGE, variant: "destructive" });
      return;
    }

    setLoading(priceId);
    try {
      const data = await invokeAuthenticatedFunction<{ url?: string }>("create-checkout", { priceId });
      if (!data?.url) throw new Error("Lien de paiement introuvable");

      redirectPopup(popup, data.url);
    } catch (err: any) {
      if (!popup.closed) {
        popup.close();
      }

      console.error("Checkout error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible de démarrer le paiement", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    if (!user) return;

    const popup = openPendingWindow("Ouverture du portail", "Ouverture de votre espace de gestion...");
    if (!popup) {
      toast({ title: "Fenêtre bloquée", description: POPUP_BLOCKED_MESSAGE, variant: "destructive" });
      return;
    }

    try {
      const data = await invokeAuthenticatedFunction<{ url?: string }>("customer-portal");
      if (!data?.url) throw new Error("Lien du portail introuvable");

      redirectPopup(popup, data.url);
    } catch (err: any) {
      if (!popup.closed) {
        popup.close();
      }

      console.error("Portal error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible d'ouvrir le portail", variant: "destructive" });
    }
  };

  return { checkout, openPortal, loading };
};
