import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "valid" | "already" | "invalid" | "done" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };

    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("done");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-5">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Vérification en cours…</p>
          </>
        )}

        {status === "valid" && (
          <>
            <MailX className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Se désabonner</h1>
            <p className="text-sm text-muted-foreground">
              Vous ne recevrez plus d'emails de Budgely. Êtes-vous sûr(e) ?
            </p>
            <Button onClick={handleUnsubscribe} className="w-full">
              Confirmer le désabonnement
            </Button>
          </>
        )}

        {status === "done" && (
          <>
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Désabonné(e)</h1>
            <p className="text-sm text-muted-foreground">
              Vous avez été désabonné(e) avec succès. Vous ne recevrez plus d'emails.
            </p>
          </>
        )}

        {status === "already" && (
          <>
            <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Déjà désabonné(e)</h1>
            <p className="text-sm text-muted-foreground">
              Vous êtes déjà désabonné(e) de nos emails.
            </p>
          </>
        )}

        {status === "invalid" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Lien invalide</h1>
            <p className="text-sm text-muted-foreground">
              Ce lien de désabonnement est invalide ou a expiré.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Erreur</h1>
            <p className="text-sm text-muted-foreground">
              Une erreur est survenue. Veuillez réessayer plus tard.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
