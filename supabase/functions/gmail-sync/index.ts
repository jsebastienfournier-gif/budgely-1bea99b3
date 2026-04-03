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
   TYPES
============================================================ */

type FinancialEmailClass = "PAYMENT" | "NOTIFICATION" | "PROMOTION" | "UNKNOWN";

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  payload?: {
    headers?: GmailMessageHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}

interface GmailListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
  error?: { code: number; message: string };
}

interface GmailToken {
  access_token: string;
  refresh_token: string;
  expires_at?: string;
  email: string;
  user_id: string;
}

interface ExpenseInsert {
  user_id: string;
  source: string;
  source_id: string;
  fournisseur: string;
  montant_total: number | null;
  description: string;
  date_expense: string | null;
  devise: string;
  type_document: string;
}

/* ============================================================
   CLASSIFICATION TERMS
============================================================ */

// Order matters: more specific terms first to reduce false positives
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

function flattenParts(payload?: GmailMessagePart): GmailMessagePart[] {
  if (!payload) return [];
  if (!payload.parts) return [payload];
  return payload.parts.flatMap((p) => (p.parts ? flattenParts(p) : [p]));
}

/**
 * Strip HTML tags before extracting amounts to avoid regex missing
 * values buried inside markup like <span>42,00</span>€
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(text: string): number | null {
  const plain = stripHtml(text);
  const matches = [...plain.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(€|eur)/gi)];

  const values = matches
    .map((m) => Number.parseFloat(m[1].replace(/\s/g, "").replace(",", ".")))
    .filter((v) => Number.isFinite(v) && v > 0);

  return values.length ? Math.max(...values) : null;
}

function extractDate(raw: string): string | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

/**
 * Extract a clean supplier name from a raw "From" header.
 * e.g. "Stripe <noreply@stripe.com>" → "Stripe"
 *      "noreply@stripe.com"          → "stripe.com"
 */
function extractSupplier(from: string): string {
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) return nameMatch[1].trim();

  const emailMatch = from.match(/@([\w.-]+)/);
  if (emailMatch) return emailMatch[1];

  return from.trim();
}

/* ============================================================
   CLASSIFIER
============================================================ */

function classifyEmail(bodyNorm: string, amount: number | null): FinancialEmailClass {
  // Check payment first — a payment email may incidentally contain promo/credit words
  const hasPaymentVerb = PAYMENT_VERBS.some((v) => bodyNorm.includes(v));
  if (amount !== null && amount > 0 && hasPaymentVerb) return "PAYMENT";

  if (CREDIT_TERMS.some((t) => bodyNorm.includes(t))) return "NOTIFICATION";
  if (PROMO_TERMS.some((t) => bodyNorm.includes(t))) return "PROMOTION";

  return "UNKNOWN";
}

/* ============================================================
   GMAIL TOKEN REFRESH
============================================================ */

async function refreshAccessTokenIfNeeded(
  token: GmailToken,
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
): Promise<string> {
  // If no expiry info, assume token is still valid
  if (!token.expires_at) return token.access_token;

  const expiresAt = new Date(token.expires_at).getTime();
  const nowWithBuffer = Date.now() + 60_000; // refresh 1 minute before expiry

  if (expiresAt > nowWithBuffer) return token.access_token;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to refresh Gmail token: ${err}`);
  }

  const refreshed = await res.json();
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("gmail_tokens")
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
    })
    .eq("user_id", token.user_id)
    .eq("email", token.email);

  return refreshed.access_token;
}

/* ============================================================
   GMAIL HELPERS
============================================================ */

async function fetchGmailMessageIds(accessToken: string, query: string): Promise<string[]> {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${MAX_MESSAGES}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Gmail list error: ${res.status} ${await res.text()}`);

  const data: GmailListResponse = await res.json();

  if (data.error) throw new Error(`Gmail API error: ${data.error.message}`);

  return data.messages?.map((m) => m.id) ?? [];
}

async function fetchGmailMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
  const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404) return null; // Message deleted between list and fetch
  if (!res.ok) throw new Error(`Gmail fetch error for ${id}: ${res.status} ${await res.text()}`);

  return res.json();
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

    // ── Fetch connected email ──────────────────────────────────────────────
    const { data: connectedEmail } = await supabaseAdmin
      .from("connected_emails")
      .select("id, last_sync_at")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!connectedEmail) throw new Error("Connected email not found");

    // ── Fetch & refresh Gmail token ───────────────────────────────────────
    const { data: token } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!token) throw new Error("Gmail not connected");

    const accessToken = await refreshAccessTokenIfNeeded(token as GmailToken, supabaseAdmin);

    // ── Build Gmail query ─────────────────────────────────────────────────
    const afterTs = connectedEmail.last_sync_at
      ? Math.floor(new Date(connectedEmail.last_sync_at).getTime() / 1000)
      : null;

    let query = "newer_than:365d";
    if (afterTs) query += ` after:${afterTs}`;

    // ── Fetch message IDs ─────────────────────────────────────────────────
    const ids = await fetchGmailMessageIds(accessToken, query);

    // ── Pre-fetch already-synced source_ids in one query (avoids N+1) ─────
    const candidateSourceIds = ids.map((id) => `gmail_${id}`);

    const { data: existingRows } = await supabaseAdmin
      .from("expenses")
      .select("source_id")
      .eq("user_id", user.id)
      .in("source_id", candidateSourceIds);

    const alreadySynced = new Set((existingRows ?? []).map((r) => r.source_id));

    // ── Process emails ────────────────────────────────────────────────────
    const expensesToInsert: ExpenseInsert[] = [];

    const classified: Record<FinancialEmailClass, number> = {
      PAYMENT: 0,
      NOTIFICATION: 0,
      PROMOTION: 0,
      UNKNOWN: 0,
    };

    for (const id of ids) {
      if (alreadySynced.has(`gmail_${id}`)) continue;

      const msg = await fetchGmailMessage(accessToken, id);
      if (!msg) continue;

      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const date = headers.find((h) => h.name === "Date")?.value ?? "";

      const parts = flattenParts(msg.payload as GmailMessagePart);
      const body =
        decodeBase64Url(parts.find((p) => p.mimeType === "text/plain")?.body?.data) ||
        decodeBase64Url(parts.find((p) => p.mimeType === "text/html")?.body?.data);

      if (!body) continue;

      const bodyNorm = normalize(body);
      const amount = extractAmount(body); // stripHtml applied inside
      const classification = classifyEmail(bodyNorm, amount);

      classified[classification]++;

      if (classification !== "PAYMENT") continue;

      expensesToInsert.push({
        user_id: user.id,
        source: "email",
        source_id: `gmail_${id}`,
        fournisseur: extractSupplier(from),
        montant_total: amount,
        description: subject,
        date_expense: extractDate(date),
        devise: "EUR",
        type_document: "email_financier",
      });
    }

    // ── Batch insert (single round-trip) ──────────────────────────────────
    if (expensesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("expenses").insert(expensesToInsert);

      if (insertError) throw new Error(`Failed to insert expenses: ${insertError.message}`);
    }

    // ── Update last_sync_at only after full success ───────────────────────
    await supabaseAdmin
      .from("connected_emails")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connectedEmail.id);

    return new Response(
      JSON.stringify({
        success: true,
        scanned: ids.length,
        payments: expensesToInsert.length,
        classified,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("gmail-sync error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
