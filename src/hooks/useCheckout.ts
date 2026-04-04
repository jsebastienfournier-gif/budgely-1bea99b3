import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useCheckout = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const checkout = async (priceId: string) => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour souscrire.", variant: "destructive" });
      return;
    }

    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        const win = window.open(data.url, "_blank");
        if (!win) {
          window.location.href = data.url;
        }
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible de démarrer le paiement", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible d'ouvrir le portail", variant: "destructive" });
    }
  };

  return { checkout, openPortal, loading };
};
