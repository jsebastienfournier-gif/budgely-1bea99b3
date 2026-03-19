import { BarChart3, Wrench } from "lucide-react";

const Maintenance = ({ message }: { message?: string }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Wrench className="h-8 w-8 text-primary" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">Budgely</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Maintenance en cours</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {message || "L'application est temporairement indisponible pour maintenance. Nous revenons très bientôt."}
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
