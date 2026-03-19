import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Check,
  X,
  Camera,
  FileText,
  Mail,
  Tags,
  Eye,
  Landmark,
  BarChart3,
  Wallet,
  Brain,
  Bell,
  Target,
  Headphones,
  Sparkles,
  Search,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCheckout } from "@/hooks/useCheckout";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { useState } from "react";

interface Feature {
  icon: React.ElementType;
  label: string;
  included: boolean;
}

interface Plan {
  key: "free" | "essentiel" | "premium";
  name: string;
  subtitle: string;
  price: string;
  priceDetail?: string;
  annualPrice?: string;
  annualDetail?: string;
  badge?: string;
  highlighted?: boolean;
  cta: string;
  ctaLoggedIn?: string;
  features: Feature[];
}

const plans: Plan[] = [
  {
    key: "free",
    name: "Découverte",
    subtitle: "Pour commencer à comprendre vos dépenses",
    price: "0 €",
    priceDetail: "Gratuit, pour toujours",
    cta: "Commencer gratuitement",
    ctaLoggedIn: "Plan actuel",
    features: [
      { icon: Camera, label: "Scan de tickets de caisse", included: true },
      { icon: FileText, label: "Import manuel de factures PDF", included: true },
      { icon: Mail, label: "Analyse des mails (5/mois)", included: true },
      { icon: Tags, label: "Catégorisation basique", included: true },
      { icon: Eye, label: "Aperçu des économies potentielles", included: true },
      { icon: Landmark, label: "Connexion bancaire", included: false },
      { icon: Brain, label: "Recommandations détaillées", included: false },
      { icon: Search, label: "Détection d'abonnements", included: false },
      { icon: Bell, label: "Alertes intelligentes", included: false },
    ],
  },
  {
    key: "essentiel",
    name: "Essentiel",
    subtitle: "Le suivi budgétaire automatisé",
    price: "3,99 €",
    priceDetail: "/mois",
    cta: "Choisir Essentiel",
    ctaLoggedIn: "Passer à Essentiel",
    features: [
      { icon: Camera, label: "Scan de tickets de caisse", included: true },
      { icon: FileText, label: "Import manuel de factures PDF", included: true },
      { icon: Mail, label: "Analyse des mails (5/mois)", included: true },
      { icon: Landmark, label: "Connexion bancaire", included: true },
      { icon: Tags, label: "Catégorisation automatique", included: true },
      { icon: Wallet, label: "Suivi du budget", included: true },
      { icon: Brain, label: "Recommandations avancées", included: false },
      { icon: Search, label: "Analyse illimitée mails & tickets", included: false },
      { icon: Bell, label: "Alertes intelligentes", included: false },
    ],
  },
  {
    key: "premium",
    name: "Premium",
    subtitle: "L'optimisation complète de vos finances",
    price: "6,99 €",
    priceDetail: "/mois",
    annualPrice: "59,99 €/an",
    annualDetail: "soit 4,99 €/mois — économisez 30 %",
    badge: "Meilleur choix",
    highlighted: true,
    cta: "Essai gratuit 7 jours",
    ctaLoggedIn: "Passer à Premium",
    features: [
      { icon: Camera, label: "Scan de tickets de caisse", included: true },
      { icon: FileText, label: "Import de factures illimité", included: true },
      { icon: Mail, label: "Analyse des mails illimitée", included: true },
      { icon: Landmark, label: "Connexion bancaire automatique", included: true },
      { icon: Tags, label: "Catégorisation automatique", included: true },
      { icon: Search, label: "Détection d'abonnements cachés", included: true },
      { icon: Brain, label: "Recommandations personnalisées", included: true },
      { icon: Bell, label: "Alertes intelligentes", included: true },
      { icon: Target, label: "Objectifs avancés", included: true },
      { icon: Headphones, label: "Support prioritaire", included: true },
    ],
  },
];

const PricingSection = () => {
  const { user } = useAuth();
  const { plan: currentPlan } = useSubscription();
  const { checkout, loading } = useCheckout();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handlePlanClick = (plan: Plan) => {
    if (!user) return; // Will use Link to /auth
    if (plan.key === "free") return;
    if (plan.key === currentPlan) return;

    const stripePlan = STRIPE_PLANS[plan.key];
    const priceId =
      plan.key === "premium" && billingCycle === "annual"
        ? stripePlan.prices.annual
        : stripePlan.prices.monthly;

    if (priceId) checkout(priceId);
  };

  const getButtonLabel = (plan: Plan) => {
    if (!user) return plan.cta;
    if (plan.key === currentPlan) return "✓ Plan actuel";
    return plan.ctaLoggedIn || plan.cta;
  };

  const isCurrentPlan = (plan: Plan) => plan.key === currentPlan;

  return (
    <section id="pricing" className="px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Plans & Tarifs
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Choisissez la formule adaptée à vos besoins
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Commencez gratuitement, montez en gamme quand vous êtes prêt.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annuel <span className="text-xs opacity-75">-30%</span>
            </button>
          </div>
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 sm:p-8 flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-card shadow-lg ring-2 ring-primary/20 scale-[1.02] z-10"
                  : isCurrentPlan(plan)
                  ? "border-primary/50 bg-card ring-1 ring-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {/* Badge */}
              {plan.badge && !isCurrentPlan(plan) && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {plan.badge}
                </Badge>
              )}
              {isCurrentPlan(plan) && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Votre plan
                </Badge>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-foreground">
                    {plan.key === "premium" && billingCycle === "annual" ? "4,99 €" : plan.price}
                  </span>
                  {plan.priceDetail && (
                    <span className="text-sm text-muted-foreground">
                      {plan.key === "premium" && billingCycle === "annual" ? "/mois" : plan.priceDetail}
                    </span>
                  )}
                </div>
                {plan.key === "premium" && billingCycle === "annual" && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-primary">59,99 €/an</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      — économisez 30 %
                    </span>
                  </div>
                )}
                {plan.key === "premium" && billingCycle === "monthly" && plan.annualPrice && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-primary">{plan.annualPrice}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      — {plan.annualDetail}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              {!user ? (
                <Link to="/auth" className="block mb-6">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full mb-6"
                  variant={isCurrentPlan(plan) ? "secondary" : plan.highlighted ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan(plan) || loading !== null}
                  onClick={() => handlePlanClick(plan)}
                >
                  {loading ===
                    (plan.key === "premium" && billingCycle === "annual"
                      ? STRIPE_PLANS.premium.prices.annual
                      : STRIPE_PLANS[plan.key]?.prices?.monthly) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {getButtonLabel(plan)}
                </Button>
              )}

              {/* Features list */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.label} className="flex items-start gap-3">
                    {feat.included ? (
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feat.included ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {feat.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-10"
        >
          Tous les prix sont TTC. Annulation possible à tout moment. Essai Premium sans engagement.
        </motion.p>
      </div>
    </section>
  );
};

export default PricingSection;
