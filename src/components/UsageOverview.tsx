import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Progress } from "@/components/ui/progress";
import { Mail, Camera, FileText, Landmark } from "lucide-react";

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: { receipt: 999, invoice: 999, email: 5, bank: 0 },
  essentiel: { receipt: 999, invoice: 999, email: 15, bank: 999 },
  premium: { receipt: 999, invoice: 999, email: 999, bank: 999 },
};

type SourceKey = "receipt" | "invoice" | "email" | "bank";

const SOURCE_META: Record<SourceKey, { label: string; icon: typeof Mail }> = {
  email: { label: "Analyses e-mail", icon: Mail },
  receipt: { label: "Scan de tickets", icon: Camera },
  invoice: { label: "Import factures", icon: FileText },
  bank: { label: "Sync bancaire", icon: Landmark },
};

const UsageOverview = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const monthYear = new Date().toISOString().substring(0, 7); // YYYY-MM

    supabase
      .from("ai_usage")
      .select("source, usage_count")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data || []).forEach((r) => {
          map[r.source] = r.usage_count;
        });
        setUsage(map);
        setLoading(false);
      });
  }, [user]);

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Only show sources that have a meaningful limit (not 999 = unlimited)
  const sources: SourceKey[] = ["email", "receipt", "invoice", "bank"];

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        Consommation du mois
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((source) => {
          const limit = limits[source] ?? 0;
          const used = usage[source] ?? 0;
          const isUnlimited = limit >= 999;
          const isBlocked = limit === 0;
          const Icon = SOURCE_META[source].icon;
          const pct = isUnlimited || isBlocked ? 0 : Math.min((used / limit) * 100, 100);

          if (isBlocked && used === 0) {
            // Show blocked sources only with a note
            return (
              <div key={source} className="flex items-center gap-3 opacity-50">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {SOURCE_META[source].label}
                  </p>
                  <p className="text-xs text-muted-foreground">Non inclus dans votre offre</p>
                </div>
              </div>
            );
          }

          return (
            <div key={source} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-foreground">
                    {SOURCE_META[source].label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isUnlimited ? (
                      <>{used} · Illimité</>
                    ) : (
                      <>
                        {used}/{limit}
                      </>
                    )}
                  </p>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={pct}
                    className="h-2"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UsageOverview;
