import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Eye, FileText, Receipt, Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

type AnalyticsData = {
  total_users: number;
  total_page_views: number;
  total_documents: number;
  total_expenses: number;
  active_sessions_today: number;
  views_by_day: { date: string; count: number }[];
  top_pages: { path: string; count: number }[];
};

const PERIOD_OPTIONS = [
  { label: "7j", value: 7 },
  { label: "30j", value: 30 },
  { label: "90j", value: 90 },
];

const AnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke("site-analytics", {
        body: { days: period },
      });
      if (!error && result) setData(result);
      setLoading(false);
    };
    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Erreur lors du chargement des analytics.</p>;
  }

  const stats = [
    { label: "Utilisateurs", value: data.total_users, icon: Users },
    { label: "Pages vues", value: data.total_page_views, icon: Eye },
    { label: "Documents", value: data.total_documents, icon: FileText },
    { label: "Dépenses", value: data.total_expenses, icon: Receipt },
    { label: "Sessions aujourd'hui", value: data.active_sessions_today, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Views per day chart */}
      {data.views_by_day.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pages vues par jour</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.views_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(v) => new Date(v).toLocaleDateString("fr-FR")}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Vues"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top pages */}
      {data.top_pages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pages les plus visitées</h3>
          <div className="space-y-2">
            {data.top_pages.map((page, i) => {
              const maxCount = data.top_pages[0]?.count || 1;
              const pct = (page.count / maxCount) * 100;
              return (
                <div key={page.path} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{page.path}</span>
                      <span className="text-xs text-muted-foreground ml-2">{page.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.views_by_day.length === 0 && data.top_pages.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Aucune donnée de trafic pour cette période. Les statistiques apparaîtront au fur et à mesure des visites.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
