import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, RefreshCw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AdminPaymentDetail from "./AdminPaymentDetail";

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  payment_method_type: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  customer_email: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  description: string | null;
  invoice_id: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  "réussi": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "échoué": "bg-destructive/10 text-destructive border-destructive/20",
  "remboursé": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "annulé": "bg-muted text-muted-foreground border-border",
};

const AdminPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadPayments = async (startingAfter?: string) => {
    try {
      if (!startingAfter) setLoading(true);
      else setLoadingMore(true);

      const body: Record<string, unknown> = { action: "list_payments", limit: 30 };
      if (startingAfter) body.starting_after = startingAfter;

      const { data, error } = await supabase.functions.invoke("admin-users", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (startingAfter) {
        setPayments((prev) => [...prev, ...data.payments]);
      } else {
        setPayments(data.payments);
      }
      setHasMore(data.has_more);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des paiements");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleLoadMore = () => {
    if (payments.length > 0) {
      loadPayments(payments[payments.length - 1].id);
    }
  };

  const formatPaymentMethod = (p: Payment) => {
    if (p.payment_method_brand && p.payment_method_last4) {
      return `${p.payment_method_brand.charAt(0).toUpperCase() + p.payment_method_brand.slice(1)} •••• ${p.payment_method_last4}`;
    }
    if (p.payment_method_type) return p.payment_method_type;
    return "—";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Paiements Stripe</h3>
            <p className="text-xs text-muted-foreground">{payments.length} paiement{payments.length !== 1 ? "s" : ""} chargé{payments.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => loadPayments()}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun paiement trouvé</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_100px_120px_140px] gap-4 px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Utilisateur</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Montant</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Statut</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Moyen de paiement</span>
          </div>

          <div className="divide-y divide-border">
            {payments.map((p) => (
              <div key={p.id} className="px-5 py-3.5 sm:grid sm:grid-cols-[1fr_100px_100px_120px_140px] sm:gap-4 sm:items-center flex flex-col gap-2 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => { setSelectedPaymentId(p.id); setDetailOpen(true); }}>
                {/* User */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {p.user_name || p.user_email || "Inconnu"}
                  </p>
                  {p.user_name && p.user_email && (
                    <p className="text-xs text-muted-foreground truncate">{p.user_email}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {p.amount.toFixed(2)} {p.currency}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_STYLES[p.status] || "bg-secondary text-foreground"}`}>
                    {p.status}
                  </Badge>
                </div>

                {/* Date */}
                <div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>

                {/* Payment method */}
                <div>
                  <span className="text-xs text-muted-foreground">{formatPaymentMethod(p)}</span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="px-5 py-3 border-t border-border">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
