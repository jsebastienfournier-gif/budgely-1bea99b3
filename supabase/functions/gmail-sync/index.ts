import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "@/integrations/supabase/types";

/* ============================================================
   CONFIG
============================================================ */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGES = 100;

/* ============================================================
   CLASSIFICATION
============================================================ */

type FinancialEmailClass = "PAYMENT" | "NOTIFICATION" | "PROMOTION" | "UNKNOWN";

const PAYMENT_VERBS = ["paiement", "payé", "prélev", "debit", "facturé", "transaction", "total payé"];

const CREDIT_TERMS = ["crédité", "gain", "tirage", "récompense", "cashback"];

const PROMO_TERMS = ["offre", "promotion", "newsletter", "remportez"];

/* ============================================================
   UTILS
============================================================ */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9€.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBase64Url(data?: string): string {
  if (!data) return "";
  const padded = data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (data.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return "";
  }
}

function flattenParts(payload: any): any[] {
  if (!payload) return [];
  if (!payload.parts) return [payload];
  return payload.parts.flatMap((p: any) => (p.parts ? flattenParts(p) : p));
}

function extractAmount(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(€|eur)/gi)];

  const values = matches
    .map((m) => Number.parseFloat(m[1].replace(/\s/g, "").replace(",", ".")))
    .filter((v) => Number.isFinite(v) && v > 0);

  return values.length ? Math.max(...values) : null;
}

function extractDate(raw: string): string | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

/* ============================================================
   CLASSIFIER
============================================================ */

function classifyEmail(bodyNorm: string, amount: number | null): FinancialEmailClass {
  if (PROMO_TERMS.some((t) => bodyNorm.includes(t))) return "PROMOTION";
  if (CREDIT_TERMS.some((t) => bodyNorm.includes(t))) return "NOTIFICATION";

  const hasPaymentVerb = PAYMENT_VERBS.some((v) => bodyNorm.includes(v));

  if (amount !== null && amount > 0 && hasPaymentVerb) {
    return "PAYMENT";
  }

  return "UNKNOWN";
}

/* ============================================================
   HANDLER
============================================================ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient<Database>(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { email } = await req.json();
    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey);

    const { data: connectedEmail } = await supabaseAdmin
      .from("connected_emails")
      .select("id, last_sync_at")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!connectedEmail) throw new Error("Connected email not found");

    const { data: token } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!token) throw new Error("Gmail not connected");

    const afterTs = connectedEmail.last_sync_at
      ? Math.floor(new Date(connectedEmail.last_sync_at).getTime() / 1000)
      : null;

    let query = "newer_than:365d";
    if (afterTs) query += ` after:${afterTs}`;

    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${MAX_MESSAGES}`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );

    const listData = await listRes.json();
    const ids = listData.messages?.map((m: any) => m.id) ?? [];

    let payments = 0;
    let classified = {
      PAYMENT: 0,
      NOTIFICATION: 0,
      PROMOTION: 0,
      UNKNOWN: 0,
    };

    for (const id of ids) {
      const { data: exists } = await supabaseAdmin
        .from("expenses")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_id", `gmail_${id}`)
        .maybeSingle();
      if (exists) continue;

      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });

      const msg = await msgRes.json();
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const date = headers.find((h: any) => h.name === "Date")?.value || "";

      const parts = flattenParts(msg.payload);
      const body =
        decodeBase64Url(parts.find((p) => p.mimeType === "text/plain")?.body?.data) ||
        decodeBase64Url(parts.find((p) => p.mimeType === "text/html")?.body?.data);

      if (!body) continue;

      const bodyNorm = normalize(body);
      const amount = extractAmount(body);
      const classification = classifyEmail(bodyNorm, amount);

      classified[classification]++;

      if (classification !== "PAYMENT") continue;

      await supabaseAdmin.from("expenses").insert({
        user_id: user.id,
        source: "email",
        source_id: `gmail_${id}`,
        fournisseur: from,
        montant_total: amount,
        description: subject,
        date_expense: extractDate(date),
        devise: "EUR",
        type_document: "email_financier",
      });

      payments++;
    }

    await supabaseAdmin
      .from("connected_emails")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connectedEmail.id);

    return new Response(
      JSON.stringify({
        success: true,
        scanned: ids.length,
        payments,
        classified,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("gmail-sync error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
