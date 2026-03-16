import { motion } from "framer-motion";
import { CreditCard, Mail, Receipt, Filter } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const transactions = [
  { id: 1, merchant: "Carrefour", date: "16 mars 2026", amount: "€67.40", category: "Alimentation", source: "receipt" },
  { id: 2, merchant: "SNCF", date: "15 mars 2026", amount: "€32.00", category: "Transport", source: "bank" },
  { id: 3, merchant: "Amazon", date: "14 mars 2026", amount: "€24.99", category: "Shopping", source: "email" },
  { id: 4, merchant: "Leclerc", date: "13 mars 2026", amount: "€89.20", category: "Alimentation", source: "receipt" },
  { id: 5, merchant: "Spotify", date: "12 mars 2026", amount: "€9.99", category: "Abonnements", source: "bank" },
  { id: 6, merchant: "EDF", date: "10 mars 2026", amount: "€85.00", category: "Logement", source: "bank" },
  { id: 7, merchant: "Uber Eats", date: "9 mars 2026", amount: "€18.50", category: "Restaurants", source: "bank" },
  { id: 8, merchant: "Fnac", date: "8 mars 2026", amount: "€42.00", category: "Loisirs", source: "email" },
  { id: 9, merchant: "Pharmacie", date: "7 mars 2026", amount: "€15.80", category: "Santé", source: "bank" },
  { id: 10, merchant: "Netflix", date: "5 mars 2026", amount: "€13.49", category: "Abonnements", source: "bank" },
];

const sourceIcons: Record<string, typeof CreditCard> = {
  bank: CreditCard,
  email: Mail,
  receipt: Receipt,
};

const Transactions = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <p className="text-sm text-muted-foreground mt-1">Toutes vos dépenses au même endroit</p>
          </div>
          <button className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
            <Filter className="h-4 w-4" />
            Filtrer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total du mois", value: "€3,240.50" },
            { label: "Nombre de transactions", value: "47" },
            { label: "Moyenne par jour", value: "€108" },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums text-foreground mt-2">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.map((t) => {
              const SourceIcon = sourceIcons[t.source];
              return (
                <div key={t.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 items-center hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <SourceIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.merchant}</p>
                    <p className="text-[10px] text-muted-foreground">{t.date} · {t.category}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {t.source === "bank" ? "Banque" : t.source === "email" ? "Email" : "Ticket"}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{t.amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Transactions;
