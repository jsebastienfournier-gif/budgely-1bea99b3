import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">Budgely</span>
        </Link>
      </div>
    </nav>

    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-6 py-12"
    >
      <h1 className="text-3xl font-bold text-foreground mb-8">Politique de confidentialité & RGPD</h1>

      <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est :<br />
            <strong className="text-foreground">[Nom de la société]</strong><br />
            Email : contact@budgely.fr
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Données collectées</h2>
          <p>Dans le cadre de l'utilisation de Budgely, nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Données d'identification</strong> : nom, prénom, adresse email</li>
            <li><strong className="text-foreground">Données financières</strong> : tickets de caisse, factures, transactions bancaires importées volontairement par l'utilisateur</li>
            <li><strong className="text-foreground">Données de connexion</strong> : adresse IP, navigateur, date et heure de connexion</li>
            <li><strong className="text-foreground">Données d'usage</strong> : pages consultées, fonctionnalités utilisées</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Finalités du traitement</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fourniture et amélioration du service d'analyse de dépenses</li>
            <li>Analyse automatisée par intelligence artificielle des documents financiers</li>
            <li>Gestion des comptes utilisateurs et de l'authentification</li>
            <li>Communication relative au service (notifications, alertes)</li>
            <li>Statistiques d'utilisation anonymisées</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Base légale</h2>
          <p>
            Le traitement des données est fondé sur :<br />
            • <strong className="text-foreground">L'exécution du contrat</strong> : nécessaire à la fourniture du service<br />
            • <strong className="text-foreground">Le consentement</strong> : pour la connexion de comptes email et bancaires<br />
            • <strong className="text-foreground">L'intérêt légitime</strong> : pour l'amélioration du service et les statistiques
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Durée de conservation</h2>
          <p>
            Les données personnelles sont conservées pendant toute la durée de votre inscription au service, 
            puis supprimées dans un délai de 30 jours suivant la suppression de votre compte. 
            Les données de facturation sont conservées conformément aux obligations légales (10 ans).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Partage des données</h2>
          <p>
            Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Sous-traitants techniques</strong> : hébergement (Supabase/Lovable), traitement IA (modèles d'analyse)</li>
            <li><strong className="text-foreground">Prestataires de paiement</strong> : Stripe, pour la gestion des abonnements</li>
          </ul>
          <p>Tous nos sous-traitants sont soumis au RGPD ou à des garanties équivalentes.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
            <li><strong className="text-foreground">Droit de rectification</strong> : corriger vos données inexactes</li>
            <li><strong className="text-foreground">Droit à l'effacement</strong> : demander la suppression de vos données</li>
            <li><strong className="text-foreground">Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li><strong className="text-foreground">Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
            <li><strong className="text-foreground">Droit à la limitation</strong> : restreindre le traitement de vos données</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à : <strong className="text-foreground">contact@budgely.fr</strong>
          </p>
          <p>
            Vous pouvez également introduire une réclamation auprès de la CNIL : 
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> www.cnil.fr</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos 
            données : chiffrement en transit (TLS) et au repos, authentification sécurisée, 
            accès restreint aux données, sauvegardes régulières.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Transferts hors UE</h2>
          <p>
            Les données sont principalement hébergées dans l'Union européenne. En cas de transfert vers des 
            pays tiers, des garanties appropriées sont mises en place (clauses contractuelles types, 
            décisions d'adéquation).
          </p>
        </section>
      </div>

      <p className="text-xs text-muted-foreground mt-12">Dernière mise à jour : mars 2026</p>
    </motion.main>
  </div>
);

export default PrivacyPolicy;
