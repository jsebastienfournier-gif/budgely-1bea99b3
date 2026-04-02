import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSITIVE_TRANSACTION_PATTERN = /(facture|invoice|re[çc]u|receipt|commande|order|paiement|payment|pr[ée]l[èe]vement|prelevement|d[ée]bit|debit|abonnement|subscription|[ée]ch[ée]ance|echeance|montant|total|ttc|achat|purchase|renewal|renouvellement)/i;
const MARKETING_OR_PROMO_PATTERN = /(tirage au sort|gagnez|remportez|offre|promo(?:tion)?|newsletter|parrainage|campagne|marketing|vente flash|code promo|bon plan|r[ée]duction|reduction)/i;
const NON_EXPENSE_FINANCIAL_PATTERN = /(souscription au projet|investissement|investir|rendement|porte[- ]?monnaie|wallet|avis d['’]ex[ée]cution|dividende|crowdfunding|p2p|remboursement mensuel|alimentation de votre porte[- ]?monnaie|gain|cashback)/i;
const REFUND_ONLY_PATTERN = /(remboursement|refund|cr[ée]dit[ée]?|credited)/i;
const POSITIVE_EXPENSE_PROOF = /(facture|invoice|re[çc]u|receipt|commande|order|paiement|payment|pr[ée]l[èe]vement|prelevement|d[ée]bit|debit|total(?:\s*ttc)?|montant(?:\s+d[ûu]|\s+pay[ée]|\s+de)?|[ée]ch[ée]ance|echeance|achat|purchase)/i;
const HARD_TRANSACTION_PROOF = /(n[°º]\s*de\s*commande|num[eé]ro\s*de\s*commande|order\s*#|num[eé]ro\s*de\s*facture|facture\s*n[°º]|confirmation\s*de\s*paiement|paiement\s*(confirm[ée]|effectu[ée])|re[çc]u\s*de\s*paiement|merci\s+pour\s+votre\s+achat|total(?:\s*ttc)?\s*[:=]|montant(?:\s+pay[ée]|\s+d[ûu]|\s+de)\s*[:=]?|pr[ée]l[èe]vement\s*[:=]?|d[ée]bit(?:[ée])?\s*[:=]?)/i;
const SHIPPING_ONLY_PATTERN = /(exp[ée]di[ée]|shipped|livraison|delivery|suivi|tracking)/i;
const AMAZON_PATTERN = /(amazon(?:\.fr)?)/i;
const BOUYGUES_PATTERN = /(bouygues telecom|bouygues t[ée]l[ée]com|bouyguestelecom|b&you|bouygues)/i;
const UNKNOWN_RESULT_PATTERN = /\b(inconnu|unknown|aucun article|no item|n\/a)\b/i;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrencyAmount(raw: string): number | null {
  let normalized = raw.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!normalized) return null;

  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  normalized = normalized.replace(/[^\d.]/g, "");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function extractAmount(text: string, patterns: RegExp[] = []): number | null {
  const normalized = text.replace(/\u00a0/g, " ").replace(/\u202f/g, " ");

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const amount = parseCurrencyAmount(match?.[1] ?? "");
    if (amount !== null) return amount;
  }

  const suffixMatches = Array.from(
    normalized.matchAll(/(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/gi),
  );
  const prefixMatches = Array.from(
    normalized.matchAll(/(?:€)\s*(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi),
  );

  const amounts = [...suffixMatches, ...prefixMatches]
    .map((match) => parseCurrencyAmount(match[1] ?? ""))
    .filter((value): value is number => value !== null);

  if (amounts.length === 0) return null;
  return Math.max(...amounts);
}

function extractEmailDate(rawText: string): string | null {
  const dateMatch = rawText.match(/Date:\s*(.+)/);
  if (!dateMatch) return null;

  try {
    const date = new Date(dateMatch[1].trim());
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function hasExpenseIntent(text: string): boolean {
  return POSITIVE_TRANSACTION_PATTERN.test(text) || HARD_TRANSACTION_PROOF.test(text);
}

function isBlockedFinancialNoise(text: string): boolean {
  if (MARKETING_OR_PROMO_PATTERN.test(text)) return true;
  if (NON_EXPENSE_FINANCIAL_PATTERN.test(text) && !POSITIVE_EXPENSE_PROOF.test(text)) return true;
  if (REFUND_ONLY_PATTERN.test(text) && !/(carte|d[ée]bit|debit|paiement|payment|facture|invoice|commande|order|achat|purchase|pr[ée]l[èe]vement|prelevement)/i.test(text)) {
    return true;
  }
  return false;
}

function isBlockedLearnedProfile(learned: any, text: string): boolean {
  const learnedText = normalizeText(`${learned?.merchant ?? ""} ${learned?.normalized_name ?? ""} ${learned?.category ?? ""}`);
  if (/investissement|épargne/.test(learnedText) && !POSITIVE_EXPENSE_PROOF.test(text)) return true;
  return isBlockedFinancialNoise(`${learnedText} ${text}`);
}

function isUsableExpenseResult(
  merchant: string | null | undefined,
  description: string | null | undefined,
  amount: number | null,
): boolean {
  if (!amount || amount <= 0) return false;

  const combined = `${merchant ?? ""} ${description ?? ""}`.trim();
  if (!combined) return false;

  return !UNKNOWN_RESULT_PATTERN.test(combined);
}

// ===================== TOKEN REFRESH =====================

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
  return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
}

// ===================== MIME HELPERS =====================

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
      if (part.parts) {
        parts.push(...flattenParts(part));
      } else {
        parts.push(part);
      }
    }
  }
  return parts;
}

function preFilter(subject: string, from: string, body: string): "reject" | "candidate" {
  const text = normalizeText(`${subject} ${from} ${body}`);

  if (HARD_TRANSACTION_PROOF.test(text)) return "candidate";

  if (isBlockedFinancialNoise(text)) return "reject";
  if (!hasExpenseIntent(text)) return "reject";
  if (SHIPPING_ONLY_PATTERN.test(text) && !POSITIVE_EXPENSE_PROOF.test(text)) return "reject";

  return "candidate";
}

// ===================== RULES ENGINE =====================

interface RuleResult {
  source: "rules";
  is_transaction: boolean;
  confidence: number;
  merchant: string;
  amount: number | null;
  category: string;
  subcategory: string;
}

interface EmailData {
  subject: string;
  from: string;
  body: string;
}

const MERCHANT_RULES = [
  {
    name: "Amazon",
    detect: (e: EmailData) => AMAZON_PATTERN.test(`${e.subject} ${e.from} ${e.body}`),
    allow: (t: string) => /commande|order|total|montant|tva|facture|invoice|re[çc]u|receipt/i.test(t),
    block: (t: string) => SHIPPING_ONLY_PATTERN.test(t) && !/total|montant|facture|invoice|re[çc]u|receipt|tva/i.test(t),
    extract: (t: string): Partial<RuleResult> => {
      const amount = extractAmount(t, [
        /(?:total(?:\s*(?:de la commande|commande|ttc))?|montant(?:\s+pay[ée]|\s+d[ûu])?|payment total|total amount)[^\d]{0,20}(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i,
        /(?:tva(?:\s+incluse)?|prix total)[^\d]{0,20}(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i,
      ]);
      return {
        merchant: "Amazon",
        amount,
        category: "Shopping",
        subcategory: "E-commerce",
      };
    },
  },
  {
    name: "Uber",
    detect: (e: EmailData) => /uber/i.test(e.from + e.body),
    allow: (t: string) => /reçu|receipt|trip|course|facture|total/i.test(t),
    block: (t: string) => /promo|parrainage|referral/i.test(t),
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      const isFood = /uber eats/i.test(t);
      return {
        merchant: isFood ? "Uber Eats" : "Uber",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: isFood ? "Alimentation" : "Transport",
        subcategory: isFood ? "Livraison" : "VTC",
      };
    },
  },
  {
    name: "Netflix",
    detect: (e: EmailData) => /netflix/i.test(e.from),
    allow: (t: string) => /facture|payment|paiement|prélèvement|montant/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Netflix",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Streaming",
      };
    },
  },
  {
    name: "Bouygues",
    detect: (e: EmailData) => BOUYGUES_PATTERN.test(`${e.subject} ${e.from} ${e.body}`),
    allow: (t: string) => /facture|montant|prélèvement|prelevement|abonnement|[ée]ch[ée]ance|echeance|montant d[ûu]|total à payer|total a payer|paiement|payment/i.test(t),
    block: (t: string) => /offre|promo|nouveaut[ée]/i.test(t) && !/facture|prélèvement|prelevement|montant d[ûu]|total à payer|total a payer/i.test(t),
    extract: (t: string): Partial<RuleResult> => {
      const amount = extractAmount(t, [
        /(?:montant d[ûu]|total à payer|total a payer|prélèvement|prelevement|montant de votre facture|montant ttc|facture)[^\d]{0,25}(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i,
      ]);
      return {
        merchant: "Bouygues Telecom",
        amount,
        category: "Abonnements",
        subcategory: "Télécom",
      };
    },
  },
  {
    name: "Orange",
    detect: (e: EmailData) => /orange\.fr|orange\.com/i.test(e.from),
    allow: (t: string) => /facture|montant|prélèvement/i.test(t),
    block: (t: string) => /offre|boutique/i.test(t) && !/facture/i.test(t),
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Orange",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Télécom",
      };
    },
  },
  {
    name: "SFR",
    detect: (e: EmailData) => /sfr/i.test(e.from),
    allow: (t: string) => /facture|montant|prélèvement/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "SFR",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Télécom",
      };
    },
  },
  {
    name: "Free",
    detect: (e: EmailData) => /free\.fr|free mobile/i.test(e.from + e.body),
    allow: (t: string) => /facture|montant|prélèvement/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Free",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Télécom / Internet",
      };
    },
  },
  {
    name: "PayPal",
    detect: (e: EmailData) => /paypal/i.test(e.from),
    allow: (t: string) => /reçu|receipt|paiement|payment|transaction/i.test(t),
    block: (t: string) => /promo|offre/i.test(t),
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "PayPal",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Paiement",
        subcategory: "Service de paiement",
      };
    },
  },
  {
    name: "Apple",
    detect: (e: EmailData) => /apple\.com|itunes/i.test(e.from),
    allow: (t: string) => /facture|receipt|reçu|achat|purchase/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Apple",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Services numériques",
      };
    },
  },
  {
    name: "Google",
    detect: (e: EmailData) => /google/i.test(e.from) && /payment|facture|paiement/i.test(e.subject + e.body),
    allow: (t: string) => /facture|receipt|paiement|payment/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Google",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Services numériques",
      };
    },
  },
  {
    name: "SNCF",
    detect: (e: EmailData) => /sncf|oui\.sncf|ouigo/i.test(e.from + e.body),
    allow: (t: string) => /billet|ticket|confirmation|réservation|booking/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "SNCF",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Transport",
        subcategory: "Train",
      };
    },
  },
  {
    name: "EDF/Engie",
    detect: (e: EmailData) => /edf|engie/i.test(e.from),
    allow: (t: string) => /facture|montant|prélèvement|consommation/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      const isEdf = /edf/i.test(t);
      return {
        merchant: isEdf ? "EDF" : "Engie",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Logement",
        subcategory: "Énergie",
      };
    },
  },
  {
    name: "IONOS",
    detect: (e: EmailData) => /ionos/i.test(e.from),
    allow: (t: string) => /facture|invoice|paiement|payment/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "IONOS",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Hébergement web",
      };
    },
  },
  {
    name: "Spotify",
    detect: (e: EmailData) => /spotify/i.test(e.from),
    allow: (t: string) => /facture|receipt|paiement|payment/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Spotify",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Streaming",
      };
    },
  },
  {
    name: "Disney+",
    detect: (e: EmailData) => /disney/i.test(e.from),
    allow: (t: string) => /facture|paiement|payment|prélèvement/i.test(t),
    block: () => false,
    extract: (t: string): Partial<RuleResult> => {
      const m = t.match(/(\d+[.,]\d{2})\s*€/);
      return {
        merchant: "Disney+",
        amount: m ? parseFloat(m[1].replace(",", ".")) : null,
        category: "Abonnements",
        subcategory: "Streaming",
      };
    },
  },
];

function applyRules(email: EmailData): RuleResult | null {
  const text = `${email.subject} ${email.from} ${email.body}`.toLowerCase();

  for (const rule of MERCHANT_RULES) {
    if (!rule.detect(email)) continue;
    if (!rule.allow(text)) continue;
    if (rule.block(text)) continue;

    const extracted = rule.extract(text);
    return {
      source: "rules",
      is_transaction: true,
      confidence: 0.95,
      merchant: extracted.merchant || rule.name,
      amount: extracted.amount ?? null,
      category: extracted.category || "Autre",
      subcategory: extracted.subcategory || "",
    };
  }

  return null;
}

// ===================== MERCHANT LEARNING =====================

async function findLearnedMerchant(
  supabaseAdmin: any,
  subject: string,
  from: string,
  body: string
): Promise<any | null> {
  const text = `${subject} ${from} ${body}`.toLowerCase();

  const { data } = await supabaseAdmin
    .from("merchant_profiles")
    .select("*")
    .gte("confidence", 0.7);

  if (!data) return null;

  return data.find((m: any) => {
    const patterns = m.patterns as string[];
    return patterns?.some((p: string) => text.includes(p.toLowerCase()));
  }) || null;
}

async function learnFromResult(
  supabaseAdmin: any,
  merchant: string,
  category: string | null,
  subcategory: string | null
): Promise<void> {
  if (!merchant) return;

  const key = merchant.toLowerCase().trim();
  if (!key || UNKNOWN_RESULT_PATTERN.test(key)) return;
  if (category && /investissement|épargne/i.test(category)) return;

  const { data } = await supabaseAdmin
    .from("merchant_profiles")
    .select("*")
    .eq("merchant", key);

  if (data && data.length > 0) {
    const m = data[0];
    await supabaseAdmin
      .from("merchant_profiles")
      .update({
        usage_count: m.usage_count + 1,
        confidence: Math.min(Number(m.confidence) + 0.02, 0.99),
        updated_at: new Date().toISOString(),
      })
      .eq("id", m.id);
  } else {
    await supabaseAdmin
      .from("merchant_profiles")
      .insert({
        merchant: key,
        normalized_name: merchant,
        category: category || null,
        subcategory: subcategory || null,
        patterns: [key],
      });
  }
}

// ===================== GMAIL API =====================

async function listMessageIdsByQuery(accessToken: string, query: string, maxResults: number): Promise<string[]> {
  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();

  if (!listRes.ok) {
    throw new Error(`Gmail list API error: ${JSON.stringify(listData)}`);
  }

  return (listData.messages || []).map((m: { id: string }) => m.id);
}

async function searchFinancialEmails(accessToken: string, maxResults = 120): Promise<any[]> {
  const includeTerms = [
    "facture", "invoice", "reçu", "receipt", "commande", "order",
    "paiement", "payment", "achat", "purchase", "prélèvement", "prelevement",
    "abonnement", "subscription", "montant", "amount", "total", "ttc", "échéance", "echeance",
    "amazon", "bouygues", "ionos", "orange", "sfr", "fnac",
  ];

  const queries = [
    `(${includeTerms.join(" OR ")}) newer_than:180d -category:social -category:promotions`,
    `(from:amazon OR from:amazon.fr OR from:bouygues OR from:bouyguestelecom OR from:paypal OR from:orange OR from:ionos) newer_than:365d -category:social -category:promotions`,
  ];

  const uniqueIds = new Set<string>();
  for (const query of queries) {
    const ids = await listMessageIdsByQuery(accessToken, query, maxResults);
    for (const id of ids) {
      uniqueIds.add(id);
      if (uniqueIds.size >= maxResults * 2) break;
    }
    if (uniqueIds.size >= maxResults * 2) break;
  }

  const messageIds = Array.from(uniqueIds).slice(0, maxResults);
  if (messageIds.length === 0) return [];

  const messages = [];
  for (const messageId of messageIds) {
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const msgData = await msgRes.json();

    if (!msgRes.ok) {
      console.warn("Skipping Gmail message (fetch error):", messageId, msgData);
      continue;
    }

    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
    const from = headers.find((h: any) => h.name === "From")?.value || "";
    const date = headers.find((h: any) => h.name === "Date")?.value || "";

    let body = "";
    const allParts = flattenParts(msgData.payload);

    const textPart = allParts.find((p: any) => p.mimeType === "text/plain" && p.body?.data);
    if (textPart) {
      body = decodeBase64Url(textPart.body.data);
    }

    const htmlPart = allParts.find((p: any) => p.mimeType === "text/html" && p.body?.data);
    let htmlBody = "";
    if (htmlPart) {
      const rawHtml = decodeBase64Url(htmlPart.body.data);
      htmlBody = rawHtml
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&euro;/g, "€")
        .replace(/&amp;/g, "&")
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (!body || body.trim().length < 50) {
      body = htmlBody;
    } else if (htmlBody && htmlBody.length > body.length) {
      body = body + "\n\n--- Contenu HTML ---\n" + htmlBody;
    }

    if (!body && msgData.payload?.body?.data) {
      body = decodeBase64Url(msgData.payload.body.data);
    }

    const truncatedBody = body.substring(0, 4500);

    messages.push({
      gmail_id: messageId,
      subject,
      from,
      date,
      body: truncatedBody,
      raw_text: `De: ${from}\nSujet: ${subject}\nDate: ${date}\n\n${truncatedBody}`,
    });
  }

  return messages;
}

// ===================== MAIN HANDLER =====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- Check sync limit ---
    const { data: planData } = await supabaseAdmin
      .from("user_plans")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = planData?.plan || "free";
    const SYNC_LIMITS: Record<string, number> = { free: 5, essential: 30, premium: 999 };
    const syncLimit = SYNC_LIMITS[userPlan] ?? SYNC_LIMITS.free;

    const { data: usageCount } = await supabaseAdmin.rpc("increment_ai_usage", {
      _user_id: user.id,
      _source: "email",
    });

    if ((usageCount as number) > syncLimit) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: `Limite mensuelle atteinte (${syncLimit} synchronisations email/mois pour le plan ${userPlan}).`,
          plan: userPlan,
          usage: usageCount,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Get tokens ---
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Compte Gmail non connecté" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;
    if (new Date(tokenData.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabaseAdmin
        .from("gmail_tokens")
        .update({ access_token: accessToken, token_expires_at: newExpiry })
        .eq("id", tokenData.id);
    }

    // --- Fetch emails ---
    const messages = await searchFinancialEmails(accessToken, 120);

    if (messages.length === 0) {
      await supabaseAdmin
        .from("connected_emails")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("email", email);

      return new Response(JSON.stringify({ success: true, analyzed: 0, message: "Aucun email financier trouvé" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Deduplicate ---
    const gmailIds = messages.map((m) => `gmail_${m.gmail_id}`);
    const { data: existingExpenses } = await supabaseAdmin
      .from("expenses")
      .select("source_id")
      .eq("user_id", user.id)
      .in("source_id", gmailIds);

    const alreadyProcessed = new Set((existingExpenses || []).map((e: any) => e.source_id));
    const newMessages = messages.filter((m) => !alreadyProcessed.has(`gmail_${m.gmail_id}`));

    if (newMessages.length === 0) {
      await supabaseAdmin
        .from("connected_emails")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("email", email);

      return new Response(JSON.stringify({ success: true, analyzed: 0, message: "Tous les emails ont déjà été analysés" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================
    // HYBRID PROCESSING: pre-filter → learned → rules → AI
    // =====================================================

    const results: any[] = [];

    for (const msg of newMessages) {
      try {
        const normalizedText = normalizeText(`${msg.subject} ${msg.from} ${msg.body}`);

        // 1. PRE-FILTER
        const filterResult = preFilter(msg.subject, msg.from, msg.body);
        if (filterResult === "reject") {
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, skipped: true, reason: "pre-filter" });
          continue;
        }

        // 2. LEARNED MERCHANT
        const learned = await findLearnedMerchant(supabaseAdmin, msg.subject, msg.from, msg.body);
        if (learned && learned.confidence >= 0.85) {
          if (isBlockedLearnedProfile(learned, normalizedText)) {
            results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, skipped: true, reason: "learned-filter" });
            continue;
          }

          const amount = extractAmount(msg.body, [
            /(?:total|montant|paiement|payment|pr[ée]l[èe]vement|prelevement|facture|invoice)[^\d]{0,25}(\d{1,3}(?:[ .\u00a0\u202f]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i,
          ]);

          if (isUsableExpenseResult(learned.normalized_name, msg.subject, amount)) {
            await supabaseAdmin.from("expenses").insert({
              user_id: user.id,
              source: "email",
              source_id: `gmail_${msg.gmail_id}`,
              fournisseur: learned.normalized_name,
              categorie: learned.category,
              montant_total: amount,
              date_expense: extractEmailDate(msg.raw_text),
              description: msg.subject,
              devise: "EUR",
            });

            await learnFromResult(supabaseAdmin, learned.normalized_name, learned.category, learned.subcategory);
            results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: true, source: "learned" });
            continue;
          }
        }

        // 3. RULES ENGINE
        const ruleResult = applyRules({ subject: msg.subject, from: msg.from, body: msg.body });
        if (ruleResult && isUsableExpenseResult(ruleResult.merchant, msg.subject, ruleResult.amount)) {
          await supabaseAdmin.from("expenses").insert({
            user_id: user.id,
            source: "email",
            source_id: `gmail_${msg.gmail_id}`,
            fournisseur: ruleResult.merchant,
            categorie: ruleResult.category,
            montant_total: ruleResult.amount,
            date_expense: extractEmailDate(msg.raw_text),
            description: msg.subject,
            devise: "EUR",
          });

          // Learn from this successful extraction
          await learnFromResult(supabaseAdmin, ruleResult.merchant, ruleResult.category, ruleResult.subcategory);

          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: true, source: "rules" });
          continue;
        }

        if (!hasExpenseIntent(normalizedText) || isBlockedFinancialNoise(normalizedText)) {
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, skipped: true, reason: "low-signal" });
          continue;
        }

        // 4. LOVABLE AI FALLBACK (via analyze-document)
        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "email",
            raw_text: msg.raw_text,
            source_id: `gmail_${msg.gmail_id}`,
            skip_usage_check: true,
          }),
        });

        const analyzeData = await analyzeRes.json();
        if (analyzeRes.ok) {
          if (analyzeData.rejected) {
            results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, skipped: true, reason: analyzeData.reason || "rejected", source: "ai" });
            continue;
          }

          const aiAmountRaw = analyzeData.expense?.montant_total;
          const aiAmount = typeof aiAmountRaw === "number" ? aiAmountRaw : parseCurrencyAmount(String(aiAmountRaw ?? ""));
          const aiMerchant = analyzeData.expense?.fournisseur;
          const aiDescription = analyzeData.expense?.description ?? msg.subject;
          const aiCategory = String(analyzeData.expense?.categorie ?? "");
          const shouldDiscardAiResult =
            !isUsableExpenseResult(aiMerchant, aiDescription, aiAmount) ||
            isBlockedFinancialNoise(normalizeText(`${msg.raw_text} ${aiMerchant ?? ""} ${aiDescription ?? ""}`)) ||
            (/investissement|épargne/i.test(aiCategory) && !POSITIVE_EXPENSE_PROOF.test(normalizedText));

          if (shouldDiscardAiResult) {
            await supabaseAdmin
              .from("expenses")
              .delete()
              .eq("user_id", user.id)
              .eq("source_id", `gmail_${msg.gmail_id}`);

            results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, skipped: true, reason: "ai-validation", source: "ai" });
            continue;
          }

          if (analyzeData.expense?.fournisseur) {
            await learnFromResult(
              supabaseAdmin,
              analyzeData.expense.fournisseur,
              analyzeData.expense.categorie,
              null
            );
          }
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: true, source: "ai" });
        } else {
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, error: analyzeData.error, source: "ai" });
        }
      } catch (err) {
        results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, error: String(err) });
      }
    }

    // Update last_sync_at
    await supabaseAdmin
      .from("connected_emails")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("email", email);

    const successCount = results.filter((r) => r.success).length;
    const bySource = {
      rules: results.filter((r) => r.source === "rules" && r.success).length,
      learned: results.filter((r) => r.source === "learned" && r.success).length,
      ai: results.filter((r) => r.source === "ai" && r.success).length,
      skipped: results.filter((r) => r.skipped).length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: successCount,
        total: results.length,
        by_source: bySource,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gmail-sync error:", e);
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
