import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===================== CORS =====================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

// ===================== FILTERS =====================
const JUNK_KEYWORDS =
  /(newsletter|offre|profitez|cadeau|parrainage|avis|panier|expédition|suivi|tracking|bon plan|réduction|promo)/i;

const EXPENSE_SIGNALS =
  /(facture|reçu|receipt|invoice|commande|order|paiement|payment|prélèvement|débit|confirmation|échéance|abonnement)/i;

// ===================== HELPERS =====================
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanEmailBody(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>|<\/div>|<\/tr>|<td>|<\/td>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/gi, "€")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrencyAmount(raw: string): number | null {
  if (!raw) return null;

  let normalized = raw.replace(/[\s\u00a0\u202f]/g, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

// ===================== MERCHANT =====================
async function identifyMerchant(from: string, supabaseAdmin: any): Promise<string | null> {
  const fromLower = from.toLowerCase();

  if (fromLower.includes("amazon")) return "Amazon";
  if (fromLower.includes("uber")) return fromLower.includes("eats") ? "Uber Eats" : "Uber";
  if (fromLower.includes("netflix")) return "Netflix";
  if (fromLower.includes("spotify")) return "Spotify";
  if (fromLower.includes("sncf")) return "SNCF";

  const domainMatch = fromLower.match(/@([\w.-]+)\./);
  const domain = domainMatch ? domainMatch[1] : null;

  if (domain) {
    const { data } = await supabaseAdmin
      .from("merchant_profiles")
      .select("normalized_name")
      .contains("patterns", [domain])
      .maybeSingle();

    if (data) return data.normalized_name;
  }

  const displayMatch = from.match(/^"?(.*?)"?\s*</);
  if (displayMatch?.[1]?.length > 2) return displayMatch[1].trim();

  if (domain) {
    return domain
      .split(/[-.]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return null;
}

// ===================== AMOUNT =====================
function universalAmountExtractor(text: string): number | null {
  const anchors = ["total", "total ttc", "montant", "net à payer", "amount", "due"];

  for (const anchor of anchors) {
    const regex = new RegExp(`${anchor}[^\\d€]{0,60}(\\d{1,3}(?:[ .]\\d{3})*[.,]\\d{2})\\s*(€|eur)`, "i");
    const match = text.match(regex);
    if (match) {
      const val = parseCurrencyAmount(match[1]);
      if (val && val < 5000) return val;
    }
  }

  const all = [...text.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(€|eur)/gi)]
    .map((m) => parseCurrencyAmount(m[1]))
    .filter((v): v is number => v !== null && v < 5000);

  return all.length ? Math.max(...all) : null;
}

function getExpenseScore(subject: string, body: string): number {
  let score = 0;
  const text = `${subject} ${body}`.toLowerCase();
  if (EXPENSE_SIGNALS.test(text)) score += 3;
  if (/[0-9][.,][0-9]{2}\s*(€|eur)/i.test(text)) score += 2;
  if (JUNK_KEYWORDS.test(text)) score -= 4;
  return score;
}

// ===================== GMAIL =====================
function decodeBase64Url(data: string): string {
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

// ===================== HANDLER =====================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header manquant");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const { email } = await req.json();
    console.log("Gmail sync start", { userId: user.id, email });

    const { data: tokenData } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!tokenData?.access_token) throw new Error("Gmail non connecté");

    const query = `(total OR montant OR invoice) (EUR OR €) newer_than:30d -newsletter`;
    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    if (!listRes.ok) {
      console.error("Gmail list error", await listRes.text());
      throw new Error("Erreur Gmail");
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    const results = [];

    for (const { id } of messages) {
      const { data: exists } = await supabaseAdmin
        .from("expenses")
        .select("id")
        .eq("source_id", `gmail_${id}`)
        .maybeSingle();

      if (exists) continue;

      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!msgRes.ok) continue;

      const msg = await msgRes.json();
      const headers = msg.payload.headers || [];

      const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const dateRaw = headers.find((h: any) => h.name === "Date")?.value || "";

      const parts = flattenParts(msg.payload);
      const html = parts.find((p) => p.mimeType === "text/html");
      const text = parts.find((p) => p.mimeType === "text/plain");

      let body = "";
      if (html?.body?.data) body = cleanEmailBody(decodeBase64Url(html.body.data));
      else if (text?.body?.data) body = normalizeText(decodeBase64Url(text.body.data));

      const score = getExpenseScore(subject, body);
      if (score < 3) continue;

      const merchant = await identifyMerchant(from, supabaseAdmin);
      const amount = universalAmountExtractor(body);

      const dateIso = isNaN(Date.parse(dateRaw))
        ? new Date().toISOString().split("T")[0]
        : new Date(dateRaw).toISOString().split("T")[0];

      if (merchant && amount) {
        await supabaseAdmin.from("expenses").insert({
          user_id: user.id,
          source: "email",
          source_id: `gmail_${id}`,
          fournisseur: merchant,
          montant_total: amount,
          devise: "EUR",
          date_expense: dateIso,
          description: subject,
        });

        results.push({ id, merchant, amount });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gmail-callback error", e);
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
