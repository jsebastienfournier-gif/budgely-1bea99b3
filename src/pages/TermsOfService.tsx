import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const TermsOfService = () => (
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
      <h1 className="text-3xl font-bold text-foreground mb-8">Conditions générales d'utilisation</h1>

      <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Objet</h2>
          <p>
            Les présentes conditions générales d'utilisation (CGU) ont pour objet de définir les modalités 
            d'accès et d'utilisation du service Budgely, accessible à l'adresse budgely.fr et via 
            l'application web associée.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Acceptation des CGU</h2>
          <p>
            L'inscription et l'utilisation du service impliquent l'acceptation pleine et entière des 
            présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Description du service</h2>
          <p>
            Budgely est un service d'analyse de dépenses personnelles qui permet de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Scanner et analyser des tickets de caisse via l'intelligence artificielle</li>
            <li>Importer et catégoriser des transactions bancaires</li>
            <li>Analyser des factures reçues par email</li>
            <li>Recevoir des suggestions d'optimisation budgétaire</li>
            <li>Suivre les dépenses d'un foyer</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Inscription</h2>
          <p>
            L'accès au service nécessite la création d'un compte avec une adresse email valide. 
            L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité 
            de ses identifiants. Toute activité réalisée depuis son compte est présumée effectuée par lui.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Formules et tarification</h2>
          <p>
            Budgely propose différentes formules d'abonnement (gratuite et payantes). Les tarifs en vigueur 
            sont affichés sur la page Tarifs du site. Les abonnements payants sont gérés par Stripe. 
            Les conditions de résiliation et de remboursement sont régies par les conditions de Stripe 
            et les dispositions légales applicables.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Utilisation du service</h2>
          <p>L'utilisateur s'engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Utiliser le service conformément à sa destination</li>
            <li>Ne pas tenter d'accéder de manière non autorisée aux systèmes</li>
            <li>Ne pas utiliser le service à des fins illégales ou frauduleuses</li>
            <li>Ne pas surcharger volontairement l'infrastructure du service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Intelligence artificielle</h2>
          <p>
            Le service utilise des modèles d'intelligence artificielle pour analyser les documents financiers. 
            Les résultats sont fournis à titre indicatif et peuvent contenir des erreurs. Budgely ne saurait 
            être tenu responsable de décisions financières prises sur la base de ces analyses. 
            <strong className="text-foreground"> Les analyses IA ne constituent en aucun cas un conseil financier professionnel.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Limitation de responsabilité</h2>
          <p>
            Budgely ne saurait être tenu responsable de toute perte de données, interruption de service, 
            ou dommage indirect lié à l'utilisation du service. Le service est fourni « en l'état » 
            sans garantie d'aucune sorte, dans les limites autorisées par la loi.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Suspension et résiliation</h2>
          <p>
            Budgely se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU, 
            d'utilisation abusive ou frauduleuse du service, ou sur demande des autorités compétentes. 
            L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de son compte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Droit applicable</h2>
          <p>
            Les présentes CGU sont régies par le droit français. Tout litige sera soumis à la compétence 
            exclusive des tribunaux français compétents, sous réserve des dispositions impératives 
            du Code de la consommation en matière de compétence juridictionnelle.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">11. Modification des CGU</h2>
          <p>
            Budgely se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs 
            seront informés de toute modification substantielle. La poursuite de l'utilisation du service 
            après modification vaut acceptation des nouvelles conditions.
          </p>
        </section>
      </div>

      <p className="text-xs text-muted-foreground mt-12">Dernière mise à jour : mars 2026</p>
    </motion.main>
  </div>
);

export default TermsOfService;
