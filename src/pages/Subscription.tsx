import AppLayout from "@/components/AppLayout";
import PricingSection from "@/components/PricingSection";

const Subscription = () => {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">Mon offre</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez votre abonnement et découvrez nos formules</p>
        </div>

        {/* Current plan indicator */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Plan actuel</p>
            <p className="text-lg font-bold text-foreground">Découverte <span className="text-sm font-normal text-muted-foreground">— Gratuit</span></p>
            <p className="text-xs text-muted-foreground mt-1">Scan de tickets, import PDF, 5 analyses mail/mois</p>
          </div>
        </div>

        <PricingSection />
      </div>
    </AppLayout>
  );
};

export default Subscription;
