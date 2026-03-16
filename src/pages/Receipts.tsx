import { motion } from "framer-motion";
import { Upload, Camera, FileText, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const receipts = [
  { id: 1, store: "Carrefour", date: "16 mars 2026", total: "€67.40", items: 12, status: "Analysé" },
  { id: 2, store: "Leclerc", date: "13 mars 2026", total: "€89.20", items: 18, status: "Analysé" },
  { id: 3, store: "Auchan", date: "10 mars 2026", total: "€45.60", items: 8, status: "Analysé" },
  { id: 4, store: "Lidl", date: "7 mars 2026", total: "€34.80", items: 10, status: "Analysé" },
  { id: 5, store: "Carrefour", date: "2 mars 2026", total: "€72.15", items: 14, status: "Analysé" },
];

const Receipts = () => {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tickets de caisse</h1>
            <p className="text-sm text-muted-foreground mt-1">Scannez et analysez vos tickets</p>
          </div>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 border-dashed border-border p-10 text-center mb-8 hover:border-primary/30 transition-colors cursor-pointer"
        >
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Glissez un ticket ici ou cliquez pour importer</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou PDF — max 10 Mo</p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Camera className="h-4 w-4" />
              Prendre une photo
            </button>
            <button className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
              <FileText className="h-4 w-4" />
              Importer un fichier
            </button>
          </div>
        </motion.div>

        {/* AI Extraction Steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Processus d'extraction IA</p>
          <div className="flex items-center gap-2">
            {["Lecture", "Extraction des articles", "Recherche d'alternatives"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                  <div className="h-5 w-5 rounded-full bg-savings/20 text-savings text-[10px] font-bold flex items-center justify-center">{i + 1}</div>
                  <span className="text-xs font-medium text-foreground">{step}</span>
                </div>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Receipt List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {receipts.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[auto_1fr_auto_auto_auto] gap-4 p-4 items-center hover:bg-secondary/50 transition-colors cursor-pointer">
                <div className="hidden md:flex h-10 w-10 rounded-xl bg-secondary items-center justify-center text-sm font-bold text-foreground">
                  {r.store[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.store}</p>
                  <p className="text-[10px] text-muted-foreground">{r.date} · {r.items} articles</p>
                </div>
                <span className="bg-savings/10 text-savings px-2 py-0.5 rounded text-[10px] font-bold uppercase">{r.status}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{r.total}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Receipts;
