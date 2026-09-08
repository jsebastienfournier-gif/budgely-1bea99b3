import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { CaptureSource, canUseSource, getMonthlyLimit } from "@/lib/plan-capabilities";

export const usePlanCapabilities = () => {
  const { user } = useAuth();
  const { plan, loading: planLoading } = useSubscription();
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [usageLoading, setUsageLoading] = useState(true);

  const refreshUsage = useCallback(async () => {
    if (!user) {
      setUsage({});
      setUsageLoading(false);
      return;
    }
    const monthYear = new Date().toISOString().substring(0, 7);
    const { data } = await supabase
      .from("ai_usage")
      .select("source, usage_count")
      .eq("user_id", user.id)
      .eq("month_year", monthYear);
    const map: Record<string, number> = {};
    (data || []).forEach((r: any) => {
      map[r.source] = r.usage_count;
    });
    setUsage(map);
    setUsageLoading(false);
  }, [user]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const allows = (source: CaptureSource) => canUseSource(plan, source);
  const limitFor = (source: CaptureSource) => getMonthlyLimit(plan, source);
  const usedFor = (source: CaptureSource) => usage[source] ?? 0;
  const remainingFor = (source: CaptureSource) => Math.max(limitFor(source) - usedFor(source), 0);
  const hasQuota = (source: CaptureSource) => allows(source) && remainingFor(source) > 0;

  return {
    plan,
    loading: planLoading || usageLoading,
    allows,
    limitFor,
    usedFor,
    remainingFor,
    hasQuota,
    canUseBank: allows("bank"),
    canUseEmail: allows("email"),
    emailLimit: limitFor("email"),
    emailUsed: usedFor("email"),
    emailRemaining: remainingFor("email"),
    refreshUsage,
  };
};
