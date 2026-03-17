import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, CreditCard, Users, Shield, ChevronRight, Camera, Loader2, Check,
  Plus, Trash2, Lock, Eye, EyeOff, LogOut
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("Profil");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Notifications (local state)
  const [notifExpenses, setNotifExpenses] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [notifTips, setNotifTips] = useState(true);

  // Foyer (local mock)
  const [members, setMembers] = useState<{ name: string; email: string; role: string }[]>([
    { name: "", email: "", role: "Membre" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");

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

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe modifié !");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation envoyée à ${inviteEmail} (fonctionnalité à venir)`);
    setInviteEmail("");
  };

  const settingsItems = [
    { icon: User, title: "Profil", desc: "Nom, email et photo de profil" },
    { icon: Users, title: "Foyer", desc: "Gérez les membres de votre foyer" },
    { icon: CreditCard, title: "Comptes bancaires", desc: "Connectez et gérez vos comptes" },
    { icon: Bell, title: "Notifications", desc: "Alertes et rappels de dépenses" },
    { icon: Shield, title: "Sécurité", desc: "Mot de passe et authentification" },
  ];

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  const renderSection = (title: string) => {
    switch (title) {
      case "Profil":
        return (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
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
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
                <input type="email" value={user?.email || ""} disabled className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-muted-foreground text-sm cursor-not-allowed" />
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        );

      case "Foyer":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Membres du foyer</p>
              <p className="text-xs text-muted-foreground mb-4">Partagez vos dépenses avec votre famille ou vos colocataires.</p>
              
              {/* Current user */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {fullName ? fullName[0].toUpperCase() : "V"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{fullName || "Vous"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">Admin</span>
              </div>
            </div>

            {/* Invite */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Inviter un membre</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  className={inputClass}
                />
                <button
                  onClick={handleInviteMember}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Inviter
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">L'invitation sera envoyée par email. Le membre pourra rejoindre votre foyer.</p>
            </div>
          </div>
        );

      case "Comptes bancaires":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Vos comptes connectés</p>
              <p className="text-xs text-muted-foreground mb-4">Connectez vos comptes bancaires pour importer automatiquement vos transactions.</p>
            </div>

            {/* Empty state */}
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Aucun compte connecté</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Connectez votre banque pour importer vos transactions automatiquement et commencer à analyser vos dépenses.
              </p>
              <button
                onClick={() => toast.info("Intégration bancaire à venir")}
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Connecter un compte
              </button>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="text-xs font-medium text-foreground mb-1">🔒 Sécurité des données</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Vos identifiants bancaires ne sont jamais stockés sur nos serveurs. Nous utilisons des connexions sécurisées et chiffrées.
              </p>
            </div>
          </div>
        );

      case "Notifications":
        return (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Préférences de notifications</p>
              <p className="text-xs text-muted-foreground mb-4">Choisissez les alertes que vous souhaitez recevoir.</p>
            </div>

            {[
              { label: "Alertes de dépenses", desc: "Soyez notifié quand une dépense inhabituelle est détectée", value: notifExpenses, setter: setNotifExpenses },
              { label: "Alerte budget dépassé", desc: "Recevez une alerte quand vous dépassez votre budget mensuel", value: notifBudget, setter: setNotifBudget },
              { label: "Résumé hebdomadaire", desc: "Recevez un résumé de vos dépenses chaque lundi", value: notifWeekly, setter: setNotifWeekly },
              { label: "Conseils & astuces", desc: "Recevez des conseils personnalisés pour économiser", value: notifTips, setter: setNotifTips },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                </div>
                <Switch checked={n.value} onCheckedChange={n.setter} />
              </div>
            ))}

            <button
              onClick={() => toast.success("Préférences sauvegardées (fonctionnalité à venir)")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Check className="h-4 w-4" />
              Sauvegarder
            </button>
          </div>
        );

      case "Sécurité":
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Changer le mot de passe</p>
              <p className="text-xs text-muted-foreground mb-4">Mettez à jour votre mot de passe pour sécuriser votre compte.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPw || !newPassword}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Modifier le mot de passe
              </button>
            </div>

            {/* Session */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-1">Session active</p>
              <p className="text-xs text-muted-foreground mb-3">Vous êtes connecté depuis cet appareil.</p>
              <button
                onClick={() => { signOut(); toast.success("Déconnexion réussie"); }}
                className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter de tous les appareils
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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

              <AnimatePresence>
                {activeSection === item.title && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-card rounded-2xl p-6 border border-border mt-2 overflow-hidden"
                  >
                    {renderSection(item.title)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="mt-12">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-3">Zone de danger</p>
          <div className="bg-card rounded-2xl p-5 border border-destructive/20">
            <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
            <p className="text-xs text-muted-foreground mt-1">Cette action est irréversible et supprimera toutes vos données.</p>
            <button
              onClick={() => toast.error("Contactez le support pour supprimer votre compte")}
              className="mt-4 text-xs font-medium bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
