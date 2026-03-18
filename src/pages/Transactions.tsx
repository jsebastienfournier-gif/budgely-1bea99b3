import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Copy, TrendingUp, CreditCard, ArrowRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PremiumCTA from "@/components/PremiumCTA";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { name: "Alimentation", emoji: "🛒", percent: 35, color: "hsl(var(--savings))" },
  { name: "Transport", emoji: "🚗", percent: 18, color: "hsl(221, 83%, 53%)" },
  { name: "Logement", emoji: "🏠", percent: 15, color: "hsl(262, 60%, 55%)" },
  { name: "Restaurants", emoji: "🍽️", percent: 13, color: "hsl(25, 90%, 55%)" },
  { name: "Santé", emoji: "💊", percent: 8, color: "hsl(340, 70%, 55%)" },
  { name: "Abonnements", emoji: "📦", percent: 7, color: "hsl(250, 60%, 55%)" },
  { name: "Autres", emoji: "📌", percent: 4, color: "hsl(var(--muted-foreground))" },
];

const detections = [
  {
    icon: AlertTriangle,
    title: "Frais bancaires anormaux",
    desc: "Des frais inhabituels de 12,50 € ont été détectés le 8 mars sur votre compte courant.",
  },
  {
    icon: Copy,
    title: "Doublons potentiels",
    desc: "2 transactions similaires de 29,99 € chez Netflix repérées à 3 jours d'intervalle.",
  },
  {
    icon: TrendingUp,
    title: "Catégorie en hausse",
    desc: "Vos dépenses Restaurants ont augmenté de 22 % par rapport au mois dernier.",
  },
  {
    icon: CreditCard,
    title: "Abonnements repérés",
    desc: "4 abonnements récurrents détectés pour un total de 52 €/mois.",
  },
];

const SkeletonCard = () => (
  <div className="bg-card rounded-2xl border border-border p-5">
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-8" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
  </div>
);

const SkeletonDetection = () => (
  <div className="bg-card rounded-2xl border border-border p-4 flex gap-3 items-start">
    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-5 w-28 rounded-full" />
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
      <Inbox className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const Transactions = () => {
  // Simulate loading — replace with real data fetching
  const [isLoading] = useState(false);
  const hasData = categories.length > 0;
  const hasDetections = detections.length > 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analyses</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprenez où va votre argent</p>
        </div>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Dépenses du mois</p>
              <p className="text-lg font-bold text-foreground">2 340 €</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-4 text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Évolution vs mois dernier</p>
              <p className="text-lg font-bold text-destructive">+8,2 %</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-4 text-center"
            >
              <p className="text-xs text-muted-foreground mb-1">Catégorie principale</p>
              <p className="text-lg font-bold text-foreground">🛒 Alimentation</p>
            </motion.div>
          </div>
        )}

        {/* Catégories */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((k) => (
              <SkeletonCard key={k} />
            ))}
          </div>
        ) : !hasData ? (
          <EmptyState message="Pas encore assez de données pour afficher vos catégories." />
        ) : (
          <div className="space-y-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border p-4 sm:p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">{cat.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percent}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 + 0.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Détections automatiques */}
        <div className="mt-8 sm:mt-10">
          <h2 className="text-lg font-bold text-foreground mb-1">Détections automatiques</h2>
          <p className="text-xs text-muted-foreground mb-4">Anomalies et tendances repérées dans vos dépenses</p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((k) => (
                <SkeletonDetection key={k} />
              ))}
            </div>
          ) : !hasDetections ? (
            <EmptyState message="Aucune détection pour le moment. Revenez quand plus de données seront disponibles." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detections.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-4 flex gap-3 items-start"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    <Link to="/insights">
                      <Badge variant="secondary" className="mt-2 text-[10px] font-medium cursor-pointer hover:bg-secondary/80">
                        Voir dans Optimisation
                      </Badge>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Premium CTA */}
        <div className="mt-8">
          <PremiumCTA message="Analyse illimitée disponible avec Premium" />
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-border text-center">
          <Link
            to="/insights"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Voir toutes les optimisations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default Transactions;
