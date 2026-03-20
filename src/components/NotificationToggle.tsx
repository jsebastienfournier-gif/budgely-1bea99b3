import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  getPushPermission,
} from "@/lib/push-notifications";

const NotificationToggle = () => {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const sup = await isPushSupported();
      setSupported(sup);
      if (sup) {
        const sub = await isSubscribedToPush();
        setSubscribed(sub);
      }
      setLoading(false);
    };
    check();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setSubscribed(false);
          toast.success("Notifications désactivées");
        }
      } else {
        const permission = await getPushPermission();
        if (permission === "denied") {
          toast.error("Les notifications sont bloquées dans les paramètres de votre navigateur");
          setLoading(false);
          return;
        }
        const ok = await subscribeToPush();
        if (ok) {
          setSubscribed(true);
          toast.success("Notifications activées !");
        } else {
          toast.error("Impossible d'activer les notifications");
        }
      }
    } catch {
      toast.error("Erreur lors du changement de notification");
    }
    setLoading(false);
  };

  if (!supported) return null;

  return (
    <Button
      variant={subscribed ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {subscribed ? "Désactiver les notifications" : "Activer les notifications"}
    </Button>
  );
};

export default NotificationToggle;
