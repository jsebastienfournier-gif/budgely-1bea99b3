import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Inbox,
  Loader2,
  TrendingUp,
  Scissors,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PremiumCTA from "@/components/PremiumCTA";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

type Suggestion = { icon: typeof TrendingUp; title: string; desc: string; gain?: string };

function buildSuggestions(thisMonth: Expense[], lastMonth: Expense[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Detect duplicate subscriptions
  const subs = thisMonth.filter((e) => e.abonnement_detecte);
  const subMap: Record<string, { count: number; total: number }> = {};
  subs.forEach((e) => {
    const key = (e.fournisseur || e.magasin || "").toLowerCase();
    if (key) {
      if (!subMap[key]) subMap[key] = { count: 0, total: 0 };
      subMap[key].count += 1;
      subMap[key].total += e.montant_total || 0;
    }
  });
  Object.entries(subMap).forEach(([name, v]) => {
    if (v.count > 1) {
      const saving = Math.round(v.total / v.count);
      suggestions.push({
        icon: CreditCard,
        title: `Doublon d'abonnement : ${name}`,
        desc: `${v.count} prélèvements détectés. Supprimez le doublon pour économiser.`,
        gain: `€${saving}/mois`,
      });
    }
  });

  // Category increases
  const thisMap: Record<string, number> = {};
  const lastMap: Record<string, number> = {};
  thisMonth.forEach((e) => { thisMap[e.categorie || "Autres"] = (thisMap[e.categorie || "Autres"] || 0) + (e.montant_total || 0); });
  lastMonth.forEach((e) => { lastMap[e.categorie || "Autres"] = (lastMap[e.categorie || "Autres"] || 0) + (e.montant_total || 0); });
  Object.entries(thisMap).forEach(([cat, amt]) => {
    const prev = lastMap[cat] || 0;
    if (prev > 0) {
      const diff = amt - prev;
      const pct = Math.round((diff / prev) * 100);
      if (pct > 15 && diff > 10) {
        suggestions.push({
          icon: TrendingUp,
          title: `${cat} en hausse de ${pct}%`,
          desc: `Vous dépensez ${Math.round(diff)} € de plus que le mois dernier dans cette catégorie.`,
          gain: `€${Math.round(diff)}/mois`,
        });
      }
    }
  });

  // Unused subscriptions hint
  const totalSubCost = subs.reduce((s, e) => s + (e.montant_total || 0), 0);
  if (subs.length >= 3) {
    suggestions.push({
      icon: Scissors,
      title: "Revoyez vos abonnements",
      desc: `${subs.length} abonnements détectés pour ${Math.round(totalSubCost)} €/mois. Vérifiez lesquels sont encore utiles.`,
    });
  }

  return suggestions;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
      <Inbox className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">
      Pas encore de données. Les optimisations apparaîtront quand vous aurez importé vos dépenses.
    </p>
  </div>
);

const Insights = () => {
  const { expenses, loading } = useExpenses();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = useMemo(
    () => expenses.filter((e) => {
      if (!e.date_expense) return false;
      const d = parseISO(e.date_expense);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }),
    [expenses, thisMonthStart, thisMonthEnd]
  );

  const lastMonth = useMemo(
    () => expenses.filter((e) => {
      if (!e.date_expense) return false;
      const d = parseISO(e.date_expense);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }),
    [expenses, lastMonthStart, lastMonthEnd]
  );

  const suggestions = useMemo(() => buildSuggestions(thisMonth, lastMonth), [thisMonth, lastMonth]);

  const totalPotential = useMemo(
    () => suggestions.reduce((s, sg) => {
      if (!sg.gain) return s;
      const num = parseFloat(sg.gain.replace(/[^0-9.,]/g, "").replace(",", "."));
      return s + (isNaN(num) ? 0 : num);
    }, 0),
    [suggestions]
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground">Optimisation</h1>
          <p className="text-sm text-muted-foreground mt-1">Agissez pour réduire durablement vos dépenses</p>
        </div>

        {/* KPI */}
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 mb-6 sm:mb-8">
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Potentiel</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums text-primary">€{Math.round(totalPotential)}</span>
                <span className="text-xs text-muted-foreground">/mois</span>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Pistes détectées</p>
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{suggestions.length}</span>
            </div>
          </motion.div>
        )}

        {/* Suggestions */}
        {suggestions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {suggestions.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border border-l-4 border-l-primary p-4 sm:p-5"
              >
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      {item.gain && <span className="text-sm font-bold tabular-nums text-savings whitespace-nowrap">{item.gain}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Premium CTA */}
        <div className="mt-8 mb-6">
          <PremiumCTA message="Débloquez les recommandations d'économies personnalisées avec Premium" />
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border text-center">
          <Link to="/transactions" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Retour aux Analyses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;
