import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
};

export const useMaintenanceMode = () => {
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({ enabled: false, message: "" });
  const [loading, setLoading] = useState(true);

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
        setMaintenance({ enabled: val.enabled ?? false, message: val.message ?? "" });
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
