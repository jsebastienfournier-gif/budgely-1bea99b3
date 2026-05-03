import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { railwayFetch } from "@/lib/railway-api";

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

    // 1) Dépenses non-email depuis Supabase
    const { data: supaData } = await supabase
      .from("expenses")
      .select("id, montant_total, categorie, fournisseur, magasin, date_expense, source, description, devise, abonnement_detecte, recurrence, created_at")
      .eq("user_id", user.id)
      .neq("source", "email")
      .order("date_expense", { ascending: false });

    // 2) Dépenses email depuis Railway
    let railwayData: Expense[] = [];
    try {
      const raw = await railwayFetch<any[]>("/expenses/", { query: { source: "email" } });
      if (Array.isArray(raw)) {
        railwayData = raw.map((e: any) => ({
          id: e.id ?? e._id ?? crypto.randomUUID(),
          montant_total: e.montant_total ?? e.amount ?? null,
          categorie: e.categorie ?? e.category ?? null,
          fournisseur: e.fournisseur ?? e.merchant ?? null,
          magasin: e.magasin ?? null,
          date_expense: e.date_expense ?? e.date ?? null,
          source: "email" as const,
          description: e.description ?? null,
          devise: e.devise ?? e.currency ?? "EUR",
          abonnement_detecte: e.abonnement_detecte ?? false,
          recurrence: e.recurrence ?? null,
          created_at: e.created_at ?? new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn("Impossible de récupérer les dépenses email depuis Railway:", err);
    }

    // 3) Fusionner et trier par date décroissante
    const merged = [...(supaData || []) as Expense[], ...railwayData].sort((a, b) => {
      const da = a.date_expense ? new Date(a.date_expense).getTime() : 0;
      const db = b.date_expense ? new Date(b.date_expense).getTime() : 0;
      return db - da;
    });

    setExpenses(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { expenses, loading, refresh };
};
