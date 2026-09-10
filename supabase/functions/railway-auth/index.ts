// Émet un JWT Railway pour l'utilisateur connecté.
// Le mot de passe du compte miroir Railway est dérivé côté serveur via HMAC-SHA256
// avec un secret privé : il n'est jamais exposé au navigateur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const RAILWAY_BASE = "https://budgely-backend-production.up.railway.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toBase64Url = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const derivePassword = async (userId: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`railway:${userId}`));
  // Préfixe/suffixe pour satisfaire d'éventuelles règles de complexité côté Railway.
  return `Bg1!${toBase64Url(new Uint8Array(sig))}`;
};

const login = async (email: string, password: string): Promise<string | null> => {
  const res = await fetch(`${RAILWAY_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }).toString(),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.access_token ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("RAILWAY_PASSWORD_SECRET");
    if (!secret) return json({ error: "Configuration serveur incomplète" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Non authentifié" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user?.email) return json({ error: "Non authentifié" }, 401);

    const email = user.email.trim().toLowerCase();
    const password = await derivePassword(user.id, secret);

    // 1) Compte déjà provisionné avec le mot de passe fort
    let token = await login(email, password);

    // 2) Compte historique (ancienne dérivation) : on le migre vers le nouveau mot de passe
    if (!token) {
      const legacyPassword = `bgly_${user.id}_v1!`;
      const legacyToken = await login(email, legacyPassword);
      if (legacyToken) {
        const changed = await fetch(`${RAILWAY_BASE}/auth/change-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${legacyToken}` },
          body: JSON.stringify({ current_password: legacyPassword, new_password: password }),
        }).catch(() => null);
        if (!changed?.ok) {
          console.warn("[railway-auth] Migration du mot de passe impossible (endpoint indisponible)");
        }
        return json({ access_token: legacyToken });
      }
    }

    // 3) Création du compte miroir
    if (!token) {
      const regRes = await fetch(`${RAILWAY_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: (user.user_metadata as Record<string, unknown> | null)?.full_name ?? email,
        }),
      });
      if (regRes.ok) {
        const data = await regRes.json().catch(() => null);
        token = data?.access_token ?? (await login(email, password));
      } else {
        const body = await regRes.text();
        console.error(`[railway-auth] Register échoué [${regRes.status}]: ${body.slice(0, 300)}`);
        token = await login(email, password);
      }
    }

    if (!token) return json({ error: "Authentification Railway impossible" }, 502);

    return json({ access_token: token });
  } catch (e) {
    console.error("[railway-auth] Erreur:", e);
    return json({ error: "Erreur interne" }, 500);
  }
});
