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
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (data?.value) {
      const val = data.value as unknown as MaintenanceSettings;
      setMaintenance({ enabled: val.enabled ?? false, message: val.message ?? "" });
    }
    setLoading(false);
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
