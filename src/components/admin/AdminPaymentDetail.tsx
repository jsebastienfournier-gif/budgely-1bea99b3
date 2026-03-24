import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, FileText, RefreshCw, ArrowUpRight, CreditCard, Calendar, User } from "lucide-react";

type PaymentDetail = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string | null;
  payment_method_type: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  customer_email: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    interval: string;
    current_period_start: string;
    current_period_end: string;
    created: string;
  } | null;
  history: {
    id: string;
    date: string;
    event_type: string;
    amount: number;
    currency: string;
    status: string;
    invoice_pdf: string | null;
    hosted_invoice_url: string | null;
  }[];
  invoice: {
    id: string;
    number: string | null;
    status: string;
    amount: number;
    currency: string;
    invoice_pdf: string | null;
    hosted_invoice_url: string | null;
  } | null;
};

const STATUS_STYLES: Record<string, string> = {
  "réussi": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "échoué": "bg-destructive/10 text-destructive border-destructive/20",
  "remboursé": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "annulé": "bg-muted text-muted-foreground border-border",
  "payé": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "en attente": "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const EVENT_STYLES: Record<string, string> = {
  "Souscription": "bg-primary/10 text-primary",
  "Renouvellement": "bg-emerald-500/10 text-emerald-600",
  "Mise à jour": "bg-amber-500/10 text-amber-600",
  "Paiement": "bg-secondary text-foreground",
  "Facture manuelle": "bg-muted text-muted-foreground",
};

type Props = {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AdminPaymentDetail = ({ paymentId, open, onOpenChange }: Props) => {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paymentId || !open) {
      setDetail(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-users", {
          body: { action: "get_payment_detail", payment_id: paymentId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setDetail(data);
      } catch (err: any) {
        console.error("Failed to load payment detail:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [paymentId, open]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  const formatPaymentMethod = (d: PaymentDetail) => {
    if (d.payment_method_brand && d.payment_method_last4) {
      return `${d.payment_method_brand.charAt(0).toUpperCase() + d.payment_method_brand.slice(1)} •••• ${d.payment_method_last4}`;
    }
    if (d.payment_method_type) return d.payment_method_type;
    return "—";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Détail du paiement</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Aucune donnée</div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Transaction ID & Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction</span>
                <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_STYLES[detail.status] || "bg-secondary text-foreground"}`}>
                  {detail.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all bg-muted/50 rounded-lg px-3 py-2">{detail.id}</p>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Montant</span>
                </div>
                <p className="text-lg font-bold text-foreground">{detail.amount.toFixed(2)} {detail.currency}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Date</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatDate(detail.created)}</p>
              </div>
            </div>

            {/* User */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Utilisateur</span>
              </div>
              <p className="text-sm font-medium text-foreground">{detail.user_name || "Inconnu"}</p>
              {detail.user_email && <p className="text-xs text-muted-foreground">{detail.user_email}</p>}
              <p className="text-xs text-muted-foreground mt-1">Moyen : {formatPaymentMethod(detail)}</p>
            </div>

            {/* Subscription / Plan */}
            {detail.subscription && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Abonnement</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{detail.subscription.plan_name}</span>
                    <Badge variant="outline" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                      {detail.subscription.interval}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Statut : <span className="font-medium text-foreground">{detail.subscription.status}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Période : {formatDate(detail.subscription.current_period_start)} → {formatDate(detail.subscription.current_period_end)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">{detail.subscription.id}</p>
                </div>
              </div>
            )}

            {/* Invoice */}
            {detail.invoice && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Facture associée</span>
                </div>
                <div className="space-y-2">
                  {detail.invoice.number && (
                    <p className="text-sm font-medium text-foreground">N° {detail.invoice.number}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{detail.invoice.amount.toFixed(2)} {detail.invoice.currency}</span>
                    <Badge variant="outline" className={`text-[10px] font-medium ${STATUS_STYLES[detail.invoice.status] || "bg-secondary text-foreground"}`}>
                      {detail.invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    {detail.invoice.invoice_pdf && (
                      <a href={detail.invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Télécharger PDF
                      </a>
                    )}
                    {detail.invoice.hosted_invoice_url && (
                      <a href={detail.invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Voir en ligne
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            {detail.history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Historique</span>
                </div>
                <div className="space-y-2">
                  {detail.history.map((h) => (
                    <div key={h.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${EVENT_STYLES[h.event_type] || "bg-secondary text-foreground"}`}>
                          {h.event_type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-foreground">{h.amount.toFixed(2)} {h.currency}</span>
                        {h.invoice_pdf && (
                          <a href={h.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AdminPaymentDetail;
