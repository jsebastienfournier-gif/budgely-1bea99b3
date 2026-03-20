import { useState, useEffect } from "react";
import { Shield, UserCog, Loader2, Crown, Wrench, BarChart3, MessageSquare, Eye, Ban, Bell } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import ContactMessages from "@/components/admin/ContactMessages";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import AdminNotifications from "@/components/admin/AdminNotifications";

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
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-destructive/10 text-destructive" },
  moderator: { label: "Modérateur", color: "bg-amber-500/10 text-amber-600" },
  user: { label: "Utilisateur", color: "bg-primary/10 text-primary" },
};

const Admin = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { maintenance, toggleMaintenance } = useMaintenanceMode();
  const [maintenanceMsg, setMaintenanceMsg] = useState("");

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await callAdmin({ action: "list_users" });
      setUsers(data.users);
      setIsAdmin(true);
    } catch (err: any) {
      if (err.message?.includes("Forbidden") || err.message?.includes("admin")) {
        setIsAdmin(false);
      } else {
        toast.error("Erreur lors du chargement des utilisateurs");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  useEffect(() => {
    setMaintenanceMsg(maintenance.message);
  }, [maintenance.message]);

  const handleToggleMaintenance = async () => {
    const newEnabled = !maintenance.enabled;
    const { error } = await toggleMaintenance(newEnabled, maintenanceMsg);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(newEnabled ? "Mode maintenance activé" : "Mode maintenance désactivé");
    }
  };

  const openUserDetail = (u: AdminUser) => {
    setSelectedUser(u);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (isAdmin === false) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Accès refusé</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Vous n'avez pas les droits d'administration. Contactez un administrateur pour obtenir l'accès.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les utilisateurs et leurs rôles
          </p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytiques
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <UserCog className="h-3.5 w-3.5" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Utilisateurs", value: users.length, icon: UserCog },
                { label: "Admins", value: users.filter((u) => u.roles.includes("admin")).length, icon: Crown },
                { label: "Modérateurs", value: users.filter((u) => u.roles.includes("moderator")).length, icon: Shield },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Liste des utilisateurs</h2>
              </div>
              <div className="divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <div
                      key={u.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => openUserDetail(u)}
                    >
                      <div className="h-10 w-10 rounded-xl bg-secondary flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">
                            {(u.full_name || u.email || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.full_name || "Sans nom"}
                          {isSelf && <span className="text-xs text-muted-foreground ml-2">(vous)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        {u.banned && (
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
                            <Ban className="h-2.5 w-2.5" /> Suspendu
                          </span>
                        )}
                        {u.roles.length === 0 && !u.banned && (
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                            Aucun rôle
                          </span>
                        )}
                        {u.roles.map((r) => {
                          const style = ROLE_LABELS[r] || { label: r, color: "bg-secondary text-foreground" };
                          return (
                            <span key={r} className={`text-[10px] font-medium px-2 py-1 rounded-full ${style.color}`}>
                              {style.label}
                            </span>
                          );
                        })}
                      </div>
                      <p className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("fr-FR")}
                      </p>
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <div className={`bg-card border rounded-xl p-5 ${maintenance.enabled ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${maintenance.enabled ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <Wrench className={`h-4 w-4 ${maintenance.enabled ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Mode maintenance</h3>
                    <p className="text-xs text-muted-foreground">
                      {maintenance.enabled ? "L'application est actuellement bloquée" : "L'application est accessible à tous"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleMaintenance}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    maintenance.enabled
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  }`}
                >
                  {maintenance.enabled ? "Désactiver" : "Activer"}
                </button>
              </div>
              <input
                type="text"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                onBlur={() => {
                  if (maintenanceMsg !== maintenance.message) {
                    toggleMaintenance(maintenance.enabled, maintenanceMsg);
                  }
                }}
                placeholder="Message affiché aux utilisateurs..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <ContactMessages />
          </TabsContent>
        </Tabs>
      </div>

      <AdminUserDetail
        user={selectedUser}
        currentUserId={user?.id}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefresh={loadUsers}
      />
    </AppLayout>
  );
};

export default Admin;
