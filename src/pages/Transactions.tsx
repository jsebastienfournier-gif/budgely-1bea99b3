import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Inbox, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PremiumCTA from "@/components/PremiumCTA";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "hsl(142, 71%, 45%)",
  Transport: "hsl(221, 83%, 53%)",
  Logement: "hsl(262, 60%, 55%)",
  Loisirs: "hsl(25, 90%, 55%)",
  Santé: "hsl(340, 70%, 55%)",
  Abonnements: "hsl(250, 60%, 55%)",
  "Épargne & Investissement": "hsl(170, 60%, 45%)",
  Autres: "hsl(215, 16%, 47%)",
};

type CategoryStat = { name: string; emoji: string; percent: number; color: string; amount: number };
type Detection = { title: string; desc: string };

const EMOJI_MAP: Record<string, string> = {
  Alimentation: "🛒", Transport: "🚗", Logement: "🏠",
  Santé: "💊", Abonnements: "📦", Loisirs: "🎭",
  "Épargne & Investissement": "💰", Autres: "📌",
};

function buildCategories(expenses: Expense[]): CategoryStat[] {
  const map: Record<string, number> = {};
  let total = 0;
  expenses.forEach((e) => {
    const cat = e.categorie || "Autres";
    const amt = e.montant_total || 0;
    map[cat] = (map[cat] || 0) + amt;
    total += amt;
  });
  if (total === 0) return [];
  return Object.entries(map)
    .map(([name, amount]) => ({
      name,
      emoji: EMOJI_MAP[name] || "📌",
      percent: Math.round((amount / total) * 100),
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Autres,
      amount,
    }))
    .sort((a, b) => b.percent - a.percent);
}

function buildDetections(thisMonth: Expense[], lastMonth: Expense[]): Detection[] {
  const detections: Detection[] = [];

  // Subscription duplicates
  const subs = thisMonth.filter((e) => e.abonnement_detecte);
  const subMap: Record<string, number> = {};
  subs.forEach((e) => {
    const key = (e.fournisseur || e.magasin || "").toLowerCase();
    if (key) subMap[key] = (subMap[key] || 0) + 1;
  });
  Object.entries(subMap).forEach(([name, count]) => {
    if (count > 1) {
      detections.push({
        title: "Doublons potentiels",
        desc: `${count} prélèvements pour "${name}" détectés ce mois.`,
      });
    }
  });

  // Category increase
  const thisMap: Record<string, number> = {};
  const lastMap: Record<string, number> = {};
  thisMonth.forEach((e) => { thisMap[e.categorie || "Autres"] = (thisMap[e.categorie || "Autres"] || 0) + (e.montant_total || 0); });
  lastMonth.forEach((e) => { lastMap[e.categorie || "Autres"] = (lastMap[e.categorie || "Autres"] || 0) + (e.montant_total || 0); });
  Object.entries(thisMap).forEach(([cat, amt]) => {
    const prev = lastMap[cat] || 0;
    if (prev > 0) {
      const pct = Math.round(((amt - prev) / prev) * 100);
      if (pct > 20) {
        detections.push({
          title: "Catégorie en hausse",
          desc: `Vos dépenses ${cat} ont augmenté de ${pct}% par rapport au mois dernier.`,
        });
      }
    }
  });

  // Subscriptions total
  const totalSubs = subs.reduce((s, e) => s + (e.montant_total || 0), 0);
  if (subs.length >= 2) {
    detections.push({
      title: "Abonnements repérés",
      desc: `${subs.length} abonnements récurrents détectés pour un total de ${totalSubs.toFixed(0)} €/mois.`,
    });
  }

  return detections;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
      <Inbox className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">
      Pas encore de données. Importez vos dépenses depuis la page Capture.
    </p>
  </div>
);

const Transactions = () => {
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

  const thisTotal = useMemo(() => thisMonth.reduce((s, e) => s + (e.montant_total || 0), 0), [thisMonth]);
  const lastTotal = useMemo(() => lastMonth.reduce((s, e) => s + (e.montant_total || 0), 0), [lastMonth]);
  const changePct = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;

  const categories = useMemo(() => buildCategories(thisMonth), [thisMonth]);
  const detections = useMemo(() => buildDetections(thisMonth, lastMonth), [thisMonth, lastMonth]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const hasData = categories.length > 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analyses</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprenez où va votre argent</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Dépenses du mois</p>
            <p className="text-lg font-bold text-foreground">{thisTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Évolution vs mois dernier</p>
            <p className={`text-lg font-bold ${changePct > 0 ? "text-destructive" : "text-savings"}`}>
              {lastTotal > 0 ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)} %` : "—"}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Catégorie principale</p>
            <p className="text-lg font-bold text-foreground">
              {categories[0] ? `${categories[0].emoji} ${categories[0].name}` : "—"}
            </p>
          </motion.div>
        </div>

        {/* Catégories */}
        {!hasData ? (
          <EmptyState />
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

        {/* Détections */}
        {detections.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-lg font-bold text-foreground mb-1">Détections automatiques</h2>
            <p className="text-xs text-muted-foreground mb-4">Anomalies et tendances repérées dans vos dépenses</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detections.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-4"
                >
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Premium CTA */}
        <div className="mt-8">
          <PremiumCTA message="Analyse illimitée disponible avec Premium" />
        </div>

        <div className="mt-8 sm:mt-10 pt-6 border-t border-border flex items-center justify-center gap-6">
          <Link to="/receipts" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Retour à la Capture des dépenses
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/insights" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Voir toutes les optimisations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default Transactions;
