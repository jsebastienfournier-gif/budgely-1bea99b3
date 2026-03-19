import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Trash2, Check, Eye } from "lucide-react";
import { toast } from "sonner";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
};

const ContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const markAsRead = async (id: string) => {
    await (supabase as any).from("contact_messages").update({ read: true }).eq("id", id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const deleteMessage = async (id: string) => {
    const { error } = await (supabase as any).from("contact_messages").delete().eq("id", id);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Message supprimé");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? "s" : ""}
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {unreadCount} non lu{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-card border rounded-xl p-5 transition-colors ${
                msg.read ? "border-border" : "border-primary/30 bg-primary/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                    <p className="text-sm font-semibold text-foreground truncate">{msg.name}</p>
                    <span className="text-xs text-muted-foreground">—</span>
                    <a
                      href={`mailto:${msg.email}`}
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {msg.email}
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(msg.created_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!msg.read && (
                    <button
                      onClick={() => markAsRead(msg.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Marquer comme lu"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <a
                    href={`mailto:${msg.email}?subject=Re: Votre message sur Budgely&body=%0A%0A---%0AEn réponse à votre message :%0A${encodeURIComponent(msg.message)}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Répondre"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactMessages;
