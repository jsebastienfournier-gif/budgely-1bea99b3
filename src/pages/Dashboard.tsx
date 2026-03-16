import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Wallet, Users, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import AppLayout from "@/components/AppLayout";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const summaryCards = [
  { label: "Dépenses du mois", value: "€3,240", change: "-8%", trend: "down", icon: Wallet },
  { label: "Dépenses foyer", value: "€5,120", change: "-5%", trend: "down", icon: Users },
  { label: "Économies détectées", value: "€186", change: "+24%", trend: "up", icon: Sparkles },
];

const categoryData = [
  { name: "Alimentation", value: 890, color: "hsl(221, 83%, 53%)" },
  { name: "Transport", value: 420, color: "hsl(221, 83%, 70%)" },
  { name: "Loisirs", value: 310, color: "hsl(142, 71%, 45%)" },
  { name: "Logement", value: 1200, color: "hsl(215, 16%, 47%)" },
  { name: "Santé", value: 180, color: "hsl(221, 83%, 85%)" },
  { name: "Abonnements", value: 240, color: "hsl(142, 71%, 70%)" },
];

const monthlyData = [
  { month: "Oct", amount: 3800 },
  { month: "Nov", amount: 3600 },
  { month: "Déc", amount: 4100 },
  { month: "Jan", amount: 3900 },
  { month: "Fév", amount: 3500 },
  { month: "Mar", amount: 3240 },
];

const topMerchants = [
  { name: "Carrefour", amount: "€420", visits: 12 },
  { name: "Leclerc", amount: "€380", visits: 8 },
  { name: "Amazon", amount: "€290", visits: 15 },
  { name: "SNCF", amount: "€180", visits: 6 },
  { name: "Spotify", amount: "€10", visits: 1 },
];

const insights = [
  {
    type: "brand_swap",
    title: "Changement de marque recommandé",
    desc: "Vous achetez régulièrement le yaourt Danone à 3.20€. Le yaourt Carrefour Bio coûte 2.40€ pour une qualité similaire.",
    savings: "€9.60/mois",
  },
  {
    type: "subscription",
    title: "Abonnement à optimiser",
    desc: "Vous avez 4 services de streaming. Réduire un abonnement pourrait économiser 15€/mois.",
    savings: "€15/mois",
  },
  {
    type: "category",
    title: "Dépenses restaurants en hausse",
    desc: "Vous avez dépensé 22% de plus en restaurants ce mois-ci par rapport à la moyenne des 3 derniers mois.",
    savings: "€45/mois",
  },
];

const recentActivity = [
  { source: "receipt", merchant: "Carrefour", date: "16 mars", amount: "€67.40" },
  { source: "bank", merchant: "SNCF", date: "15 mars", amount: "€32.00" },
  { source: "email", merchant: "Amazon", date: "14 mars", amount: "€24.99" },
  { source: "receipt", merchant: "Leclerc", date: "13 mars", amount: "€89.20" },
  { source: "bank", merchant: "Spotify", date: "12 mars", amount: "€9.99" },
  { source: "bank", merchant: "EDF", date: "10 mars", amount: "€85.00" },
];

const sourceLabels: Record<string, string> = {
  receipt: "Ticket",
  bank: "Banque",
  email: "Email",
};

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">Mars 2026 — Vue d'ensemble de vos dépenses</p>
        </div>

        {/* Summary Cards + Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-sm border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{card.value}</span>
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${card.trend === "down" ? "text-savings" : "text-primary"}`}>
                  {card.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                  {card.change}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Score Card */}
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-foreground rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score d'optimisation</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-5xl font-bold tracking-tighter text-background tabular-nums">82</span>
              <svg className="h-14 w-14" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(142, 71%, 45%, 0.2)" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="hsl(142, 71%, 45%)" strokeWidth="4"
                  strokeDasharray={`${82 * 1.256} 125.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
              </svg>
            </div>
            <p className="text-xs text-background/50 mt-2">+4 pts ce mois</p>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Category Chart */}
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
                    <span className="tabular-nums text-muted-foreground">€{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Trend Chart */}
          <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Tendance mensuelle</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(220, 13%, 91%)", fontSize: "12px" }}
                  formatter={(value: number) => [`€${value}`, "Dépenses"]}
                />
                <Line type="monotone" dataKey="amount" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(221, 83%, 53%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Merchants + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Top Merchants */}
          <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Top commerçants</p>
            <div className="space-y-3">
              {topMerchants.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                      {m.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.visits} visites</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{m.amount}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Spending bar */}
          <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Par catégorie (barres)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(220, 13%, 91%)", fontSize: "12px" }} formatter={(value: number) => [`€${value}`, ""]} />
                <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Insights */}
        <motion.div {...fadeUp} className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Opportunités d'optimisation</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border-l-4 border-l-savings border border-border">
                <div className="flex items-start justify-between mb-2">
                  <span className="bg-savings/10 text-savings px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">
                    {insight.type === "brand_swap" ? "Marque" : insight.type === "subscription" ? "Abonnement" : "Catégorie"}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-savings">{insight.savings}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mt-3">{insight.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.desc}</p>
                <button className="mt-4 text-xs font-medium bg-foreground text-background px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                  Appliquer ce changement
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div {...fadeUp} className="bg-card rounded-2xl p-6 border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Activité récente</p>
          <div className="divide-y divide-border">
            {recentActivity.map((a, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-4 py-3 items-center">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                  {a.merchant[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.merchant}</p>
                  <p className="text-[10px] text-muted-foreground">{a.date} · {sourceLabels[a.source]}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{a.amount}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
