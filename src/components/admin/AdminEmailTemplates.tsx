import { useState, useEffect } from "react";
import { Mail, Loader2, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type TemplatePreview = {
  templateName: string;
  displayName: string;
  subject: string;
  html: string;
  status: "ready" | "preview_data_required" | "render_failed";
  errorMessage?: string;
};

const AdminEmailTemplates = () => {
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "preview-transactional-email"
      );
      if (fnError) throw fnError;
      setTemplates(data?.templates || []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const statusBadge = (status: TemplatePreview["status"]) => {
    switch (status) {
      case "ready":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Prêt</Badge>;
      case "preview_data_required":
        return <Badge variant="secondary">Données requises</Badge>;
      case "render_failed":
        return <Badge variant="destructive">Erreur</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Templates d'emails
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadTemplates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucun template configuré.</p>
          ) : (
            <div className="divide-y divide-border">
              {templates.map((t) => (
                <div key={t.templateName} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.displayName || t.templateName}
                    </p>
                    {t.subject && (
                      <p className="text-xs text-muted-foreground truncate">
                        Objet : {t.subject}
                      </p>
                    )}
                    {t.errorMessage && (
                      <p className="text-xs text-destructive truncate mt-0.5">{t.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusBadge(t.status)}
                    {t.status === "ready" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreviewHtml(t.html);
                          setPreviewName(t.displayName || t.templateName);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border border-border bg-white">
            <iframe
              srcDoc={previewHtml || ""}
              className="w-full min-h-[400px] h-full border-0"
              sandbox="allow-same-origin"
              title="Aperçu email"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminEmailTemplates;
