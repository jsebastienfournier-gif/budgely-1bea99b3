import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Receipt, CreditCard, Mail, Brain, Users, TrendingDown, BarChart3, Shield } from "lucide-react";
import PricingSection from "@/components/PricingSection";
import ContactSection from "@/components/ContactSection";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const features = [
  { icon: Receipt, title: "Tickets de caisse", desc: "Photographiez vos tickets. L'IA extrait chaque produit, prix et quantité." },
  { icon: CreditCard, title: "Transactions bancaires", desc: "Connectez vos comptes pour importer automatiquement vos dépenses." },
  { icon: Mail, title: "Factures email", desc: "Détectez les achats en ligne depuis vos confirmations de commande." },
  { icon: Brain, title: "Moteur d'optimisation", desc: "Identifiez des alternatives moins chères pour vos achats récurrents." },
  { icon: Users, title: "Vue foyer", desc: "Agrégez les dépenses de tout le foyer pour une vision globale." },
  { icon: TrendingDown, title: "Réduction des coûts", desc: "Recevez des recommandations concrètes pour réduire vos dépenses." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">Budgely</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Connexion</Link>
            <Link
              to="/auth"
              className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Commencer gratuitement
            </Link>
          </div>
          <Link to="/auth" className="md:hidden text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savings/10 text-savings text-xs font-bold uppercase tracking-tight mb-6">
            <Shield className="h-3 w-3" />
            Analyse IA de vos dépenses
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05]"
          >
            Comprenez vos dépenses.{" "}
            <span className="text-primary">Améliorez votre budget.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Budgely analyse automatiquement vos dépenses provenant de relevés bancaires, 
            emails et tickets de caisse pour comprendre votre consommation et identifier 
            des opportunités d'économies.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-card text-foreground px-6 py-3 rounded-lg font-medium border border-border hover:bg-secondary transition-colors"
            >
              Voir la démo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "€240", label: "économies / mois en moyenne" },
              { value: "15k+", label: "utilisateurs actifs" },
              { value: "98%", label: "précision IA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Dashboard Preview */}
      <section className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border p-2 shadow-lg relative">
            <div className="absolute top-4 right-4 z-10 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-primary/20">
              Données de démonstration
            </div>
            <div className="bg-secondary/50 rounded-xl p-6 md:p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Dépenses du mois", value: "€3,240", change: "-8%" },
                  { label: "Foyer", value: "€5,120", change: "-5%" },
                  { label: "Économies détectées", value: "€186", change: "+12%" },
                  { label: "Score d'optimisation", value: "82/100", change: "" },
                ].map((card, i) => (
                  <div key={i} className="bg-card rounded-xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
                    <p className="text-xl md:text-2xl font-bold tabular-nums text-foreground mt-2">{card.value}</p>
                    {card.change && (
                      <span className={`text-xs font-medium ${card.change.startsWith('+') ? 'text-savings' : 'text-primary'}`}>
                        {card.change}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {["Alimentation €890", "Transport €420", "Loisirs €310"].map((cat, i) => (
                  <div key={i} className="bg-card rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium text-foreground">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Tout ce qu'il faut pour optimiser vos finances
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-shadow group"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-20 bg-card">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Comment ça marche</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Trois étapes simples</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Ajoutez vos dépenses", desc: "Banque, emails, tickets, factures ou dépenses en espèces — importez vos dépenses en quelques clics." },
              { step: "02", title: "L'IA analyse tout", desc: "Extraction automatique des produits, catégorisation et détection des tendances." },
              { step: "03", title: "Optimisez vos dépenses", desc: "Recevez des suggestions concrètes pour économiser sur vos achats récurrents." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-primary/10 mb-4">{s.step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Contact */}
      <ContactSection />

      {/* CTA */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-foreground text-background rounded-2xl p-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Prêt à reprendre le contrôle ?</h2>
          <p className="mt-4 text-background/70 text-lg">Commencez à analyser vos dépenses dès aujourd'hui.</p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 pt-12 pb-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Budgely</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link to="/mentions-legales" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Mentions légales
              </Link>
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Politique de confidentialité
              </Link>
              <Link to="/cgu" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                CGU
              </Link>
              <a href="#contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">© 2026 Budgely. Tous droits réservés.</p>
            <p className="text-xs text-muted-foreground">
              Fait avec soin en France 🇫🇷
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
