import { useState } from "react";
import {
  Shield, Trash2, Loader2, Crown, UserCog, Eye, Ban, RotateCcw,
  KeyRound, Mail, CheckCircle, Copy, AlertTriangle, X, User,
  FileText, CreditCard, Receipt, Send, Bell, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  plan?: string;
  banned?: boolean;
  banned_until?: string | null;
  email_confirmed_at?: string | null;
  phone?: string | null;
  stats?: {
    expenses_count: number;
    documents_count: number;
    subscriptions_count: number;
  };
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive" },
  moderator: { label: "Modérateur", color: "bg-amber-500/10 text-amber-600" },
  user: { label: "Utilisateur", color: "bg-primary/10 text-primary" },
};

const callAdmin = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

type Props = {
  user: AdminUser | null;
  currentUserId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
};

export default function AdminUserDetail({ user: targetUser, currentUserId, open, onOpenChange, onRefresh }: Props) {
  const [detail, setDetail] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [suspendDuration, setSuspendDuration] = useState("30");
  const [confirmAction, setConfirmAction] = useState<{ title: string; desc: string; onConfirm: () => void } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notifDialog, setNotifDialog] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [resetDataDialog, setResetDataDialog] = useState(false);

  const isSelf = targetUser?.id === currentUserId;

  const loadDetail = async () => {
    if (!targetUser) return;
    setLoading(true);
    try {
      const data = await callAdmin({ action: "get_user_detail", target_user_id: targetUser.id });
      setDetail(data.user);
      setEditName(data.user.full_name || "");
      setEditEmail(data.user.email || "");
    } catch {
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && targetUser) {
      setTempPassword(null);
      loadDetail();
    }
  };

  const u = detail || targetUser;
  if (!u) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      if (editName !== (u.full_name || "")) {
        promises.push(callAdmin({ action: "update_profile", target_user_id: u.id, full_name: editName }));
      }
      if (editEmail !== (u.email || "")) {
        promises.push(callAdmin({ action: "update_email", target_user_id: u.id, email: editEmail }));
      }
      await Promise.all(promises);
      toast.success("Profil mis à jour");
      onRefresh();
      loadDetail();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (method: "set" | "temp" | "link") => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = {
        action: "reset_password",
        target_user_id: u.id,
      };
      if (method === "set" && newPassword) {
        body.new_password = newPassword;
      } else if (method === "link") {
        body.send_link = true;
      }

      const data = await callAdmin(body);
      if (data.method === "temp_password") {
        setTempPassword(data.temp_password);
        toast.success("Mot de passe temporaire généré");
      } else if (data.method === "link_sent") {
        toast.success("Lien de réinitialisation envoyé par email");
        setResetDialog(false);
      } else {
        toast.success("Mot de passe modifié");
        setResetDialog(false);
      }
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await callAdmin({ action: "suspend_user", target_user_id: u.id, duration: suspendDuration });
      toast.success("Compte suspendu");
      setSuspendDialog(false);
      onRefresh();
      loadDetail();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    setActionLoading(true);
    try {
      await callAdmin({ action: "unsuspend_user", target_user_id: u.id });
      toast.success("Compte réactivé");
      onRefresh();
      loadDetail();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEmail = async () => {
    setActionLoading(true);
    try {
      await callAdmin({ action: "confirm_email", target_user_id: u.id });
      toast.success("Email confirmé");
      onRefresh();
      loadDetail();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetUserData = async () => {
    setActionLoading(true);
    try {
      await callAdmin({ action: "reset_user_data", target_user_id: u.id });
      toast.success("Données utilisateur réinitialisées");
      onRefresh();
      loadDetail();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
      setResetDataDialog(false);
    }
  };

  const handleSetRole = async (role: string, remove: boolean) => {
    try {
      await callAdmin({ action: "set_role", target_user_id: u.id, role, remove });
      toast.success(remove ? "Rôle retiré" : "Rôle attribué");
      onRefresh();
      loadDetail();
    } catch {
      toast.error("Erreur lors de la modification du rôle");
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await callAdmin({ action: "delete_user", target_user_id: u.id });
      toast.success("Utilisateur supprimé");
      setConfirmAction(null);
      onOpenChange(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setNotifSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          action: "notify_user",
          user_id: u.id,
          title: notifTitle.trim(),
          body: notifBody.trim(),
          url: "/dashboard",
        },
      });
      if (error) throw error;
      toast.success(`Notification envoyée (${data?.sent || 0} appareil(s))`);
      setNotifDialog(false);
      setNotifTitle("");
      setNotifBody("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setNotifSending(false);
    }
  };

  const profileChanged = editName !== (u.full_name || "") || editEmail !== (u.email || "");

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Gestion du compte
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-secondary flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{u.full_name || "Sans nom"}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {u.banned && (
                      <Badge variant="destructive" className="text-[10px]">Suspendu</Badge>
                    )}
                    {u.roles.map((r) => {
                      const style = ROLE_LABELS[r] || { label: r, color: "bg-secondary text-foreground" };
                      return (
                        <span key={r} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.color}`}>
                          {style.label}
                        </span>
                      );
                    })}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {u.plan || "free"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {u.stats && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Dépenses", value: u.stats.expenses_count, icon: Receipt },
                    { label: "Documents", value: u.stats.documents_count, icon: FileText },
                    { label: "Abonnements", value: u.stats.subscriptions_count, icon: CreditCard },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                      <s.icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inscrit le</span>
                  <span className="text-foreground">{new Date(u.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière connexion</span>
                  <span className="text-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("fr-FR") : "Jamais"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email confirmé</span>
                  <span className="text-foreground flex items-center gap-1">
                    {u.email_confirmed_at ? (
                      <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Oui</>
                    ) : (
                      <>Non
                        <button
                          onClick={handleConfirmEmail}
                          className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Confirmer
                        </button>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Edit profile */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Modifier le profil</h3>
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom complet"
                  />
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                  />
                  {profileChanged && (
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Enregistrer"}
                    </button>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Rôles</h3>
                <div className="flex items-center gap-2">
                  {(["admin", "moderator", "user"] as const).map((role) => {
                    const hasRole = u.roles.includes(role);
                    const style = ROLE_LABELS[role];
                    const disabled = isSelf && role === "admin";
                    return (
                      <button
                        key={role}
                        disabled={disabled}
                        onClick={() => handleSetRole(role, hasRole)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                          hasRole
                            ? `${style.color} ring-1 ring-current/20`
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Actions</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setResetDialog(true); setTempPassword(null); setNewPassword(""); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
                  >
                    <KeyRound className="h-4 w-4" />
                    Réinitialiser le mot de passe
                  </button>

                  <button
                    onClick={() => setNotifDialog(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-secondary hover:bg-secondary/80 transition-colors text-foreground"
                  >
                    <Bell className="h-4 w-4" />
                    Envoyer une notification
                  </button>

                  {!isSelf && (
                    <>
                      {u.banned ? (
                        <button
                          onClick={handleUnsuspend}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Réactiver le compte
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspendDialog(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors"
                        >
                          <Ban className="h-4 w-4" />
                          Suspendre le compte
                        </button>
                      )}

                      <button
                        onClick={() => setResetDataDialog(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Remettre à zéro les données
                      </button>

                      <button
                        onClick={() =>
                          setConfirmAction({
                            title: "Supprimer l'utilisateur",
                            desc: `Êtes-vous sûr de vouloir supprimer ${u.full_name || u.email} ? Cette action est irréversible.`,
                            onConfirm: handleDelete,
                          })
                        }
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer le compte
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Réinitialiser le mot de passe
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Option 1: Send reset link */}
                <button
                  onClick={() => handleResetPassword("link")}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-left"
                >
                  <Send className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Envoyer un lien par email</p>
                    <p className="text-xs text-muted-foreground">L'utilisateur recevra un email pour choisir son nouveau mot de passe</p>
                  </div>
                </button>

                {/* Option 2: Set specific password */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Définir un mot de passe manuellement"
                      type="text"
                    />
                    <button
                      onClick={() => newPassword ? handleResetPassword("set") : handleResetPassword("temp")}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors text-foreground whitespace-nowrap"
                    >
                      {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />}
                      {newPassword ? "Définir" : "Temporaire"}
                    </button>
                  </div>
                </div>

                {tempPassword && (
                  <div className="bg-secondary rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Mot de passe temporaire :</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-foreground flex-1 break-all">{tempPassword}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Copié !"); }}
                        className="p-1 hover:bg-background rounded transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend dialog */}
      <AlertDialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-amber-500" />
              Suspendre le compte
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>L'utilisateur ne pourra plus se connecter pendant la durée choisie.</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "7", label: "7 jours" },
                    { value: "30", label: "30 jours" },
                    { value: "90", label: "90 jours" },
                    { value: "permanent", label: "Permanent" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSuspendDuration(opt.value)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        suspendDuration === opt.value
                          ? "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/30"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={actionLoading}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Suspendre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction?.onConfirm}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification dialog */}
      <AlertDialog open={notifDialog} onOpenChange={setNotifDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Envoyer une notification
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Envoyer une notification push à {u.full_name || u.email}
                </p>
                <Input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Titre de la notification"
                  maxLength={100}
                />
                <Textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  placeholder="Message..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={notifSending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendNotification}
              disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
            >
              {notifSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Reset data dialog */}
      <AlertDialog open={resetDataDialog} onOpenChange={setResetDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Remettre à zéro les données
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera toutes les dépenses, documents, abonnements détectés et statistiques d'utilisation de {u.full_name || u.email}. Les connexions email et bancaires seront conservées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetUserData}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la remise à zéro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
