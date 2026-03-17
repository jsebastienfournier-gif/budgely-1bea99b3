import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Wifi,
  Scissors,
  ArrowRight,
  Eye,
  Check,
  Clock,
  Inbox,
  Sparkles,
  Receipt,
  Ban,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/* ─── Data ─── */

const priorityActions = [
  {
    icon: AlertTriangle,
    title: "Frais bancaires trop élevés",
    desc: "Vous payez 14,90 €/mois en frais de tenue de compte et cotisation carte. La moyenne est de 4 €/mois.",
    gain: "€10,90/mois",
    gainYear: "€130/an",
  },
  {
    icon: CreditCard,
    title: "Abonnement surdimensionné",
    desc: "Votre forfait Canal+ à 34,99 €/mois est peu utilisé. Un forfait à 15,99 € couvrirait vos usages.",
    gain: "€19/mois",
    gainYear: "€228/an",
  },
  {
    icon: Receipt,
    title: "Paiement en doublon",
    desc: "Deux prélèvements Spotify détectés ce mois : 9,99 € chacun. Un seul semble légitime.",
    gain: "€9,99/mois",
    gainYear: "€120/an",
  },
];

const otherOptimizations = [
  {
    icon: Scissors,
    title: "Résilier un abonnement inutilisé",
    desc: "Disney+ n'a pas été utilisé depuis 2 mois.",
  },
  {
    icon: Wifi,
    title: "Changer de forfait Internet",
    desc: "Des offres similaires existent à 10 €/mois de moins chez SFR et Free.",
  },
  {
    icon: CreditCard,
    title: "Réduire les frais bancaires",
    desc: "Une banque en ligne supprimerait 100 % de vos frais de tenue de compte.",
  },
  {
    icon: TrendingUp,
    title: "Comparer vos assurances",
    desc: "Votre assurance habitation n'a pas été renégociée depuis 3 ans.",
  },
  {
    icon: Sparkles,
    title: "Suggestions IA (tickets de caisse)",
    desc: "Des alternatives moins chères détectées sur 6 produits récurrents.",
  },
];

const history = [
  { action: "Résiliation Canal+ Intégral → Essentiel", date: "12 mars 2026", gain: "+€19/mois" },
  { action: "Passage banque en ligne (frais supprimés)", date: "28 février 2026", gain: "+€10,90/mois" },
  { action: "Remplacement café Carte Noire → Bellarom", date: "15 février 2026", gain: "+€2,30/mois" },
];

/* ─── Skeletons ─── */

const SkeletonPriority = () => (
  <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  </div>
);

const SkeletonSmall = () => (
  <div className="bg-card rounded-2xl border border-border p-4 flex gap-3 items-start">
    <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
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

/* ─── Component ─── */

const Insights = () => {
  const [isLoading] = useState(false);
  const hasData = priorityActions.length > 0;

  const totalMonthly = "€39,89";
  const totalYearly = "€478";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground">Optimisation</h1>
          <p className="text-sm text-muted-foreground mt-1">Agissez pour réduire durablement vos dépenses</p>
        </div>

        {/* Économies potentielles — hero card */}
        {isLoading ? (
          <Skeleton className="h-48 rounded-2xl mb-8" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-foreground rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8"
          >
            {/* Row: title + badge */}
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Économies potentielles
              </p>
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] font-bold uppercase">
                Estimation
              </Badge>
            </div>

            {/* Amounts */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-bold tabular-nums text-primary">{totalMonthly}</span>
              <span className="text-sm text-muted-foreground">/mois</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-lg font-semibold tabular-nums text-background/70">{totalYearly}</span>
              <span className="text-sm text-muted-foreground">/an</span>
            </div>

            <p className="text-xs text-muted-foreground mb-4">Basé sur vos dépenses des 90 derniers jours</p>

            {/* Realized + remaining */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-3">
              <p className="text-xs text-background/60">
                Économies déjà réalisées : <span className="font-semibold text-savings">€11,20</span> ce mois‑ci
              </p>
              <p className="text-xs text-background/60">
                Potentiel restant : <span className="font-semibold text-background">97%</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <Progress value={3} className="h-2 bg-background/10 rounded-full" />
            </div>

            {/* CTA */}
            <Button variant="ghost" size="sm" className="text-background/70 hover:text-background hover:bg-background/10 text-xs">
              Voir les optimisations
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Actions prioritaires */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg font-bold text-foreground mb-1">À traiter en priorité</h2>
          <p className="text-xs text-muted-foreground mb-4">Actions à fort impact classées par économie potentielle</p>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((k) => <SkeletonPriority key={k} />)}
            </div>
          ) : !hasData ? (
            <EmptyState message="Aucune action prioritaire détectée pour le moment." />
          ) : (
            <div className="space-y-3">
              {priorityActions.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border border-l-4 border-l-destructive p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-lg">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-savings">{item.gain}</p>
                        <p className="text-[10px] text-muted-foreground">{item.gainYear}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="text-xs">Agir</Button>
                        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
                          <Ban className="h-3 w-3 mr-1" />
                          Plus tard
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Autres pistes */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg font-bold text-foreground mb-1">Autres pistes d'optimisation</h2>
          <p className="text-xs text-muted-foreground mb-4">Explorez d'autres leviers pour économiser</p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((k) => <SkeletonSmall key={k} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {otherOptimizations.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-2xl border border-border p-4 flex gap-3 items-start hover:shadow-sm transition-shadow"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs shrink-0 self-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Voir
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg font-bold text-foreground mb-1">Économies réalisées</h2>
          <p className="text-xs text-muted-foreground mb-4">Vos actions passées et leurs résultats</p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((k) => <Skeleton key={k} className="h-14 rounded-xl" />)}
            </div>
          ) : history.length === 0 ? (
            <EmptyState message="Aucune optimisation réalisée pour le moment." />
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-savings/10 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-savings" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{h.action}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {h.date}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-savings whitespace-nowrap">{h.gain}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border text-center space-y-3">
          <p className="text-sm text-muted-foreground">Chaque action améliore durablement votre budget.</p>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Retour aux Analyses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;
