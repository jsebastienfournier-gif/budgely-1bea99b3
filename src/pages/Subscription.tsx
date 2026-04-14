import AppLayout from "@/components/AppLayout";
import PricingSection from "@/components/PricingSection";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCheckout } from "@/hooks/useCheckout";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import UsageOverview from "@/components/UsageOverview";

const Subscription = () => {
  const { plan, subscribed, subscriptionEnd, status, loading, refresh } = useSubscription();
  const { openPortal } = useCheckout();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Paiement réussi !", description: "Votre abonnement est maintenant actif." });
      refresh();
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Paiement annulé", description: "Vous pouvez réessayer à tout moment.", variant: "destructive" });
    }
  }, [searchParams, refresh]);

  const planInfo = STRIPE_PLANS[plan] || STRIPE_PLANS.free;
  const planLabel =
    plan === "free"
      ? "Découverte — Gratuit"
      : plan === "essentiel"
      ? "Essentiel — 3,99 €/mois"
      : "Premium — 6,99 €/mois";

  const planDescription =
    plan === "free"
      ? "Scan de tickets, import PDF, 5 analyses mail/mois"
      : plan === "essentiel"
      ? "Connexion bancaire, catégorisation automatique, suivi du budget"
      : "Analyse illimitée, détection d'abonnements, alertes intelligentes";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">Mon offre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre abonnement et découvrez nos formules
          </p>
        </div>

        {/* Current plan indicator */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Plan actuel
              </p>
              {subscribed && (
                <Badge variant="secondary" className="text-[10px]">
                  {status === "trialing" ? "Essai gratuit" : "Actif"}
                </Badge>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{planLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{planDescription}</p>
            {subscriptionEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                {status === "trialing" ? "Fin de l'essai" : "Prochain renouvellement"} :{" "}
                {new Date(subscriptionEnd).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {subscribed && (
              <Button variant="outline" size="sm" onClick={openPortal}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Gérer
              </Button>
            )}
          </div>
        </div>

        <UsageOverview />

        <PricingSection />
      </div>
    </AppLayout>
  );
};

export default Subscription;
