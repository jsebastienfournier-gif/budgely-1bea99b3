// Client pour le backend Railway (Budgely API)
// Gère automatiquement l'auth : crée un compte miroir + login pour obtenir un JWT.
// Le mot de passe est dérivé de l'user.id Supabase (stable, jamais exposé à l'utilisateur).

import { supabase } from "@/integrations/supabase/client";

export const RAILWAY_BASE = "https://budgely-backend-production.up.railway.app";

const TOKEN_KEY = "railway_jwt";

const derivePassword = (userId: string) => {
  // Mot de passe déterministe propre à Railway, dérivé de l'id Supabase.
  // Suffisamment long et imprévisible côté tiers.
  return `bgly_${userId}_v1!`;
};

const TOKEN_USER_KEY = "railway_jwt_uid";

const setToken = (t: string, userId: string) => {
  localStorage.setItem(TOKEN_KEY, t);
  localStorage.setItem(TOKEN_USER_KEY, userId);
};
const getToken = (userId?: string) => {
  // Rejeter le token s'il appartient à un autre utilisateur
  if (userId) {
    const storedUid = localStorage.getItem(TOKEN_USER_KEY);
    if (storedUid && storedUid !== userId) {
      clearToken();
      return null;
    }
  }
  return localStorage.getItem(TOKEN_KEY);
};
const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_USER_KEY);
};

export const railwayLogout = () => clearToken();

const loginOrRegister = async (email: string, password: string, fullName?: string): Promise<string> => {
  // 1) Essayer login (form-encoded)
  const loginRes = await fetch(`${RAILWAY_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }).toString(),
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    return data.access_token as string;
  }

  // 2) Si échec → tenter register puis re-login
  const regRes = await fetch(`${RAILWAY_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName || email }),
  });

  if (regRes.ok) {
    const data = await regRes.json();
    if (data?.access_token) return data.access_token as string;
  }

  // 3) Re-login après register (au cas où register ne renverrait pas le token)
  const retry = await fetch(`${RAILWAY_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }).toString(),
  });
  if (!retry.ok) {
    const t = await retry.text();
    throw new Error(`Auth Railway échouée : ${retry.status} ${t.slice(0, 200)}`);
  }
  const data = await retry.json();
  return data.access_token as string;
};

const ensureToken = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Utilisateur non connecté");

  const cached = getToken(user.id);
  if (cached) return cached;

  const password = derivePassword(user.id);
  const token = await loginOrRegister(user.email, password, (user.user_metadata as any)?.full_name);
  setToken(token, user.id);
  return token;
};

export const getRailwayToken = ensureToken;

type RequestOpts = {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  query?: Record<string, string | number | undefined>;
};

export const railwayFetch = async <T = any>(path: string, opts: RequestOpts = {}): Promise<T> => {
  let token = await ensureToken();

  const buildUrl = () => {
    const url = new URL(`${RAILWAY_BASE}${path}`);
    if (opts.query) {
      Object.entries(opts.query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  };

  const doFetch = async (jwt: string) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${jwt}`,
    };
    let body: BodyInit | undefined;
    if (opts.body !== undefined) {
      if (opts.isFormData) {
        body = opts.body as FormData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
      }
    }
    return fetch(buildUrl(), {
      method: opts.method || "GET",
      headers,
      body,
    });
  };

  let res = await doFetch(token);

  // Si JWT invalide / expiré → on retente une fois après refresh
  if (res.status === 401) {
    clearToken();
    try {
      token = await ensureToken();
    } catch {
      // Re-login échoué → rediriger vers la page de connexion
      window.location.href = "/auth";
      throw new Error("Session Railway expirée, redirection vers la connexion.");
    }
    res = await doFetch(token);
  }

  const text = await res.text();
  let payload: any = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!res.ok) {
    const msg = (payload && typeof payload === "object" && (payload.detail || payload.error || payload.message))
      || (typeof payload === "string" ? payload : `Erreur ${res.status}`);
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return payload as T;
};
