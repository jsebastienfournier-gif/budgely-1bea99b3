import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Users, Shield, ChevronRight, Camera, Loader2, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("Profil");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url);
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour !");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur d'upload");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success("Photo mise à jour !");
  };

  const settingsItems = [
    { icon: User, title: "Profil", desc: "Nom, email et photo de profil" },
    { icon: Users, title: "Foyer", desc: "Gérez les membres de votre foyer" },
    { icon: CreditCard, title: "Comptes bancaires", desc: "Connectez et gérez vos comptes" },
    { icon: Bell, title: "Notifications", desc: "Alertes et rappels de dépenses" },
    { icon: Shield, title: "Sécurité", desc: "Mot de passe et authentification" },
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
        </div>

        <div className="space-y-4">
          {settingsItems.map((item, i) => (
            <div key={item.title}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveSection(activeSection === item.title ? null : item.title)}
                className="bg-card rounded-2xl p-5 border border-border flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${activeSection === item.title ? "rotate-90" : ""}`} />
              </motion.div>

              {/* Profile Section Expanded */}
              {activeSection === "Profil" && item.title === "Profil" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-card rounded-2xl p-6 border border-border mt-2"
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative group">
                      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-muted-foreground">
                            {fullName ? fullName[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        {uploading ? (
                          <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3 text-primary-foreground" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{fullName || "Votre nom"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Nom complet</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-muted-foreground text-sm cursor-not-allowed"
                      />
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Enregistrer
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="mt-12">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-3">Zone de danger</p>
          <div className="bg-card rounded-2xl p-5 border border-destructive/20">
            <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
            <p className="text-xs text-muted-foreground mt-1">Cette action est irréversible et supprimera toutes vos données.</p>
            <button className="mt-4 text-xs font-medium bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
