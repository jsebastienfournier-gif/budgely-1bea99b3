import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { railwayFetch } from "@/lib/railway-api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const categories = [
  "Alimentation", "Transport", "Logement", "Santé", "Loisirs",
  "Shopping", "Restauration", "Éducation", "Abonnements",
  "Épargne", "Investissement", "Autre",
];

type RawExpense = {
  id: string;
  date_expense: string | null;
  montant_total: number | null;
  categorie: string | null;
  description: string | null;
  fournisseur: string | null;
  magasin: string | null;
  source: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: RawExpense | null;
  onSaved: () => void;
};

const EditExpenseDialog = ({ open, onOpenChange, expense, onSaved }: Props) => {
  const [date, setDate] = useState("");
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState("");
  const [description, setDescription] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setDate(expense.date_expense || "");
      setMontant(expense.montant_total?.toString() || "");
      setCategorie(expense.categorie || "");
      setDescription(expense.description || "");
      setFournisseur(expense.magasin || expense.fournisseur || "");
    }
  }, [expense]);

  const handleSave = async () => {
    if (!expense) return;
    setSaving(true);
    const { error } = await supabase
      .from("expenses")
      .update({
        date_expense: date || null,
        montant_total: montant ? parseFloat(montant) : null,
        categorie: categorie || null,
        description: description || null,
        fournisseur: fournisseur || null,
        magasin: fournisseur || null,
      })
      .eq("id", expense.id);

    if (error) {
      setSaving(false);
      toast.error("Erreur lors de la modification");
      return;
    }

    // Sync Railway (best-effort) si la dépense a un railway_id
    try {
      const { data: row } = await supabase
        .from("expenses")
        .select("railway_id")
        .eq("id", expense.id)
        .maybeSingle();
      const railwayId = (row as any)?.railway_id;
      if (railwayId) {
        await railwayFetch(`/expenses/${railwayId}`, {
          method: "PUT",
          body: {
            amount: montant ? Number(parseFloat(montant).toFixed(2)) : 0,
            merchant: fournisseur || "",
            category: (categorie || "Autre").toLowerCase(),
            date: date || undefined,
          },
        });
      }
    } catch (e) {
      console.warn("[railway/expenses/put] failed:", e);
    }

    setSaving(false);
    toast.success("Dépense modifiée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la dépense</DialogTitle>
          <DialogDescription>Modifiez les informations de cette dépense.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Fournisseur / Magasin</Label>
            <Input value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} placeholder="Ex: Carrefour" className="mt-1" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Montant (€)</Label>
            <Input type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={categorie} onValueChange={setCategorie}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Note optionnelle" className="mt-1" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseDialog;
