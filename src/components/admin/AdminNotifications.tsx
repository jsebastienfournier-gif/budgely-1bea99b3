import { useState } from "react";
import { Bell, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Veuillez remplir le titre et le message");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          action: "broadcast",
          title: title.trim(),
          body: body.trim(),
          url: "/dashboard",
        },
      });

      if (error) throw error;

      toast.success(`Notification envoyée à ${data?.sent || 0} utilisateur(s)`);
      setTitle("");
      setBody("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    }
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Notifications push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Titre
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Mise à jour importante"
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Message
          </label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Le contenu de la notification..."
            rows={3}
            maxLength={500}
          />
        </div>
        <Button
          onClick={handleBroadcast}
          disabled={sending || !title.trim() || !body.trim()}
          className="gap-2"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Envoyer à tous les utilisateurs
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminNotifications;
