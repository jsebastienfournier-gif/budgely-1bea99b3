import { motion } from "framer-motion";
import { User, Bell, CreditCard, Users, Shield, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const Settings = () => {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
        </div>

        <div className="space-y-4">
          {[
            { icon: User, title: "Profil", desc: "Nom, email et photo de profil" },
            { icon: Users, title: "Foyer", desc: "Gérez les membres de votre foyer" },
            { icon: CreditCard, title: "Comptes bancaires", desc: "Connectez et gérez vos comptes" },
            { icon: Bell, title: "Notifications", desc: "Alertes et rappels de dépenses" },
            { icon: Shield, title: "Sécurité", desc: "Mot de passe et authentification" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
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
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
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
