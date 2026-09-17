import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Loader2, Check, Coins, Sparkles, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { railwayFetch } from "@/lib/railway-api";
import { toast } from "sonner";

type ArticleRow = {
  name: string;
  qty: number;
  unitPrice: number;
  category: string;
  subcategory: string;
};

interface TaxonomyData {
  categories: string[];
  taxonomy: Record<string, string[]>;
  optional_categories: string[];
}

interface CashExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded?: (expense: any) => void;
  prefill?: {
    merchant?: string;
    amount?: number;
    date?: string;
    articles?: Array<{ nom: string; quantite: number; prix_unitaire: number; prix_total: number }>;
    categorie?: string;
    missingDate?: boolean;
  };
}

const CashExpenseDialog = ({ open, onOpenChange, onExpenseAdded, prefill }: CashExpenseDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [location, setLocation] = useState("");
  const [globalCategory, setGlobalCategory] = useState("");
  const [globalSubcategory, setGlobalSubcategory] = useState("");
  const [articles, setArticles] = useState<ArticleRow[]>([{ name: "", qty: 1, unitPrice: 0, category: "", subcategory: "" }]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyData | null>(null);

  // Charger la taxonomie depuis le backend
  useEffect(() => {
    railwayFetch<TaxonomyData>("/taxonomy").then(setTaxonomy).catch(console.error);
  }, []);

  // Pré-remplir depuis le parser
  useEffect(() => {
    if (open && prefill) {
      if (prefill.merchant) setLocation(prefill.merchant);

      if (prefill.date) {
        try { setDate(new Date(prefill.date)); } catch {}
      }

      if (prefill.articles && prefill.articles.length > 0) {
        setArticles(prefill.articles.map(a => ({
          name: a.nom || "",
          qty: a.quantite || 1,
          unitPrice: a.prix_unitaire || (a.prix_total / (a.quantite || 1)) || 0,
          category: "",
          subcategory: "",
        })));
      } else if (prefill.amount && prefill.amount > 0) {
        setArticles([{ name: prefill.merchant || "Article", qty: 1, unitPrice: prefill.amount, category: "", subcategory: "" }]);
      }

      if (prefill.categorie && taxonomy) {
        const matched = taxonomy.categories.find(c => c.toLowerCase() === prefill.categorie?.toLowerCase());
        if (matched) setGlobalCategory(matched);
      }
    }
  }, [open, prefill, taxonomy]);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      setDate(new Date());
      setLocation("");
      setGlobalCategory("");
      setGlobalSubcategory("");
      setArticles([{ name: "", qty: 1, unitPrice: 0, category: "", subcategory: "" }]);
    }
  }, [open]);

  const addArticle = () => setArticles(prev => [...prev, { name: "", qty: 1, unitPrice: 0, category: "", subcategory: "" }]);

  const removeArticle = (i: number) => {
    if (articles.length <= 1) return;
    setArticles(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateArticle = (i: number, field: keyof ArticleRow, value: string | number) => {
    setArticles(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value, ...(field === "category" ? { subcategory: "" } : {}) } : a));
  };

  const totalAmount = articles.reduce((sum, a) => sum + (a.qty * a.unitPrice), 0);
  const isValid = location.trim().length > 0 && articles.some(a => a.unitPrice > 0);
  const hasMultipleArticles = articles.length > 1;

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setSaving(true);

    try {
      const formattedArticles = articles
        .filter(a => a.unitPrice > 0)
        .map(a => ({
          nom: a.name.trim() || location.trim(),
          quantite: a.qty,
          prix_unitaire: a.unitPrice,
          prix_total: a.qty * a.unitPrice,
          category: a.category || globalCategory || "",
          subcategory: a.subcategory || globalSubcategory || "",
        }));

      const { data, error } = await supabase.from("expenses").insert({
        user_id: user.id,
        source: "receipt" as any,
        magasin: location.trim(),
        date_expense: format(date, "yyyy-MM-dd"),
        montant_total: totalAmount,
        articles: formattedArticles as any,
        moyen_paiement: prefill ? "carte" : "espèces",
        type_depense: "achat",
        categorie: globalCategory || formattedArticles[0]?.category || "Autre",
        subcategory: globalSubcategory || formattedArticles[0]?.subcategory || "",
        devise: "EUR",
        description: `${location.trim()} — ${format(date, "dd/MM/yyyy")}`,
      }).select().single();

      if (error) throw error;

      // Sync Railway
      try {
        const railwayResp = await railwayFetch<{ id?: string }>("/expenses/", {
          method: "POST",
          body: {
            amount: Number(totalAmount.toFixed(2)),
            currency: "EUR",
            merchant: location.trim(),
            category: (globalCategory || "autre").toLowerCase(),
            subcategory: globalSubcategory || "",
            date: format(date, "yyyy-MM-dd"),
            description: `${location.trim()} — ${format(date, "dd/MM/yyyy")}`,
          },
        });
        if (railwayResp?.id && data?.id) {
          await supabase.from("expenses").update({ railway_id: railwayResp.id } as any).eq("id", data.id);
        }
      } catch (e) {
        console.warn("[railway/expenses/post] failed:", e);
      }

      toast.success("Dépense enregistrée !");
      onExpenseAdded?.(data);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const categories = taxonomy?.categories || [];
  const getSubcategories = (cat: string) => taxonomy?.taxonomy[cat] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {prefill ? "Vérifier & enregistrer" : "Dépense en espèces"}
          </DialogTitle>
          <DialogDescription>
            {prefill?.missingDate
              ? `Ticket détecté : ${prefill.merchant || "inconnu"} — ${prefill.amount?.toFixed(2) ?? "?"}€. Vérifiez et complétez les informations.`
              : prefill
              ? `Vérifiez les informations extraites du ticket avant d'enregistrer.`
              : "Saisissez manuellement une dépense réglée en espèces."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">

          {/* Date */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Date {prefill?.missingDate && <span className="text-destructive">*</span>}
            </Label>
            {prefill?.missingDate && (
              <p className="text-xs text-muted-foreground mb-1.5">La date n'a pas pu être lue — sélectionnez-la.</p>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", prefill?.missingDate && "border-primary ring-1 ring-primary/30")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Commerçant */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Lieu / Commerçant</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Bexley, Carrefour…" maxLength={100} />
          </div>

          {/* Catégorie globale (si article unique) */}
          {!hasMultipleArticles && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Catégorie</Label>
                <Select value={globalCategory} onValueChange={(v) => { setGlobalCategory(v); setGlobalSubcategory(""); }}>
                  <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Sous-catégorie</Label>
                <Select value={globalSubcategory} onValueChange={setGlobalSubcategory} disabled={!globalCategory}>
                  <SelectTrigger><SelectValue placeholder="Sous-catégorie" /></SelectTrigger>
                  <SelectContent>
                    {getSubcategories(globalCategory).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Articles</Label>
              <button type="button" onClick={addArticle} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                <Plus className="h-3 w-3" /> Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {articles.map((article, i) => (
                <div key={i} className="bg-secondary/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={article.name}
                      onChange={(e) => updateArticle(i, "name", e.target.value)}
                      placeholder="Nom du produit"
                      className="flex-1 h-9 text-sm"
                      maxLength={80}
                    />
                    {articles.length > 1 && (
                      <button type="button" onClick={() => removeArticle(i)} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Quantité</span>
                      <Input type="number" min={1} value={article.qty} onChange={(e) => updateArticle(i, "qty", Math.max(1, parseInt(e.target.value) || 1))} className="h-9 text-sm mt-0.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Prix unitaire (€)</span>
                      <Input type="number" min={0} step={0.01} value={article.unitPrice || ""} onChange={(e) => updateArticle(i, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))} placeholder="0.00" className="h-9 text-sm mt-0.5" />
                    </div>
                  </div>

                  {/* Catégorie par article si plusieurs articles */}
                  {hasMultipleArticles && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium">Catégorie</span>
                        <Select value={article.category} onValueChange={(v) => updateArticle(i, "category", v)}>
                          <SelectTrigger className="h-9 text-sm mt-0.5"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                          <SelectContent>
                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-medium">Sous-catégorie</span>
                        <Select value={article.subcategory} onValueChange={(v) => updateArticle(i, "subcategory", v)} disabled={!article.category}>
                          <SelectTrigger className="h-9 text-sm mt-0.5"><SelectValue placeholder="Sous-cat." /></SelectTrigger>
                          <SelectContent>
                            {getSubcategories(article.category).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {article.unitPrice > 0 && (
                    <p className="text-[10px] text-muted-foreground text-right">
                      Sous-total : <span className="font-semibold text-foreground">{(article.qty * article.unitPrice).toFixed(2)} €</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold tabular-nums text-primary">{totalAmount.toFixed(2)} €</span>
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={saving || !isValid} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Enregistrer la dépense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashExpenseDialog;

