import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Wallet, Sparkles, Inbox, Loader2, Camera, PieChart as PieChartIcon, Lightbulb, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "hsl(142, 71%, 45%)",
  Transport: "hsl(221, 83%, 53%)",
  Logement: "hsl(262, 60%, 55%)",
  Loisirs: "hsl(25, 90%, 55%)",
  Santé: "hsl(340, 70%, 55%)",
  Abonnements: "hsl(250, 60%, 55%)",
  Restaurants: "hsl(30, 80%, 55%)",
  Épargne: "hsl(170, 60%, 45%)",
  Investissement: "hsl(200, 70%, 50%)",
  Autres: "hsl(215, 16%, 47%)",
};

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const sourceLabels: Record<string, string> = {
  receipt: "Ticket",
  bank: "Banque",
  email: "Email",
  invoice: "Facture",
};

function getColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Autres;
}

function buildCategoryData(expenses: Expense[]) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.categorie || "Autres";
    map[cat] = (map[cat] || 0) + (e.montant_total || 0);
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, color: getColor(name) }))
    .sort((a, b) => b.value - a.value);
}

function buildMonthlyData(expenses: Expense[]) {
  const now = new Date();
  const months: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const total = expenses
      .filter((e) => {
        if (!e.date_expense) return false;
        const ed = parseISO(e.date_expense);
        return ed >= start && ed <= end;
      })
      .reduce((s, e) => s + (e.montant_total || 0), 0);
    months.push({ month: format(d, "MMM", { locale: fr }), amount: Math.round(total) });
  }
  return months;
}

function buildTopMerchants(expenses: Expense[]) {
  const map: Record<string, { amount: number; visits: number }> = {};
  expenses.forEach((e) => {
    const name = e.fournisseur || e.magasin || "Inconnu";
    if (!map[name]) map[name] = { amount: 0, visits: 0 };
    map[name].amount += e.montant_total || 0;
    map[name].visits += 1;
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, amount: Math.round(v.amount * 100) / 100, visits: v.visits }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

const quickActions = [
  { to: "/receipts", icon: Camera, label: "Capture", desc: "Ajouter des dépenses", color: "text-primary" },
  { to: "/transactions", icon: PieChartIcon, label: "Analyses", desc: "Comprendre vos dépenses", color: "text-chart-2" },
  { to: "/insights", icon: Lightbulb, label: "Optimisations", desc: "Réduire vos coûts", color: "text-chart-4" },
];

const QuickActions = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
    {quickActions.map((a) => (
      <Link key={a.to} to={a.to}>
        <motion.div
          whileHover={{ y: -2 }}
          className="group flex items-center gap-4 bg-card rounded-2xl p-4 border border-border hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className={`h-10 w-10 rounded-xl bg-secondary flex items-center justify-center ${a.color}`}>
            <a.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{a.label}</p>
            <p className="text-xs text-muted-foreground">{a.desc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      </Link>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <Inbox className="h-7 w-7 text-muted-foreground" />
    </div>
    <h2 className="text-lg font-semibold text-foreground mb-1">Aucune dépense enregistrée</h2>
    <p className="text-sm text-muted-foreground max-w-sm mb-6">
      Importez vos tickets, emails ou relevés bancaires depuis la page Capture pour alimenter votre tableau de bord.
    </p>
    <QuickActions />
  </div>
);

const Dashboard = () => {
  const { expenses, loading } = useExpenses();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => {
      if (!e.date_expense) return false;
      const d = parseISO(e.date_expense);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }),
    [expenses, thisMonthStart, thisMonthEnd]
  );

  const lastMonthExpenses = useMemo(
    () => expenses.filter((e) => {
      if (!e.date_expense) return false;
      const d = parseISO(e.date_expense);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }),
    [expenses, lastMonthStart, lastMonthEnd]
  );

  const thisTotal = useMemo(() => thisMonthExpenses.reduce((s, e) => s + (e.montant_total || 0), 0), [thisMonthExpenses]);
  const lastTotal = useMemo(() => lastMonthExpenses.reduce((s, e) => s + (e.montant_total || 0), 0), [lastMonthExpenses]);
  const changePct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;

  const categoryData = useMemo(() => buildCategoryData(thisMonthExpenses), [thisMonthExpenses]);
  const monthlyData = useMemo(() => buildMonthlyData(expenses), [expenses]);
  const topMerchants = useMemo(() => buildTopMerchants(thisMonthExpenses), [thisMonthExpenses]);
  const recentActivity = useMemo(() => expenses.slice(0, 6), [expenses]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (expenses.length === 0) {
    return <AppLayout><EmptyState /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, "MMMM yyyy", { locale: fr })} — Vue d'ensemble de vos dépenses
          </p>
        </div>

        <QuickActions />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dépenses du mois</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                €{thisTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {lastTotal > 0 && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${changePct <= 0 ? "text-savings" : "text-destructive"}`}>
                  {changePct <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {changePct > 0 ? "+" : ""}{changePct}%
                </span>
              )}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transactions ce mois</p>
            </div>
            <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{thisMonthExpenses.length}</span>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Catégorie principale</p>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{categoryData[0]?.name || "—"}</span>
          </motion.div>
        </div>

        {/* Charts Row */}
        {categoryData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Dépenses par catégorie</p>
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-foreground">{cat.name}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground">€{cat.value.toLocaleString("fr-FR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Tendance mensuelle</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                    formatter={(value: number) => [`€${value}`, "Dépenses"]}
                  />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Merchants + Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {topMerchants.length > 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Top commerçants</p>
              <div className="space-y-3">
                {topMerchants.map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                        {m.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.visits} transaction{m.visits > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">€{m.amount.toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {categoryData.length > 0 && (
            <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Par catégorie (barres)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: "12px" }} formatter={(value: number) => [`€${value}`, ""]} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Activité récente</p>
            <div className="divide-y divide-border">
              {recentActivity.map((a) => (
                <div key={a.id} className="grid grid-cols-[auto_1fr_auto] gap-4 py-3 items-center">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                    {(a.fournisseur || a.magasin || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.fournisseur || a.magasin || "Inconnu"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.date_expense ? format(parseISO(a.date_expense), "d MMM yyyy", { locale: fr }) : "—"} · {sourceLabels[a.source] || a.source}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    €{(a.montant_total || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
