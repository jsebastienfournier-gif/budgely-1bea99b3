import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Expense = {
  id: string;
  montant_total: number | null;
  categorie: string | null;
  fournisseur: string | null;
  magasin: string | null;
  date_expense: string | null;
  source: "receipt" | "invoice" | "email" | "bank";
  description: string | null;
  devise: string | null;
  abonnement_detecte: boolean | null;
  recurrence: string | null;
  created_at: string;
};

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id, montant_total, categorie, fournisseur, magasin, date_expense, source, description, devise, abonnement_detecte, recurrence, created_at")
      .eq("user_id", user.id)
      .order("date_expense", { ascending: false });

    if (!error && data) {
      setExpenses(data as Expense[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { expenses, loading, refresh };
};
