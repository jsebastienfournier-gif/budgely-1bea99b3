import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumCTAProps {
  message: string;
}

const PremiumCTA = ({ message }: PremiumCTAProps) => (
  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
      <Sparkles className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
    <Link to="/subscription">
      <Button variant="outline" size="sm" className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
        Découvrir Premium
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </Link>
  </div>
);

export default PremiumCTA;
