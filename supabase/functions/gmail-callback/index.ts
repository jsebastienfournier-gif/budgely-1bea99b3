import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- CONFIGURATION DES FILTRES ---
const JUNK_KEYWORDS =
  /(newsletter|offre|profitez|cadeau|parrainage|avis|votre panier|expédition|suivi|tracking|votre avis|bon plan|réduction|promo)/i;
const EXPENSE_SIGNALS =
  /(facture|reçu|receipt|invoice|commande|order|paiement|payment|prélèvement|débit|confirmation|échéance|abonnement)/i;

// --- UTILITAIRES DE NETTOYAGE ---

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Nettoie le HTML pour garder la proximité entre les mots et les prix
 */
function cleanEmailBody(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/p>|<\/div>|<\/tr>|<td>|<\/td>/gi, " ") // Remplace les balises de bloc par des espaces
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
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

// --- LOGIQUE D'IDENTIFICATION ---

/**
 * Identifie le marchand de manière dynamique (Premium -> DB -> Email Display Name -> Domaine)
 */
async function identifyMerchant(from: string, supabaseAdmin: any): Promise<string | null> {
  const fromLower = from.toLowerCase();

  // 1. Marchands "Premium" (Précision 100%)
  if (fromLower.includes("amazon")) return "Amazon";
  if (fromLower.includes("uber")) return fromLower.includes("eats") ? "Uber Eats" : "Uber";
  if (fromLower.includes("bouygues")) return "Bouygues Telecom";
  if (fromLower.includes("netflix")) return "Netflix";
  if (fromLower.includes("spotify")) return "Spotify";
  if (fromLower.includes("apple")) return "Apple";
  if (fromLower.includes("sncf")) return "SNCF";

  // 2. Extraire le domaine pour chercher dans l'historique d'apprentissage
  const domainMatch = fromLower.match(/@([\w.-]+)\./);
  const domain = domainMatch ? domainMatch[1] : null;

  if (domain && domain.length > 2) {
    const { data: profile } = await supabaseAdmin
      .from("merchant_profiles")
      .select("normalized_name")
      .contains("patterns", [domain])
      .maybeSingle();
    if (profile) return profile.normalized_name;
  }

  // 3. Extraire le nom d'affichage de l'email (ex: "Boulangerie Paul" <contact@paul.fr>)
  const displayNameMatch = from.match(/^"?(.*?)"?\s*<.*>/);
  if (displayNameMatch && displayNameMatch[1]) {
    const name = displayNameMatch[1].trim();
    const genericTerms = /^(service client|facture|noreply|no-reply|contact|support|info|votre facture)$/i;
    if (!genericTerms.test(name) && name.length > 2) return name;
  }

  // 4. Fallback sur le domaine
  if (domain && domain.length > 2) {
    return domain
      .split(/[-.]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return null;
}

/**
 * EXTRACTEUR UNIVERSEL : Cherche un montant à proximité d'une "Ancre"
 */
function universalAmountExtractor(text: string): number | null {
  const normalized = text.toLowerCase();
  const anchors = [
    "total ttc",
    "total",
    "montant",
    "net à payer",
    "somme",
    "combien",
    "total à payer",
    "total a payer",
    "amount",
    "total amount",
    "due",
    "payer",
    "payé",
  ];

  for (const anchor of anchors) {
    // Fenêtre de 60 caractères après l'ancre pour trouver un prix
    const regex = new RegExp(`${anchor}[^0-9€]{0,60}(\\d{1,3}(?:[ .\\s]\\d{3})*[.,]\\d{2})\\s*(?:€|eur)`, "i");
    const match = normalized.match(regex);
    if (match) {
      const val = parseCurrencyAmount(match[1]);
      if (val && val < 5000) return val;
    }
  }

  // Fallback : prendre le montant le plus élevé (souvent le TTC)
  const allAmounts = Array.from(normalized.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(?:€|eur)/g))
    .map((m) => parseCurrencyAmount(m[1]))
    .filter((v): v is number => v !== null && v < 5000);

  return allAmounts.length > 0 ? Math.max(...allAmounts) : null;
}

function getExpenseScore(subject: string, body: string): number {
  let score = 0;
  const text = (subject + " " + body).toLowerCase();
  if (EXPENSE_SIGNALS.test(text)) score += 3;
  if (/[0-9][.,][0-9]{2}\s*(€|eur)/i.test(text)) score += 2;
  if (JUNK_KEYWORDS.test(text)) score -= 4;
  return score;
}

// --- GMAIL HELPERS ---

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return "";
  }
}

function flattenParts(payload: any): any[] {
  const parts: any[] = [];
  if (payload?.parts) {
    for (const part of payload.parts) {
      if (part.parts) parts.push(...flattenParts(part));
      else parts.push(part);
    }
  }
  return parts;
}

// ===================== MAIN HANDLER =====================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error("Non autorisé");

    const { email } = await req.json();

    // 1. RÉCUPÉRATION TOKENS & GMAIL (Simplifié pour l'exemple)
    const { data: tokenData } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!tokenData) throw new Error("Gmail non connecté");

    // Appel API Gmail (Note: Assure-toi que searchFinancialEmails est bien défini ou utilise cette logique)
    const accessToken = tokenData.access_token;
    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q="total" ("€" OR "eur") newer_than:30d -newsletter&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listData = await listRes.json();
    const messageIds = (listData.messages || []).map((m: any) => m.id);

    const results = [];

    for (const messageId of messageIds) {
      // Vérifier si déjà traité
      const { data: existing } = await supabaseAdmin
        .from("expenses")
        .select("id")
        .eq("source_id", `gmail_${messageId}`)
        .maybeSingle();
      if (existing) continue;

      // Fetch message detail
      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const msgData = await msgRes.json();

      const headers = msgData.payload.headers;
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const dateRaw = headers.find((h: any) => h.name === "Date")?.value || "";

      let body = "";
      const parts = flattenParts(msgData.payload);
      const htmlPart = parts.find((p) => p.mimeType === "text/html");
      const textPart = parts.find((p) => p.mimeType === "text/plain");

      if (htmlPart) body = cleanEmailBody(decodeBase64Url(htmlPart.body.data));
      else if (textPart) body = normalizeText(decodeBase64Url(textPart.body.data));

      // 2. LOGIQUE DE DÉCISION
      const score = getExpenseScore(subject, body);
      if (score < 3) continue;

      const merchant = await identifyMerchant(from, supabaseAdmin);
      const amount = universalAmountExtractor(body);

      if (merchant && amount) {
        // SUCCÈS SANS IA
        await supabaseAdmin.from("expenses").insert({
          user_id: user.id,
          source: "email",
          source_id: `gmail_${messageId}`,
          fournisseur: merchant,
          montant_total: amount,
          date_expense: new Date(dateRaw).toISOString().split("T")[0],
          devise: "EUR",
          description: subject,
        });
        results.push({ id: messageId, merchant, amount, source: "rules" });
      } else if (score >= 5) {
        // FALLBACK IA (Seulement pour les cas complexes avec gros signal)
        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
          method: "POST",
          headers: { Authorization: authHeader!, "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "email",
            raw_text: `De: ${from}\nSujet: ${subject}\n\n${body}`,
            source_id: `gmail_${messageId}`,
            skip_usage_check: true,
          }),
        });
        if (analyzeRes.ok) results.push({ id: messageId, source: "ai" });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
