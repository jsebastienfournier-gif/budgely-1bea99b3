import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, FileText, ChevronRight, Mail, Landmark, RefreshCw, Plus, Check, Loader2, X, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ConnectedEmail = { id: string; email: string; provider: string; label: string | null; status: string; last_sync_at: string | null };
type ConnectedBank = { id: string; bank_name: string; account_label: string | null; account_type: string | null; status: string; last_sync_at: string | null };

type ReceiptProduct = { name: string; qty: number; unit: string; unitPrice: number; total: number; pricePerUnit?: string };
type Receipt = { id: number; store: string; date: string; total: string; items: number; status: string; products: ReceiptProduct[] };

const receipts: Receipt[] = [
  { id: 1, store: "Carrefour", date: "16 mars 2026", total: "€67.40", items: 12, status: "Analysé", products: [
    { name: "Lait demi-écrémé 1L", qty: 2, unit: "L", unitPrice: 1.15, total: 2.30, pricePerUnit: "1,15 €/L" },
    { name: "Pain de mie complet", qty: 1, unit: "pce", unitPrice: 1.89, total: 1.89 },
    { name: "Poulet fermier 1,2kg", qty: 1, unit: "kg", unitPrice: 9.90, total: 11.88, pricePerUnit: "9,90 €/kg" },
    { name: "Tomates grappe 1kg", qty: 1, unit: "kg", unitPrice: 2.49, total: 2.49, pricePerUnit: "2,49 €/kg" },
    { name: "Pâtes penne 500g", qty: 2, unit: "pce", unitPrice: 1.25, total: 2.50, pricePerUnit: "2,50 €/kg" },
    { name: "Huile d'olive 75cl", qty: 1, unit: "L", unitPrice: 6.99, total: 6.99, pricePerUnit: "9,32 €/L" },
    { name: "Yaourts nature x8", qty: 1, unit: "pce", unitPrice: 2.10, total: 2.10 },
    { name: "Bananes 1,5kg", qty: 1, unit: "kg", unitPrice: 1.99, total: 2.99, pricePerUnit: "1,99 €/kg" },
    { name: "Fromage râpé 200g", qty: 1, unit: "pce", unitPrice: 2.15, total: 2.15, pricePerUnit: "10,75 €/kg" },
    { name: "Eau minérale 6x1,5L", qty: 1, unit: "pce", unitPrice: 3.20, total: 3.20, pricePerUnit: "0,36 €/L" },
    { name: "Beurre doux 250g", qty: 1, unit: "pce", unitPrice: 2.49, total: 2.49, pricePerUnit: "9,96 €/kg" },
    { name: "Céréales muesli 450g", qty: 1, unit: "pce", unitPrice: 3.89, total: 3.89, pricePerUnit: "8,64 €/kg" },
  ]},
  { id: 2, store: "Leclerc", date: "13 mars 2026", total: "€89.20", items: 18, status: "Analysé", products: [
    { name: "Steak haché 5% x4", qty: 1, unit: "pce", unitPrice: 5.99, total: 5.99, pricePerUnit: "14,98 €/kg" },
    { name: "Saumon frais 300g", qty: 1, unit: "pce", unitPrice: 6.50, total: 6.50, pricePerUnit: "21,67 €/kg" },
    { name: "Pommes de terre 2,5kg", qty: 1, unit: "kg", unitPrice: 1.59, total: 3.98, pricePerUnit: "1,59 €/kg" },
    { name: "Lessive liquide 3L", qty: 1, unit: "L", unitPrice: 8.99, total: 8.99, pricePerUnit: "3,00 €/L" },
  ]},
  { id: 3, store: "Auchan", date: "10 mars 2026", total: "€45.60", items: 8, status: "Analysé", products: [
    { name: "Riz basmati 1kg", qty: 2, unit: "kg", unitPrice: 2.29, total: 4.58, pricePerUnit: "2,29 €/kg" },
    { name: "Sauce tomate 500g", qty: 1, unit: "pce", unitPrice: 1.49, total: 1.49, pricePerUnit: "2,98 €/kg" },
    { name: "Café moulu 250g", qty: 1, unit: "pce", unitPrice: 3.99, total: 3.99, pricePerUnit: "15,96 €/kg" },
  ]},
  { id: 4, store: "Lidl", date: "7 mars 2026", total: "€34.80", items: 10, status: "Analysé", products: [
    { name: "Œufs plein air x10", qty: 1, unit: "pce", unitPrice: 2.89, total: 2.89 },
    { name: "Jambon blanc x4", qty: 1, unit: "pce", unitPrice: 2.19, total: 2.19, pricePerUnit: "10,95 €/kg" },
    { name: "Carottes 1kg", qty: 2, unit: "kg", unitPrice: 0.99, total: 1.98, pricePerUnit: "0,99 €/kg" },
  ]},
  { id: 5, store: "Carrefour", date: "2 mars 2026", total: "€72.15", items: 14, status: "Analysé", products: [
    { name: "Filet de dinde 500g", qty: 1, unit: "pce", unitPrice: 4.99, total: 4.99, pricePerUnit: "9,98 €/kg" },
    { name: "Courgettes 1kg", qty: 1, unit: "kg", unitPrice: 2.29, total: 2.29, pricePerUnit: "2,29 €/kg" },
    { name: "Crème fraîche 20cl", qty: 2, unit: "pce", unitPrice: 1.15, total: 2.30, pricePerUnit: "5,75 €/L" },
  ]},
];

const emailProviders = [
  { id: "gmail", label: "Gmail", icon: "📧" },
  { id: "outlook", label: "Outlook", icon: "📬" },
  { id: "other", label: "Autre", icon: "✉️" },
];

const bankList = [
  "BNP Paribas", "Crédit Agricole", "Société Générale", "Crédit Mutuel",
  "La Banque Postale", "LCL", "Caisse d'Épargne", "Boursorama",
  "Fortuneo", "N26", "Revolut", "Autre",
];

const Receipts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<ConnectedEmail[]>([]);
  const [banks, setBanks] = useState<ConnectedBank[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailProvider, setNewEmailProvider] = useState("gmail");
  const [newBankName, setNewBankName] = useState("");
  const [newBankLabel, setNewBankLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [emailRes, bankRes] = await Promise.all([
        supabase.from("connected_emails").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("connected_bank_accounts").select("*").eq("user_id", user.id).order("created_at"),
      ]);
      setEmails((emailRes.data as ConnectedEmail[]) || []);
      setBanks((bankRes.data as ConnectedBank[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("connected_emails")
      .insert({ user_id: user.id, email: newEmail.trim(), provider: newEmailProvider })
      .select("*")
      .single();
    setSaving(false);
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    setEmails(prev => [...prev, data as ConnectedEmail]);
    setNewEmail("");
    setNewEmailProvider("gmail");
    setShowEmailDialog(false);
    toast.success("Adresse email connectée !");
  };

  const handleAddBank = async () => {
    if (!newBankName.trim() || !user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("connected_bank_accounts")
      .insert({ user_id: user.id, bank_name: newBankName, account_label: newBankLabel.trim() || null })
      .select("*")
      .single();
    setSaving(false);
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    setBanks(prev => [...prev, data as ConnectedBank]);
    setNewBankName("");
    setNewBankLabel("");
    setShowBankDialog(false);
    toast.success("Compte bancaire connecté !");
  };

  const formatSyncDate = (date: string | null) => {
    if (!date) return "Jamais synchronisé";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return "Synchronisé il y a moins d'1h";
    if (diffH < 24) return `Synchronisé il y a ${diffH}h`;
    return `Synchronisé le ${d.toLocaleDateString("fr-FR")}`;
  };

  const hasEmails = emails.length > 0;
  const hasBanks = banks.length > 0;

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Capture des dépenses</h1>
            <p className="text-sm text-muted-foreground mt-1">Importez et centralisez toutes vos dépenses, quel que soit leur format.</p>
          </div>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 border-dashed border-border p-10 text-center mb-8 hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Glissez un ticket ici ou cliquez pour importer</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou PDF — max 10 Mo</p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Camera className="h-4 w-4" />
              Prendre une photo
            </button>
            <button className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
              <FileText className="h-4 w-4" />
              Importer un fichier
            </button>
          </div>
        </motion.div>

        {/* Connection Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Email tile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => hasEmails ? toast.info("Synchronisation en cours…") : setShowEmailDialog(true)}
            className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {hasEmails ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">📥 {emails.length} email{emails.length > 1 ? "s" : ""} connecté{emails.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {emails.map(e => e.email).join(", ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">📥 Emails : connexion messagerie</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Importez automatiquement vos reçus depuis votre boîte mail</p>
                  </>
                )}
              </div>
              {hasEmails ? (
                <div className="flex items-center gap-2 shrink-0">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEmailDialog(true); }}
                    className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </button>
                </div>
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            {hasEmails && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground">{formatSyncDate(emails[0]?.last_sync_at)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/settings"); }}
                  className="text-[10px] text-primary font-medium hover:underline mt-0.5"
                >
                  Gérer dans les paramètres →
                </button>
              </div>
            )}
          </motion.div>

          {/* Bank tile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => hasBanks ? toast.info("Synchronisation en cours…") : setShowBankDialog(true)}
            className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {hasBanks ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">🏦 {banks.length} compte{banks.length > 1 ? "s" : ""} connecté{banks.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {banks.map(b => b.account_label || b.bank_name).join(", ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">🏦 Banque : connexion sécurisée</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Synchronisez vos transactions bancaires en toute sécurité</p>
                  </>
                )}
              </div>
              {hasBanks ? (
                <div className="flex items-center gap-2 shrink-0">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowBankDialog(true); }}
                    className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </button>
                </div>
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            {hasBanks && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground">{formatSyncDate(banks[0]?.last_sync_at)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/settings"); }}
                  className="text-[10px] text-primary font-medium hover:underline mt-0.5"
                >
                  Gérer dans les paramètres →
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* AI Extraction Steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Processus d'extraction IA</p>
          <div className="flex items-center gap-2">
            {["Lecture", "Extraction des articles", "Recherche d'alternatives"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                  <div className="h-5 w-5 rounded-full bg-savings/20 text-savings text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                  <span className="text-xs font-medium text-foreground">{step}</span>
                </div>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Receipt List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {receipts.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 items-center hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="hidden md:flex h-10 w-10 rounded-xl bg-secondary items-center justify-center text-sm font-bold text-foreground">
                  {r.store[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.store}</p>
                  <p className="text-[10px] text-muted-foreground">{r.date} · {r.items} articles</p>
                </div>
                <span className="bg-savings/10 text-savings px-2 py-0.5 rounded text-[10px] font-bold uppercase">{r.status}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{r.total}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email connection dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connecter une adresse email</DialogTitle>
            <DialogDescription>Ajoutez une adresse email pour importer automatiquement vos reçus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Fournisseur</label>
              <div className="flex gap-2">
                {emailProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setNewEmailProvider(p.id)}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${newEmailProvider === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-xs font-medium text-foreground">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Adresse email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="votre@email.com"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleAddEmail}
              disabled={saving || !newEmail.trim()}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Connecter
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank connection dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connecter un compte bancaire</DialogTitle>
            <DialogDescription>Ajoutez un compte bancaire pour synchroniser vos transactions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Banque</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {bankList.map(b => (
                  <button
                    key={b}
                    onClick={() => setNewBankName(b)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-colors ${newBankName === b ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Libellé du compte (optionnel)</label>
              <input
                type="text"
                value={newBankLabel}
                onChange={(e) => setNewBankLabel(e.target.value)}
                placeholder="Ex: Compte courant, Livret A…"
                className={inputClass}
              />
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground">🔒 Vos identifiants bancaires ne sont jamais stockés. Connexion sécurisée et chiffrée.</p>
            </div>
            <button
              onClick={handleAddBank}
              disabled={saving || !newBankName}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Connecter
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Receipts;
