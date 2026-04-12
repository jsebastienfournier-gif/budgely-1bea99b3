import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Camera,
  FileText,
  ChevronRight,
  Mail,
  Landmark,
  RefreshCw,
  Plus,
  Check,
  Loader2,
  X,
  ShoppingCart,
  Sparkles,
  Coins,
  Pencil,
  Trash2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AppLayout from "@/components/AppLayout";
import PremiumCTA from "@/components/PremiumCTA";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthenticatedFunction } from "@/lib/edge-functions";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import CashExpenseDialog from "@/components/CashExpenseDialog";
import EditExpenseDialog from "@/components/EditExpenseDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConnectedEmail = {
  id: string;
  email: string;
  provider: string;
  label: string | null;
  status: string;
  last_sync_at: string | null;
};
type ConnectedBank = {
  id: string;
  bank_name: string;
  account_label: string | null;
  account_type: string | null;
  status: string;
  last_sync_at: string | null;
};

type ReceiptProduct = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  pricePerUnit?: string;
};
type Receipt = {
  id: string;
  store: string;
  date: string;
  total: string;
  items: number;
  status: string;
  products: ReceiptProduct[];
  source?: string;
  description?: string;
  source_id?: string;
};

const emailProviders = [
  { id: "gmail", label: "Gmail", icon: "📧" },
  { id: "outlook", label: "Outlook", icon: "📬" },
  { id: "other", label: "Autre", icon: "✉️" },
];

const bankList = [
  "BNP Paribas",
  "Crédit Agricole",
  "Société Générale",
  "Crédit Mutuel",
  "La Banque Postale",
  "LCL",
  "Caisse d'Épargne",
  "Boursorama",
  "Fortuneo",
  "N26",
  "Revolut",
  "Autre",
];

const Receipts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<ConnectedEmail[]>([]);
  const [banks, setBanks] = useState<ConnectedBank[]>([]);
  const [expenses, setExpenses] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newEmailProvider, setNewEmailProvider] = useState("gmail");
  const [newBankName, setNewBankName] = useState("");
  const [newBankLabel, setNewBankLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Sync bank transactions from Railway backend
  const handleSyncBank = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    toast.info("Synchronisation bancaire en cours…");
    try {
      const res = await fetch(
        `https://budgely-backend-production.up.railway.app/powens/transactions?user_id=${encodeURIComponent(user.id)}`
      );
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const transactions: Array<{
        id: string;
        amount: number;
        currency: string;
        date: string;
        label: string;
        category: string;
        account_id: string;
      }> = await res.json();

      if (!transactions.length) {
        toast.info("Aucune nouvelle transaction bancaire trouvée");
        return;
      }

      // Map Powens category to app categories
      const categoryMap: Record<string, string> = {
        Food: "Alimentation",
        Subscription: "Abonnements",
        Transport: "Transport",
        Housing: "Logement",
        Health: "Santé",
        Entertainment: "Loisirs",
        Restaurant: "Restaurants",
        Savings: "Épargne",
        Investment: "Investissement",
      };

      const rows = transactions.map((tx) => ({
        user_id: user.id,
        source: "bank" as const,
        source_id: tx.id,
        montant_total: Math.abs(tx.amount),
        devise: tx.currency || "EUR",
        date_expense: tx.date,
        fournisseur: tx.label,
        categorie: categoryMap[tx.category] || "Autres",
        description: tx.label,
        abonnement_detecte: tx.category === "Subscription",
      }));

      // Upsert: skip already imported transactions (by source_id)
      const { data: existing } = await supabase
        .from("expenses")
        .select("source_id")
        .eq("user_id", user.id)
        .eq("source", "bank")
        .in("source_id", rows.map((r) => r.source_id!));

      const existingIds = new Set((existing || []).map((e: any) => e.source_id));
      const newRows = rows.filter((r) => !existingIds.has(r.source_id));

      if (newRows.length === 0) {
        toast.info("Toutes les transactions sont déjà importées");
        return;
      }

      const { error } = await supabase.from("expenses").insert(newRows);
      if (error) throw new Error(error.message);

      toast.success(`${newRows.length} transaction(s) bancaire(s) importée(s)`);

      // Update bank last_sync_at
      await supabase
        .from("connected_bank_accounts")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id);

      setBanks((prev) =>
        prev.map((b) => ({ ...b, last_sync_at: new Date().toISOString() }))
      );

      reloadExpenses();
    } catch (err: any) {
      toast.error("Erreur de synchronisation bancaire : " + (err.message || "Erreur inconnue"));
    } finally {
      setSyncing(false);
    }
  };

  // Handle Gmail/Microsoft/Powens OAuth callback params
  useEffect(() => {
    const reloadEmails = () => {
      if (user) {
        supabase
          .from("connected_emails")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at")
          .then(({ data }) => {
            setEmails((data as ConnectedEmail[]) || []);
          });
      }
    };

    if (searchParams.get("gmail_connected") === "true") {
      const email = searchParams.get("email") || "";
      toast.success(`Gmail connecté : ${email}`);
      setSearchParams({}, { replace: true });
      reloadEmails();
    }
    if (searchParams.get("gmail_error")) {
      toast.error("Erreur de connexion Gmail : " + searchParams.get("gmail_error"));
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get("microsoft_connected") === "true") {
      const email = searchParams.get("email") || "";
      toast.success(`Outlook connecté : ${email}`);
      setSearchParams({}, { replace: true });
      reloadEmails();
    }
    if (searchParams.get("microsoft_error")) {
      toast.error("Erreur de connexion Outlook : " + searchParams.get("microsoft_error"));
      setSearchParams({}, { replace: true });
    }
    // Powens callback
    if (searchParams.get("powens_connected") === "true") {
      toast.success("Compte bancaire connecté via Powens !");
      setSearchParams({}, { replace: true });
      // Auto-sync transactions after connection
      handleSyncBank();
    }
    if (searchParams.get("powens_error")) {
      toast.error("Erreur de connexion Powens : " + searchParams.get("powens_error"));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const mapExpenses = (data: any[]) => {
    return data.map((e: any) => {
      const articles = (e.articles || []).map((a: any) => ({
        name: a.nom || a.name || "",
        qty: a.quantite || a.qty || 1,
        unit: a.unite || a.unit || "pce",
        unitPrice: a.prix_unitaire || a.unitPrice || 0,
        total: a.prix_total || a.total || 0,
        pricePerUnit: a.prix_unitaire ? `${a.prix_unitaire.toFixed(2)} €` : undefined,
      }));
      return {
        id: e.id,
        store: e.magasin || e.fournisseur || "Inconnu",
        date: e.date_expense
          ? new Date(e.date_expense).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
          : "Date inconnue",
        total: `€${(e.montant_total || 0).toFixed(2)}`,
        items: articles.length,
        status: "Analysé",
        products: articles,
        source: e.source,
        description: e.description || "",
        source_id: e.source_id || undefined,
      };
    });
  };

  const reloadExpenses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const raw = data || [];
    setRawExpenses(raw);
    setExpenses(mapExpenses(raw));
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [emailRes, bankRes, expenseRes] = await Promise.all([
        supabase.from("connected_emails").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("connected_bank_accounts").select("*").eq("user_id", user.id).order("created_at"),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setEmails((emailRes.data as ConnectedEmail[]) || []);
      setBanks((bankRes.data as ConnectedBank[]) || []);
      const raw = expenseRes.data || [];
      setRawExpenses(raw);
      setExpenses(mapExpenses(raw));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    setDeleting(true);
    const { error } = await supabase.from("expenses").delete().eq("id", deletingExpenseId);
    setDeleting(false);
    setDeletingExpenseId(null);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Dépense supprimée");
    reloadExpenses();
  };

  const handleEditExpense = (id: string) => {
    const raw = rawExpenses.find((e) => e.id === id);
    if (raw) {
      setEditingExpense(raw);
      setShowEditDialog(true);
    }
  };

  const handleValidateEmail = async (sourceId: string, status: "approved" | "rejected") => {
    const messageId = sourceId.replace(/^gmail_/, "");
    setValidatingId(sourceId);
    try {
      const res = await fetch("https://budgely-backend-production.up.railway.app/api/gmail/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, status }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      toast.success(status === "approved" ? "Email approuvé ✓" : "Email refusé ✗");
      reloadExpenses();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Impossible de valider"));
    } finally {
      setValidatingId(null);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou PDF.");
      return;
    }

    setUploading(true);
    setAnalysisProgress(10);
    setAnalysisStep("Upload du fichier…");

    try {
      // 1. Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

      if (uploadError) throw new Error("Erreur d'upload: " + uploadError.message);

      setAnalysisProgress(25);
      setAnalysisStep("Création du document…");

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      // 2. Create document record
      const source = file.type === "application/pdf" ? "invoice" : "receipt";
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          source,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "pending" as any,
        })
        .select()
        .single();

      if (docError) throw new Error("Erreur document: " + docError.message);

      setAnalysisProgress(40);
      setAnalysisStep("Extraction du texte…");

      // 3. Extract text (for images, convert to base64 for AI vision)
      let rawText = "";
      if (file.type === "application/pdf") {
        rawText = `[Fichier PDF: ${file.name}] Contenu à analyser.`;
        // In production, use a PDF parser service
      } else {
        // Convert image to base64 for description
        const reader = new FileReader();
        rawText = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(
              `[Image de ticket de caisse encodée en base64]\nNom du fichier: ${file.name}\nVeuillez analyser cette image de ticket de caisse et extraire les informations.`,
            );
          };
          reader.readAsDataURL(file);
        });
      }

      setAnalysisProgress(60);
      setAnalysisStep("Analyse IA en cours…");

      // 4. Call AI analysis
      let result: any;
      let fnError: any = null;
      try {
        console.log("[analyze-document] Calling with source:", source, "doc_id:", doc.id, "raw_text length:", rawText.length);
        result = await invokeAuthenticatedFunction("analyze-document", {
          document_id: doc.id,
          source,
          raw_text: rawText,
        });
        console.log("[analyze-document] Result:", JSON.stringify(result).slice(0, 500));
      } catch (e: any) {
        console.error("[analyze-document] Error:", e.message, e);
        fnError = { message: e.message };
      }

      if (fnError) {
        // Check for plan limit errors
        if (fnError.message?.includes("limit_reached")) {
          toast.error("Limite mensuelle atteinte. Passez à Premium pour des analyses illimitées !");
          return;
        }
        throw new Error(fnError.message || "Erreur d'analyse");
      }

      if (result?.error) {
        if (result.error === "limit_reached") {
          toast.error(result.message || "Limite atteinte");
          return;
        }
        throw new Error(result.error);
      }

      setAnalysisProgress(90);
      setAnalysisStep("Enregistrement…");

      // 5. Add to local state
      if (result?.expense) {
        const e = result.expense;
        const articles = (e.articles || []).map((a: any) => ({
          name: a.nom || a.name || "",
          qty: a.quantite || a.qty || 1,
          unit: a.unite || a.unit || "pce",
          unitPrice: a.prix_unitaire || a.unitPrice || 0,
          total: a.prix_total || a.total || 0,
        }));
        const newReceipt: Receipt = {
          id: e.id,
          store: e.magasin || e.fournisseur || "Inconnu",
          date: e.date_expense
            ? new Date(e.date_expense).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
            : "Aujourd'hui",
          total: `€${(e.montant_total || 0).toFixed(2)}`,
          items: articles.length,
          status: "Analysé",
          products: articles,
          source: e.source,
        };
        setExpenses((prev) => [newReceipt, ...prev]);
      }

      setAnalysisProgress(100);
      setAnalysisStep("Terminé !");
      toast.success("Ticket analysé avec succès !");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erreur lors de l'analyse");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setAnalysisProgress(0);
        setAnalysisStep("");
      }, 1500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleAddEmail = async () => {
    if (!user) return;

    if (newEmailProvider === "gmail") {
      setSaving(true);
      window.location.href = "https://budgely-backend-production.up.railway.app/api/auth/google";
      return;
    }

    if (newEmailProvider === "outlook") {
      setSaving(true);
      try {
        const data = await invokeAuthenticatedFunction<{ url?: string }>("microsoft-auth");
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error("Aucune URL d'autorisation reçue");
      } catch (err: any) {
        toast.error("Erreur : " + (err.message || "Impossible de lancer la connexion Outlook"));
        setSaving(false);
      }
      return;
    }

    // For other providers, keep manual flow
    if (!newEmail.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("connected_emails")
      .insert({ user_id: user.id, email: newEmail.trim(), provider: newEmailProvider })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }
    setEmails((prev) => [...prev, data as ConnectedEmail]);
    setNewEmail("");
    setNewEmailProvider("gmail");
    setShowEmailDialog(false);
    toast.success("Adresse email connectée !");
  };

  const handleSyncEmail = async (emailAddr: string, provider: string) => {
    if (!user || syncing) return;
    setSyncing(true);
    const funcName = provider === "microsoft" ? "microsoft-sync" : "gmail-sync";
    const providerLabel = provider === "microsoft" ? "Outlook" : "Gmail";
    toast.info(`Synchronisation ${providerLabel} en cours…`);
    try {
      const data = await invokeAuthenticatedFunction<any>(funcName, { email: emailAddr });
      if (data?.analyzed > 0) {
        toast.success(`${data.analyzed} email(s) analysé(s) sur ${data.total}`);
        const { data: expenseRes } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        const mapped = (expenseRes || []).map((e: any) => {
          const articles = (e.articles || []).map((a: any) => ({
            name: a.nom || a.name || "",
            qty: a.quantite || a.qty || 1,
            unit: a.unite || a.unit || "pce",
            unitPrice: a.prix_unitaire || a.unitPrice || 0,
            total: a.prix_total || a.total || 0,
          }));
          return {
            id: e.id,
            store: e.magasin || e.fournisseur || "Inconnu",
            date: e.date_expense
              ? new Date(e.date_expense).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
              : "Date inconnue",
            total: `€${(e.montant_total || 0).toFixed(2)}`,
            items: articles.length,
            status: "Analysé",
            products: articles,
            source: e.source,
          };
        });
        setExpenses(mapped);
        setEmails((prev) =>
          prev.map((em) => (em.email === emailAddr ? { ...em, last_sync_at: new Date().toISOString() } : em)),
        );
      } else {
        toast.info(data?.message || "Aucun email financier trouvé");
      }
    } catch (err: any) {
      toast.error("Erreur de synchronisation : " + (err.message || "Erreur inconnue"));
    } finally {
      setSyncing(false);
    }
  };

  const handleAddBank = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Redirect to Powens init on Railway backend
      const powensUrl = `https://budgely-backend-production.up.railway.app/powens/init?user_id=${encodeURIComponent(user.id)}`;
      window.location.href = powensUrl;
    } catch (err: any) {
      setSaving(false);
      toast.error("Erreur lors de la connexion bancaire : " + (err.message || "Erreur inconnue"));
    }
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

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  const sourceIcon = (source?: string) => {
    switch (source) {
      case "receipt":
        return "🧾";
      case "invoice":
        return "📄";
      case "email":
        return "📧";
      case "bank":
        return "🏦";
      default:
        return "🧾";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Capture des dépenses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Importez et centralisez toutes vos dépenses, quel que soit leur format.
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`bg-card rounded-2xl border-2 border-dashed p-10 text-center mb-8 transition-colors cursor-pointer ${
            uploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
          }`}
        >
          {uploading ? (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{analysisStep}</p>
                <Progress value={analysisProgress} className="mt-3 max-w-xs mx-auto h-2" />
                <p className="text-xs text-muted-foreground mt-2">{analysisProgress}%</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Glissez un ticket ici ou cliquez pour importer</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP ou PDF — max 10 Mo</p>
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Camera className="h-4 w-4" />
                  Prendre une photo
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Importer un fichier
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Premium CTA */}
        <div className="mb-8">
          <PremiumCTA message="Analyse mail illimitée avec Premium — limite de 5/mois atteinte" />
        </div>

        {/* Connection Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Email tile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() =>
              hasEmails ? handleSyncEmail(emails[0]?.email, emails[0]?.provider) : setShowEmailDialog(true)
            }
            className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {hasEmails ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      📥 {emails.length} email{emails.length > 1 ? "s" : ""} connecté{emails.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {emails.map((e) => e.email).join(", ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">📥 Emails : connexion messagerie</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Importez automatiquement vos reçus depuis votre boîte mail
                    </p>
                  </>
                )}
              </div>
              {hasEmails ? (
                <div className="flex items-center gap-2 shrink-0">
                  <RefreshCw className={`h-4 w-4 text-primary ${syncing ? "animate-spin" : ""}`} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmailDialog(true);
                    }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/settings");
                  }}
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
            onClick={() => (hasBanks ? handleSyncBank() : setShowBankDialog(true))}
            className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {hasBanks ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      🏦 {banks.length} compte{banks.length > 1 ? "s" : ""} connecté{banks.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {banks.map((b) => b.account_label || b.bank_name).join(", ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">🏦 Banque : connexion sécurisée</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synchronisez vos transactions bancaires en toute sécurité
                    </p>
                  </>
                )}
              </div>
              {hasBanks ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncBank();
                    }}
                    disabled={syncing}
                    className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-primary ${syncing ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBankDialog(true);
                    }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/settings");
                  }}
                  className="text-[10px] text-primary font-medium hover:underline mt-0.5"
                >
                  Gérer dans les paramètres →
                </button>
              </div>
            )}
          </motion.div>

          {/* Cash expense tile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCashDialog(true)}
            className="bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">💵 Espèces : saisie manuelle</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ajoutez vos dépenses réglées en espèces</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </motion.div>
        </div>

        {/* Receipt List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Dépenses analysées</p>
            <Badge variant="secondary" className="text-xs">
              {expenses.length} résultat{expenses.length > 1 ? "s" : ""}
            </Badge>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Chargement…</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Aucune dépense analysée</p>
              <p className="text-xs text-muted-foreground mt-1">Importez un ticket ou une facture pour commencer</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    onClick={() => setSelectedReceipt(r)}
                    className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-lg cursor-pointer"
                  >
                    {sourceIcon(r.source)}
                  </div>
                  <div onClick={() => setSelectedReceipt(r)} className="cursor-pointer flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.store}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.date} ·{" "}
                      {r.items > 0 ? `${r.items} article${r.items > 1 ? "s" : ""}` : r.description || "Aucun article"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{r.total}</span>
                  {r.source === "email" && r.source_id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValidateEmail(r.source_id!, "approved");
                        }}
                        disabled={validatingId === r.source_id}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-green-500/10 hover:text-green-600 transition-colors disabled:opacity-50"
                        title="Approuver"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleValidateEmail(r.source_id!, "rejected");
                        }}
                        disabled={validatingId === r.source_id}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                        title="Refuser"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditExpense(r.id);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingExpenseId(r.id);
                    }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight
                    onClick={() => setSelectedReceipt(r)}
                    className="h-4 w-4 text-muted-foreground cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transition CTA to analysis */}
        {expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {expenses.length} dépense{expenses.length > 1 ? "s" : ""} capturée{expenses.length > 1 ? "s" : ""} —
                  passez à l'analyse !
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Découvrez où va votre argent, détectez les abonnements cachés et optimisez votre budget.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigate("/transactions")}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Analyser mes dépenses
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/insights")}
                  className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Optimisations
                </button>
              </div>
            </div>
          </motion.div>
        )}
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
                {emailProviders.map((p) => (
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

            {newEmailProvider === "gmail" ? (
              <>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground">
                    🔒 Connexion sécurisée via Google OAuth. Nous n'accédons qu'en lecture seule à vos emails.
                  </p>
                </div>
                <button
                  onClick={handleAddEmail}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Se connecter avec Google
                </button>
              </>
            ) : newEmailProvider === "outlook" ? (
              <>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground">
                    🔒 Connexion sécurisée via Microsoft OAuth. Nous n'accédons qu'en lecture seule à vos emails.
                  </p>
                </div>
                <button
                  onClick={handleAddEmail}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0078d4] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                  )}
                  Se connecter avec Microsoft
                </button>
              </>
            ) : (
              <>
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
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground">
                    ⚠️ L'import automatique n'est disponible que pour Gmail et Outlook. Les autres fournisseurs
                    nécessitent un import manuel.
                  </p>
                </div>
                <button
                  onClick={handleAddEmail}
                  disabled={saving || !newEmail.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Connecter
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank connection dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connecter un compte bancaire</DialogTitle>
            <DialogDescription>
              Vous allez être redirigé vers notre partenaire sécurisé pour connecter votre banque et synchroniser vos transactions automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-secondary/50 rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground">
                🔒 Vos identifiants bancaires ne sont jamais stockés. Connexion sécurisée via Powens, agréé par l'ACPR Banque de France.
              </p>
            </div>
            <button
              onClick={handleAddBank}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Connecter ma banque
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt detail sheet */}
      <Sheet open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedReceipt && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    {sourceIcon(selectedReceipt.source)}
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedReceipt.store}</SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {selectedReceipt.date} · {selectedReceipt.items} articles
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedReceipt.products.length} produits</span>
                </div>
                <span className="text-base font-bold text-foreground">{selectedReceipt.total}</span>
              </div>

              {selectedReceipt.products.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Produit</span>
                    <span className="text-right w-20">Prix unit.</span>
                    <span className="text-right w-16">Total</span>
                  </div>
                  {selectedReceipt.products.map((p, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">Qté: {p.qty}</span>
                          {p.pricePerUnit && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              {p.pricePerUnit}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground text-right w-20">
                        {p.unitPrice.toFixed(2)} €
                      </span>
                      <span className="text-sm tabular-nums font-semibold text-foreground text-right w-16">
                        {p.total.toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun détail d'articles disponible</p>
              )}

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{selectedReceipt.total}</span>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cash expense dialog */}
      <CashExpenseDialog
        open={showCashDialog}
        onOpenChange={setShowCashDialog}
        onExpenseAdded={(data) => {
          const articles = (data.articles || []).map((a: any) => ({
            name: a.nom || a.name || "",
            qty: a.quantite || a.qty || 1,
            unit: a.unite || a.unit || "pce",
            unitPrice: a.prix_unitaire || a.unitPrice || 0,
            total: a.prix_total || a.total || 0,
          }));
          const newReceipt: Receipt = {
            id: data.id,
            store: data.magasin || "Inconnu",
            date: data.date_expense
              ? new Date(data.date_expense).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Aujourd'hui",
            total: `€${(data.montant_total || 0).toFixed(2)}`,
            items: articles.length,
            status: "Analysé",
            products: articles,
            source: data.source,
          };
          setExpenses((prev) => [newReceipt, ...prev]);
        }}
      />

      {/* Edit expense dialog */}
      <EditExpenseDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        expense={editingExpense}
        onSaved={reloadExpenses}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingExpenseId} onOpenChange={(open) => !open && setDeletingExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              Es-tu sûr de vouloir supprimer cette dépense ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Receipts;
