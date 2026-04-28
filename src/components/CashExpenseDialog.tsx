import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Loader2, Check, Coins, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { railwayFetch } from "@/lib/railway-api";
import { toast } from "sonner";

const CATEGORIES = [
  "Alimentation", "Transport", "Logement", "Santé", "Loisirs",
  "Shopping", "Restauration", "Éducation", "Abonnements",
  "Épargne", "Investissement", "Autre",
];

const normalizeName = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentation: ["carrefour", "leclerc", "auchan", "lidl", "aldi", "monoprix", "franprix", "intermarche", "casino", "super u", "picard", "boulangerie", "boucherie", "primeur", "marche"],
  Restauration: ["restaurant", "resto", "mcdo", "mcdonald", "kfc", "burger", "subway", "starbucks", "cafe", "brasserie", "pizzeria", "pizza", "kebab", "sushi", "uber eats", "deliveroo"],
  Transport: ["sncf", "ratp", "uber", "bolt", "taxi", "essence", "total", "shell", "bp", "esso", "station", "parking", "blablacar", "ouigo", "trainline"],
  Logement: ["edf", "engie", "veolia", "suez", "loyer", "syndic", "leroy merlin", "castorama", "bricorama", "ikea"],
  Loisirs: ["cinema", "ugc", "pathe", "gaumont", "spotify", "deezer", "fnac", "decathlon", "concert", "theatre"],
  Shopping: ["amazon", "zara", "h&m", "uniqlo", "zalando", "veepee", "shein", "asos"],
  Santé: ["pharmacie", "pharma", "medecin", "docteur", "dentiste", "hopital", "clinique", "laboratoire"],
  Abonnements: ["netflix", "prime video", "disney", "canal", "orange", "free", "sfr", "bouygues", "spotify", "icloud", "google one"],
  Éducation: ["udemy", "coursera", "ecole", "universite", "librairie"],
};

const guessCategoryLocal = (name: string): string | null => {
  const n = normalizeName(name);
  if (!n) return null;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => n.includes(k))) return cat;
  }
  return null;
};

type ArticleRow = { name: string; qty: number; unitPrice: number };

interface CashExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded?: (expense: any) => void;
}

const CashExpenseDialog = ({ open, onOpenChange, onExpenseAdded }: CashExpenseDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [location, setLocation] = useState("");
  const [categorie, setCategorie] = useState<string>("");
  const [categorieAuto, setCategorieAuto] = useState(false);
  const [categorieTouched, setCategorieTouched] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([{ name: "", qty: 1, unitPrice: 0 }]);

  // Auto-détection de la catégorie depuis le nom du commerçant
  useEffect(() => {
    const name = location.trim();
    if (!name || categorieTouched) return;
    let cancelled = false;
    setDetecting(true);
    const timer = setTimeout(async () => {
      try {
        // 1) Lookup merchant_profiles (apprentissage)
        const normalized = normalizeName(name);
        const { data: profiles } = await supabase
          .from("merchant_profiles")
          .select("category, confidence")
          .eq("normalized_name", normalized)
          .order("confidence", { ascending: false })
          .limit(1);
        let detected = profiles?.[0]?.category as string | undefined;

        // 2) Fallback : mots-clés locaux
        if (!detected) detected = guessCategoryLocal(name) || undefined;

        if (!cancelled && detected && CATEGORIES.includes(detected)) {
          setCategorie(detected);
          setCategorieAuto(true);
        }
      } catch (e) {
        console.warn("[category/detect] failed:", e);
      } finally {
        if (!cancelled) setDetecting(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [location, categorieTouched]);

  // Reset détection quand le formulaire est fermé
  useEffect(() => {
    if (!open) {
      setCategorie("");
      setCategorieAuto(false);
      setCategorieTouched(false);
    }
  }, [open]);

  const addArticle = () => setArticles(prev => [...prev, { name: "", qty: 1, unitPrice: 0 }]);

  const removeArticle = (index: number) => {
    if (articles.length <= 1) return;
    setArticles(prev => prev.filter((_, i) => i !== index));
  };

  const updateArticle = (index: number, field: keyof ArticleRow, value: string | number) => {
    setArticles(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const totalAmount = articles.reduce((sum, a) => sum + (a.qty * a.unitPrice), 0);

  const isValid = location.trim().length > 0 && articles.some(a => a.name.trim() && a.unitPrice > 0);

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setSaving(true);

    try {
      const formattedArticles = articles
        .filter(a => a.name.trim())
        .map(a => ({
          nom: a.name.trim(),
          quantite: a.qty,
          unite: "pce",
          prix_unitaire: a.unitPrice,
          prix_total: a.qty * a.unitPrice,
        }));

      const { data, error } = await supabase.from("expenses").insert({
        user_id: user.id,
        source: "receipt" as any,
        magasin: location.trim(),
        date_expense: format(date, "yyyy-MM-dd"),
        montant_total: totalAmount,
        articles: formattedArticles as any,
        moyen_paiement: "espèces",
        type_depense: "achat",
        categorie: categorie || "Autre",
        devise: "EUR",
        description: `Dépense espèces — ${location.trim()}`,
      }).select().single();

      if (error) throw error;

      // Synchronisation Railway (best-effort) — récupère l'ID Railway et le stocke
      try {
        const railwayResp = await railwayFetch<{ id?: string }>("/expenses/", {
          method: "POST",
          body: {
            amount: Number(totalAmount.toFixed(2)),
            currency: "EUR",
            merchant: location.trim(),
            category: (categorie || "Autre").toLowerCase(),
            date: format(date, "yyyy-MM-dd"),
          },
        });
        const railwayId = railwayResp?.id;
        if (railwayId && data?.id) {
          const { error: updErr } = await supabase
            .from("expenses")
            .update({ railway_id: railwayId } as any)
            .eq("id", data.id);
          if (updErr) console.warn("[railway/expenses/post] update railway_id failed:", updErr);
          else (data as any).railway_id = railwayId;
        }
      } catch (e) {
        console.warn("[railway/expenses/post] failed:", e);
      }

      toast.success("Dépense en espèces ajoutée !");
      onExpenseAdded?.(data);

      // Reset form
      setLocation("");
      setDate(new Date());
      setArticles([{ name: "", qty: 1, unitPrice: 0 }]);
      setCategorie("");
      setCategorieAuto(false);
      setCategorieTouched(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Dépense en espèces
          </DialogTitle>
          <DialogDescription>Saisissez manuellement une dépense réglée en espèces.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Date */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Lieu / Commerçant</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Boulangerie du coin, Marché…"
              className={inputClass}
              maxLength={100}
            />
          </div>

          {/* Catégorie (auto-détectée, modifiable) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">Catégorie</Label>
              {detecting && !categorieTouched && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Détection…
                </span>
              )}
              {categorieAuto && !categorieTouched && categorie && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" />
                  Détectée auto
                </span>
              )}
            </div>
            <Select
              value={categorie}
              onValueChange={(v) => { setCategorie(v); setCategorieTouched(true); setCategorieAuto(false); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Articles achetés</Label>
              <button
                type="button"
                onClick={addArticle}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Ajouter
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
                      <button
                        type="button"
                        onClick={() => removeArticle(i)}
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Quantité</span>
                      <Input
                        type="number"
                        min={1}
                        value={article.qty}
                        onChange={(e) => updateArticle(i, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium">Prix unitaire (€)</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={article.unitPrice || ""}
                        onChange={(e) => updateArticle(i, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className="h-9 text-sm mt-0.5"
                      />
                    </div>
                  </div>
                  {article.name && article.unitPrice > 0 && (
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
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums text-primary">{totalAmount.toFixed(2)} €</span>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !isValid}
            className="w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Enregistrer la dépense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashExpenseDialog;
