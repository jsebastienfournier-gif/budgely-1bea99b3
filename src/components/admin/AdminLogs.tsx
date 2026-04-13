import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, Database, Shield, Zap, AlertTriangle, Info, XCircle } from "lucide-react";
import { invokeAuthenticatedFunction } from "@/lib/edge-functions";
import { toast } from "sonner";

type LogType = "postgres" | "auth" | "edge";

type LogEntry = {
  id: string;
  timestamp: string;
  event_message?: string;
  error_severity?: string;
  level?: string;
  status?: number;
  status_code?: number;
  path?: string;
  msg?: string;
  error?: string;
  method?: string;
  function_id?: string;
  execution_time_ms?: number;
  identifier?: string;
};

const LOG_TYPES: { value: LogType; label: string; icon: typeof Database }[] = [
  { value: "postgres", label: "Base de données", icon: Database },
  { value: "auth", label: "Authentification", icon: Shield },
  { value: "edge", label: "Edge Functions", icon: Zap },
];

const getSeverityStyle = (entry: LogEntry, logType: LogType) => {
  if (logType === "postgres") {
    const sev = entry.error_severity?.toUpperCase();
    if (sev === "ERROR" || sev === "FATAL" || sev === "PANIC")
      return { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle };
    if (sev === "WARNING") return { bg: "bg-amber-500/10", text: "text-amber-600", icon: AlertTriangle };
    return { bg: "bg-muted", text: "text-muted-foreground", icon: Info };
  }
  if (logType === "auth") {
    const lvl = entry.level?.toLowerCase();
    if (lvl === "error" || entry.error) return { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle };
    if (lvl === "warning") return { bg: "bg-amber-500/10", text: "text-amber-600", icon: AlertTriangle };
    return { bg: "bg-muted", text: "text-muted-foreground", icon: Info };
  }
  // edge
  const status = entry.status_code || 0;
  if (status >= 500) return { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle };
  if (status >= 400) return { bg: "bg-amber-500/10", text: "text-amber-600", icon: AlertTriangle };
  return { bg: "bg-muted", text: "text-muted-foreground", icon: Info };
};

const AdminLogs = () => {
  const [logType, setLogType] = useState<LogType>("postgres");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: logType, limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());

      const data = await invokeAuthenticatedFunction<{ logs: LogEntry[] }>(
        `admin-logs?${params.toString()}`
      );
      setLogs(data.logs || []);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [logType, search, limit]);

  useEffect(() => {
    fetchLogs();
  }, [logType, limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  const getMessage = (entry: LogEntry) => {
    if (logType === "edge") {
      return `${entry.method || "?"} ${entry.event_message || ""} → ${entry.status_code || "?"}${entry.execution_time_ms ? ` (${entry.execution_time_ms}ms)` : ""}`;
    }
    if (logType === "auth") {
      return entry.msg || entry.event_message || "-";
    }
    return entry.event_message || "-";
  };

  return (
    <div className="space-y-4">
      {/* Log type selector */}
      <div className="flex flex-wrap items-center gap-2">
        {LOG_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setLogType(t.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              logType === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & controls */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les logs..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </form>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
        >
          <option value={50}>50 lignes</option>
          <option value={100}>100 lignes</option>
          <option value={200}>200 lignes</option>
          <option value={500}>500 lignes</option>
        </select>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {/* Logs list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {LOG_TYPES.find((t) => t.value === logType)?.label}
          </h3>
          <span className="text-xs text-muted-foreground">{logs.length} entrées</span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Aucun log trouvé
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {logs.map((entry, i) => {
              const style = getSeverityStyle(entry, logType);
              const IconComp = style.icon;
              const key = entry.id || String(i);
              const isExpanded = expandedId === key;

              return (
                <div
                  key={key}
                  className="px-4 py-2.5 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : key)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <IconComp className={`h-3 w-3 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground truncate">
                        {getMessage(entry)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatTime(entry.timestamp)}
                        {entry.identifier && ` · ${entry.identifier}`}
                        {entry.error_severity && ` · ${entry.error_severity}`}
                        {entry.path && ` · ${entry.path}`}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <pre className="mt-2 ml-8 p-3 bg-muted rounded-lg text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(entry, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
