import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const getSessionId = () => {
  let id = sessionStorage.getItem("tracking_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("tracking_session_id", id);
  }
  return id;
};

export const usePageTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Small delay to avoid tracking rapid navigation
    const timeout = setTimeout(() => {
      (supabase as any).from("page_views").insert({
        path: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
        user_id: user?.id || null,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [location.pathname, user?.id]);
};
