import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
};

const CACHE_KEY = "budgely_maintenance_cache";

const readCache = (): MaintenanceSettings | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MaintenanceSettings) : null;
  } catch {
    return null;
  }
};

export const useMaintenanceMode = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>(
    () => readCache() ?? { enabled: false, message: "" }
  );
  // Si le cache indique une maintenance active, on considère l'état comme connu
  // pour l'afficher instantanément (vérification en arrière-plan).
  const [loading, setLoading] = useState(() => !readCache()?.enabled);

  const fetchMaintenance = async () => {
    try {
      const request = supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      // Ne jamais bloquer l'affichage de l'app si la requête traîne
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 4000)
      );

      const { data } = (await Promise.race([request, timeout])) as { data: any };

      if (data?.value) {
        const val = data.value as unknown as MaintenanceSettings;
        const next = { enabled: val.enabled ?? false, message: val.message ?? "" };
        setMaintenance(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {}
      }
    } catch {
      // en cas d'erreur réseau, on laisse l'app accessible
    } finally {
      setLoading(false);
    }
  };


  const toggleMaintenance = async (enabled: boolean, message?: string) => {
    const newValue = {
      enabled,
      message: message ?? maintenance.message,
    };
    const { error } = await supabase
      .from("app_settings")
      .update({ value: newValue as any, updated_at: new Date().toISOString() })
      .eq("key", "maintenance_mode");

    if (!error) {
      setMaintenance(newValue);
    }
    return { error };
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  return { maintenance, loading, toggleMaintenance, refetch: fetchMaintenance };
};
