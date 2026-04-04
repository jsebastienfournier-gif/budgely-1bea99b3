import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PlanKey } from "@/lib/stripe-plans";
import { invokeAuthenticatedFunction } from "@/lib/edge-functions";

type CheckSubscriptionResponse = {
  plan?: PlanKey;
  subscribed?: boolean;
  product_id?: string | null;
  price_id?: string | null;
  subscription_end?: string | null;
  status?: string | null;
};

type SubscriptionState = {
  plan: PlanKey;
  subscribed: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  status: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionState>({
  plan: "free",
  subscribed: false,
  productId: null,
  priceId: null,
  subscriptionEnd: null,
  status: null,
  loading: true,
  refresh: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<SubscriptionState, "refresh" | "loading">>({
    plan: "free",
    subscribed: false,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
    status: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ plan: "free", subscribed: false, productId: null, priceId: null, subscriptionEnd: null, status: null });
      setLoading(false);
      return;
    }

    try {
      const data = await invokeAuthenticatedFunction<CheckSubscriptionResponse>("check-subscription");

      setState({
        plan: data.plan || "free",
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        priceId: data.price_id || null,
        subscriptionEnd: data.subscription_end || null,
        status: data.status || null,
      });
    } catch (err) {
      console.error("Failed to check subscription:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  return (
    <SubscriptionContext.Provider value={{ ...state, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
