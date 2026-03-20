import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const LegalNotice = () => (
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
      <h1 className="text-3xl font-bold text-foreground mb-8">Mentions légales</h1>

      <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
          <p>
            Le site Budgely est édité par :<br />
            <strong className="text-foreground">[Nom de la société / de l'éditeur]</strong><br />
            [Forme juridique] au capital de [montant] €<br />
            Siège social : [Adresse complète]<br />
            RCS : [Numéro RCS]<br />
            SIRET : [Numéro SIRET]<br />
            Numéro de TVA : [Numéro TVA]<br />
            Directeur de la publication : [Nom du directeur]<br />
            Email : contact@budgely.fr
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
          <p>
            Le site est hébergé par :<br />
            <strong className="text-foreground">Lovable / Supabase</strong><br />
            Les données sont stockées dans l'Union européenne conformément au RGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Propriété intellectuelle</h2>
          <p>
            L'ensemble des contenus présents sur le site Budgely (textes, images, logos, graphismes, icônes, logiciels) 
            est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction, représentation, 
            modification ou exploitation non autorisée de tout ou partie de ces contenus est strictement interdite.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Responsabilité</h2>
          <p>
            Budgely s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. 
            Toutefois, Budgely ne saurait garantir l'exactitude, la complétude ou l'actualité des informations 
            mises à disposition. Les analyses et suggestions fournies par l'IA sont données à titre indicatif 
            et ne constituent en aucun cas un conseil financier professionnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, 
            préférences de session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
          </p>
        </section>
      </div>

      <p className="text-xs text-muted-foreground mt-12">Dernière mise à jour : mars 2026</p>
    </motion.main>
  </div>
);

export default LegalNotice;
