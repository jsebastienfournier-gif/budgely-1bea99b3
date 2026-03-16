import { motion } from "framer-motion";
import { Lightbulb, TrendingDown, ShoppingBag, CreditCard, Store, Check, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const insights = [
  {
    type: "brand_swap",
    icon: ShoppingBag,
    title: "Changez de marque de yaourt",
    desc: "Vous achetez régulièrement le yaourt Danone à 3.20€. Le yaourt Carrefour Bio coûte 2.40€ pour une qualité similaire.",
    savings: "€9.60/mois",
    status: "new",
  },
  {
    type: "subscription",
    icon: CreditCard,
    title: "Optimisez vos abonnements",
    desc: "Vous avez 4 services de streaming (Netflix, Spotify, Disney+, Canal+). Réduire un abonnement pourrait économiser 15€/mois.",
    savings: "€15/mois",
    status: "new",
  },
  {
    type: "category",
    icon: TrendingDown,
    title: "Restaurants en hausse de 22%",
    desc: "Vos dépenses restaurants ont augmenté de 22% ce mois-ci par rapport à la moyenne des 3 derniers mois (€180 vs €147).",
    savings: "€45/mois",
    status: "new",
  },
  {
    type: "merchant",
    icon: Store,
    title: "Comparez vos enseignes",
    desc: "Vous dépensez fréquemment chez Carrefour. Des produits similaires sont en moyenne 12% moins chers chez Lidl.",
    savings: "€18/mois",
    status: "planned",
  },
  {
    type: "brand_swap",
    icon: ShoppingBag,
    title: "Café moins cher disponible",
    desc: "Votre café Carte Noire à 5.80€ peut être remplacé par le Bellarom de Lidl à 3.50€ avec un goût comparable.",
    savings: "€2.30/mois",
    status: "done",
  },
];

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Lightbulb }> = {
  new: { label: "Nouveau", bg: "bg-primary/10", text: "text-primary", icon: Lightbulb },
  planned: { label: "Planifié", bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  done: { label: "Appliqué", bg: "bg-savings/10", text: "text-savings", icon: Check },
};

const Insights = () => {
  const totalSavings = "€89.90/mois";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Optimisations</h1>
          <p className="text-sm text-muted-foreground mt-1">Suggestions intelligentes pour réduire vos dépenses</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-foreground rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Économies potentielles totales</p>
            <p className="text-4xl font-bold tabular-nums text-background mt-3">{totalSavings}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Suggestions actives</p>
            <p className="text-3xl font-bold tabular-nums text-foreground mt-3">5</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Appliquées ce mois</p>
            <p className="text-3xl font-bold tabular-nums text-savings mt-3">1</p>
          </motion.div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {insights.map((insight, i) => {
            const status = statusConfig[insight.status];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-6 border-l-4 border-l-savings border border-border"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <insight.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                        <span className={`${status.bg} ${status.text} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight inline-flex items-center gap-1`}>
                          <status.icon className="h-2.5 w-2.5" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{insight.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Économie</p>
                      <p className="text-lg font-bold tabular-nums text-savings">{insight.savings}</p>
                    </div>
                    {insight.status === "new" && (
                      <button className="text-xs font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                        Appliquer
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;
