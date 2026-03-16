import { motion } from "framer-motion";
import { TrendingDown, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AppLayout from "@/components/AppLayout";

const products = [
  { name: "Lait demi-écrémé", brand: "Lactel", price: "€1.45", frequency: "4x/mois", merchant: "Carrefour", alt: "Marque Repère — €0.89", savings: "€2.24/mois" },
  { name: "Yaourt nature", brand: "Danone", price: "€3.20", frequency: "3x/mois", merchant: "Leclerc", alt: "Carrefour Bio — €2.40", savings: "€2.40/mois" },
  { name: "Pain de mie", brand: "Harry's", price: "€2.10", frequency: "2x/mois", merchant: "Carrefour", alt: "Marque Repère — €1.30", savings: "€1.60/mois" },
  { name: "Café moulu", brand: "Carte Noire", price: "€5.80", frequency: "1x/mois", merchant: "Leclerc", alt: "Lidl Bellarom — €3.50", savings: "€2.30/mois" },
  { name: "Gel douche", brand: "Le Petit Marseillais", price: "€3.50", frequency: "1x/mois", merchant: "Auchan", alt: "Lidl Cien — €1.80", savings: "€1.70/mois" },
];

const topProducts = [
  { name: "Lait", amount: 5.80 },
  { name: "Yaourt", amount: 9.60 },
  { name: "Pain", amount: 4.20 },
  { name: "Café", amount: 5.80 },
  { name: "Gel douche", amount: 3.50 },
  { name: "Pâtes", amount: 3.20 },
  { name: "Fromage", amount: 8.40 },
  { name: "Fruits", amount: 12.50 },
];

const Products = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Analyse produits</h1>
          <p className="text-sm text-muted-foreground mt-1">Vos achats récurrents et alternatives moins chères</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Produits suivis</p>
            <p className="text-3xl font-bold tabular-nums text-foreground mt-2">34</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alternatives trouvées</p>
            <p className="text-3xl font-bold tabular-nums text-foreground mt-2">12</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-5 border-l-4 border-l-savings border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Économies potentielles</p>
            <p className="text-3xl font-bold tabular-nums text-savings mt-2">€10.24<span className="text-sm font-medium text-muted-foreground">/mois</span></p>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-6 border border-border mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Dépenses par produit (mensuel)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(220, 13%, 91%)", fontSize: "12px" }} formatter={(v: number) => [`€${v}`, ""]} />
              <Bar dataKey="amount" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Product List */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Produits avec alternatives</p>
        <div className="space-y-3">
          {products.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 border-l-4 border-l-savings border border-border"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                    <span className="text-[10px] text-muted-foreground">— {p.brand}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.merchant} · {p.price} · {p.frequency}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Alternative</p>
                    <p className="text-sm font-medium text-foreground">{p.alt}</p>
                  </div>
                  <div className="flex items-center gap-1 text-savings">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-bold tabular-nums">{p.savings}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Products;
