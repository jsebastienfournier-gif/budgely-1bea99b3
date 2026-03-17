import { motion } from "framer-motion";
import { AlertTriangle, Copy, TrendingUp, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";

const categories = [
  { name: "Alimentation", emoji: "🛒", percent: 35, color: "hsl(var(--savings))" },
  { name: "Transport", emoji: "🚗", percent: 18, color: "hsl(221, 83%, 53%)" },
  { name: "Logement", emoji: "🏠", percent: 15, color: "hsl(262, 60%, 55%)" },
  { name: "Restaurants", emoji: "🍽️", percent: 13, color: "hsl(25, 90%, 55%)" },
  { name: "Santé", emoji: "💊", percent: 8, color: "hsl(340, 70%, 55%)" },
  { name: "Abonnements", emoji: "📦", percent: 7, color: "hsl(250, 60%, 55%)" },
  { name: "Autres", emoji: "📌", percent: 4, color: "hsl(var(--muted-foreground))" },
];

const Transactions = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analyses</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprenez où va votre argent</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
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

        <div className="space-y-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-sm transition-shadow"
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
      </div>
    </AppLayout>
  );
};

export default Transactions;
