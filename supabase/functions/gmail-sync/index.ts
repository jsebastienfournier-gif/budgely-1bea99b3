
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  email: z.string().email(),
});

type PipelineSource = "rules" | "learned" | "ai";

type EmailMessage = {
  gmail_id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  raw_text: string;
  sender_email: string;
  sender_domain: string;
  sender_name: string;
  normalized_text: string;
  normalized_sender: string;
  normalized_subject: string;
};

type LearnedProfile = {
  merchant: string;
  normalized_name: string;
  category: string | null;
  subcategory: string | null;
  confidence: number;
  usage_count: number;
  patterns: string[] | null;
};

type ExtractedExpense = {
  merchant: string;
  amount: number;
  category: string;
  subcategory: string;
  description: string;
  date: string | null;
  source: PipelineSource;
  recurrence?: string;
};

type CandidateDecision = {
  isCandidate: boolean;
  reason: string;
  score: number;
  amount: number | null;
  hasHardProof: boolean;
  hasTransactionKeyword: boolean;
};

type MerchantRule = {
  merchant: string;
  senderPatterns: RegExp[];
  transactionPatterns: RegExp[];
  blockedPatterns?: RegExp[];
  amountKeywords?: string[];
  category: string;
  subcategory: string;
  recurrence?: string;
  resolveMetadata?: (message: EmailMessage) => {
    merchant: string;
    category: string;
    subcategory: string;
    recurrence?: string;
  };
};

const EMAIL_SOURCE = "email";
const MAX_SEARCH_RESULTS = 120;
const FETCH_BATCH_SIZE = 12;
const MIN_LEARNED_CONFIDENCE = 0.9;
const MIN_LEARNED_USAGE = 2;

const GENERIC_DOMAIN_LABELS = new Set([
  "mail",
  "mailer",
  "email",
  "service",
  "services",
  "notify",
  "notification",
  "notifications",
  "news",
  "noreply",
  "no",
  "reply",
  "support",
  "info",
  "contact",
  "hello",
  "team",
]);

const HARD_PROOF_PATTERN =
  /(confirmation de paiement|paiement confirme|paiement effectue|merci pour votre achat|facture|invoice|recu|receipt|prelevement|debit|payment due|amount due|montant paye|montant du|total ttc|numero de facture|numero de commande|commande n|order confirmed)/i;
const TRANSACTION_KEYWORD_PATTERN =
  /(facture|invoice|recu|receipt|commande|order|paiement|payment|achat|purchase|prelevement|debit|abonnement|subscription|echeance|montant|amount|total|ttc|a payer|paid|billing)/i;
const ORDER_REFERENCE_PATTERN = /(commande n|order|numero de commande|numero de facture)/i;
const PROMO_PATTERN =
  /(tirage au sort|gagnez|remportez|offre|promotion|promo|newsletter|parrainage|code promo|bon plan|vente flash|reduction|soldes|jeu concours|black friday|cyber monday)/i;
const INVESTMENT_PATTERN =
  /(fortuneo|la premiere brique|premiere brique|crowdfunding|investissement|investir|souscription au projet|rendement|avis d execution|porte monnaie|portefeuille|wallet|robot investisseur|bourse|dividende|versement programme|p2p)/i;
const NOTICE_ONLY_PATTERN =
  /(nouvelle actualite|demande est bien recue|bienvenue a bord|vient de passer a l action|actualite du projet|votre compte joueur a bien ete credite|alimentation de votre porte monnaie)/i;
const REFUND_NOISE_PATTERN = /(remboursement mensuel|cashback|gain|recompense|reward)/i;
const ACCOUNT_UPDATE_PATTERN =
  /(mot de passe|connexion|code de securite|verifiez|verify|bienvenue|welcome|adresse email|reinitialisation|password|double authentification|2fa|securite|suspicious login|new sign in)/i;
const APPOINTMENT_PATTERN = /(rendez vous|rdv|appointment|reservation|booking|creneau|slot)/i;
const LOGISTICS_PATTERN =
  /(livraison|delivery|tracking|suivi|expedie|shipped|colis|point relais|dispatch|retour en cours|return in transit)/i;
const DOMAIN_SETUP_PATTERN =
  /(domaine .* enregistre|confirmation de contrat|hebergement active|dns|whois|site web cree|votre domaine .* bien ete enregistre|domaine .* registered)/i;
const CONTENT_PATTERN = /(webinaire|webinar|blog|article|actualite|newsletter|evenement|event|livestream|podcast)/i;
const UNKNOWN_PATTERN = /(inconnu|unknown|n a|aucun article|no item|sans objet)/i;
const KNOWN_SENDER_PATTERN = /(amazon|bouygues|paypal|orange|sfr|free|fnac|uber|netflix|spotify|apple|google|ionos|sncf|ouigo|semerap)/i;
const BLOCKED_CATEGORY_PATTERN = /(investissement|epargne|finance|wallet|bourse)/i;
const LEARNING_BLOCKLIST_PATTERN = /(fortuneo|premiere brique|wallet|cashback|reward|fdj|parionssport|tirage au sort)/i;
const RELEVANT_LINE_PATTERN =
  /(€|eur|invoice|facture|receipt|recu|order|commande|payment|paiement|prelevement|debit|amount|montant|total|ttc|echeance|amazon|bouygues|orange|sfr|free|paypal|fnac|uber|netflix|spotify|apple|google|ionos|sncf|semerap)/i;

const GENERIC_AMOUNT_KEYWORDS = [
  "total",
  "montant",
  "a payer",
  "facture",
  "invoice",
  "receipt",
  "recu",
  "paiement",
  "payment",
  "prelevement",
  "debit",
  "commande",
  "order",
  "echeance",
  "billing",
];

const GMAIL_QUERIES = [
  "category:purchases newer_than:365d -category:promotions -label:spam -label:trash",
  '(facture OR invoice OR recu OR receipt OR paiement OR payment OR prelevement OR debit OR echeance OR total OR montant OR "a payer") newer_than:180d -category:social -category:promotions -label:spam -label:trash',
  '(amazon OR bouygues OR orange OR sfr OR free OR fnac OR paypal OR uber OR netflix OR spotify OR apple OR google OR ionos OR sncf OR semerap) newer_than:365d -category:social -category:promotions -label:spam -label:trash',
];

const MERCHANT_METADATA = {
  Amazon: { category: "Shopping", subcategory: "E-commerce" },
  "Bouygues Telecom": { category: "Abonnements", subcategory: "Telecom" },
  Orange: { category: "Abonnements", subcategory: "Telecom" },
  SFR: { category: "Abonnements", subcategory: "Telecom" },
  Free: { category: "Abonnements", subcategory: "Telecom" },
  Fnac: { category: "Shopping", subcategory: "Culture" },
  PayPal: { category: "Paiement", subcategory: "Portefeuille" },
  Uber: { category: "Transport", subcategory: "VTC" },
  "Uber Eats": { category: "Restauration", subcategory: "Livraison" },
  Netflix: { category: "Abonnements", subcategory: "Streaming" },
  Spotify: { category: "Abonnements", subcategory: "Streaming" },
  Apple: { category: "Abonnements", subcategory: "Services numeriques" },
  Google: { category: "Abonnements", subcategory: "Services numeriques" },
  SNCF: { category: "Transport", subcategory: "Train" },
  IONOS: { category: "Abonnements", subcategory: "Hebergement web" },
  Semerap: { category: "Logement", subcategory: "Eau" },
} as const;

const MERCHANT_RULES: MerchantRule[] = [
  {
    merchant: "Amazon",
    senderPatterns: [/amazon/i],
    transactionPatterns: [/facture|invoice|recu|receipt|merci pour votre achat|payment|paiement|total|montant|commande confirmee|order confirmed/i],
    blockedPatterns: [/livraison|delivery|tracking|expedie|shipped|retour|return|avis sur votre achat|review/i],
    amountKeywords: ["total", "commande", "paiement", "payment", "montant", "facture"],
    category: "Shopping",
    subcategory: "E-commerce",
  },
  {
    merchant: "Bouygues Telecom",
    senderPatterns: [/bouygues/i, /bouyguestelecom/i, /b and you/i, /b you/i],
    transactionPatterns: [/facture|prelevement|echeance|montant du|montant|total a payer|paiement|payment|commande/i],
    blockedPatterns: [/offre|promo|nouveaute|bon plan|decouvrez/i],
    amountKeywords: ["facture", "prelevement", "echeance", "montant", "total a payer", "paiement"],
    category: "Abonnements",
    subcategory: "Telecom",
    recurrence: "mensuel",
  },
  {
    merchant: "Orange",
    senderPatterns: [/orange/i],
    transactionPatterns: [/facture|prelevement|echeance|montant|total a payer|paiement/i],
    blockedPatterns: [/offre|promo|boutique|decouvrez/i],
    amountKeywords: ["facture", "prelevement", "echeance", "montant", "total a payer"],
    category: "Abonnements",
    subcategory: "Telecom",
    recurrence: "mensuel",
  },
  {
    merchant: "SFR",
    senderPatterns: [/sfr/i],
    transactionPatterns: [/facture|prelevement|echeance|montant|total a payer|paiement/i],
    blockedPatterns: [/offre|promo|boutique|decouvrez/i],
    amountKeywords: ["facture", "prelevement", "echeance", "montant", "total a payer"],
    category: "Abonnements",
    subcategory: "Telecom",
    recurrence: "mensuel",
  },
  {
    merchant: "Free",
    senderPatterns: [/free/i],
    transactionPatterns: [/facture|prelevement|echeance|montant|total a payer|paiement/i],
    blockedPatterns: [/offre|promo|decouvrez/i],
    amountKeywords: ["facture", "prelevement", "echeance", "montant", "total a payer"],
    category: "Abonnements",
    subcategory: "Telecom",
    recurrence: "mensuel",
  },
  {
    merchant: "Fnac",
    senderPatterns: [/fnac/i],
    transactionPatterns: [/commande|order|facture|invoice|paiement|payment|recu|receipt|total|montant/i],
    blockedPatterns: [/promo|offre|newsletter|livraison|tracking/i],
    amountKeywords: ["commande", "total", "montant", "paiement", "facture"],
    category: "Shopping",
    subcategory: "Culture",
  },
  {
    merchant: "PayPal",
    senderPatterns: [/paypal/i],
    transactionPatterns: [/recu|receipt|paiement|payment|transaction|facture|invoice/i],
    blockedPatterns: [/promo|offre|cashback|reward/i],
    amountKeywords: ["paiement", "payment", "transaction", "montant", "total"],
    category: "Paiement",
    subcategory: "Portefeuille",
  },
  {
    merchant: "Uber",
    senderPatterns: [/uber/i],
    transactionPatterns: [/recu|receipt|course|trip|facture|total|commande|order|paiement/i],
    blockedPatterns: [/promo|parrainage|newsletter/i],
    amountKeywords: ["total", "receipt", "recu", "paiement", "payment"],
    category: "Transport",
    subcategory: "VTC",
    resolveMetadata: (message) => {
      if (/uber eats/i.test(message.normalized_text)) {
        return {
          merchant: "Uber Eats",
          category: "Restauration",
          subcategory: "Livraison",
        };
      }

      return {
        merchant: "Uber",
        category: "Transport",
        subcategory: "VTC",
      };
    },
  },
  {
    merchant: "Netflix",
    senderPatterns: [/netflix/i],
    transactionPatterns: [/facture|invoice|paiement|payment|prelevement|billing|receipt|recu/i],
    amountKeywords: ["facture", "payment", "paiement", "total", "billing"],
    category: "Abonnements",
    subcategory: "Streaming",
    recurrence: "mensuel",
  },
  {
    merchant: "Spotify",
    senderPatterns: [/spotify/i],
    transactionPatterns: [/facture|invoice|paiement|payment|prelevement|billing|receipt|recu/i],
    amountKeywords: ["facture", "payment", "paiement", "total", "billing"],
    category: "Abonnements",
    subcategory: "Streaming",
    recurrence: "mensuel",
  },
  {
    merchant: "Apple",
    senderPatterns: [/apple/i, /itunes/i],
    transactionPatterns: [/facture|invoice|receipt|recu|achat|purchase|paiement|payment/i],
    blockedPatterns: [/newsletter|promo/i],
    amountKeywords: ["receipt", "recu", "payment", "paiement", "total", "montant"],
    category: "Abonnements",
    subcategory: "Services numeriques",
  },
  {
    merchant: "Google",
    senderPatterns: [/google/i],
    transactionPatterns: [/facture|invoice|receipt|recu|paiement|payment|achat|purchase|billing/i],
    blockedPatterns: [/newsletter|promo/i],
    amountKeywords: ["receipt", "recu", "payment", "paiement", "total", "montant", "billing"],
    category: "Abonnements",
    subcategory: "Services numeriques",
  },
  {
    merchant: "SNCF",
    senderPatterns: [/sncf/i, /ouigo/i],
    transactionPatterns: [/billet|ticket|confirmation|reservation|booking|paiement|payment|facture|montant|total/i],
    blockedPatterns: [/newsletter|promo/i],
    amountKeywords: ["billet", "ticket", "paiement", "payment", "total", "montant"],
    category: "Transport",
    subcategory: "Train",
  },
  {
    merchant: "IONOS",
    senderPatterns: [/ionos/i],
    transactionPatterns: [/facture|invoice|paiement|payment|prelevement|montant|total|commande payee/i],
    blockedPatterns: [/domaine .* enregistre|confirmation de contrat|hebergement active|dns|whois|activation/i],
    amountKeywords: ["facture", "payment", "paiement", "montant", "total", "prelevement"],
    category: "Abonnements",
    subcategory: "Hebergement web",
  },
  {
    merchant: "Semerap",
    senderPatterns: [/semerap/i],
    transactionPatterns: [/confirmation de paiement|paiement|payment|facture|recu|receipt|montant|total|point de comptage/i],
    blockedPatterns: [/newsletter|actualite|promo/i],
    amountKeywords: ["paiement", "payment", "montant", "total", "facture"],
    category: "Logement",
    subcategory: "Eau",
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[  ]/g, " ")
    .replace(/[^a-z0-9@.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactToken(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function matchesAny(text: string, patterns: RegExp[] = []): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\]/g, "\$&");
}

function parseCurrencyAmount(raw: string): number | null {
  let normalized = raw.trim().replace(/[\s  ]/g, "");
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

function extractCurrencyAmounts(text: string): number[] {
  const normalized = text.replace(/[  ]/g, " ");
  const matches = [
    ...normalized.matchAll(/(?:€|eur)\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi),
    ...normalized.matchAll(/(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/gi),
  ];

  const unique = new Set<number>();
  for (const match of matches) {
    const amount = parseCurrencyAmount(match[1] ?? "");
    if (amount !== null) unique.add(amount);
  }

  return Array.from(unique).sort((a, b) => b - a);
}

function extractAmount(text: string, preferredKeywords: string[] = []): number | null {
  const normalized = text.replace(//g, "
").replace(/[  ]/g, " ");
  const lines = normalized
    .split(/
+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const keywords = Array.from(new Set([...preferredKeywords, ...GENERIC_AMOUNT_KEYWORDS])).filter(Boolean);
  const keywordRegex = new RegExp(keywords.map(escapeRegExp).join("|"), "i");

  for (const line of lines) {
    const normalizedLine = normalizeText(line);
    if (!keywordRegex.test(normalizedLine) && !/(€|eur)/i.test(line)) continue;

    const amounts = extractCurrencyAmounts(line);
    if (amounts.length > 0) {
      return Math.max(...amounts);
    }
  }

  const allAmounts = extractCurrencyAmounts(normalized);
  return allAmounts.length > 0 ? Math.max(...allAmounts) : null;
}

function extractEmailDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate.toISOString().split("T")[0];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ");
}

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

function htmlToText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeQuotedSections(body: string): string {
  let cleaned = body;
  cleaned = cleaned.replace(/
>.*$/gm, "");
  cleaned = cleaned.replace(/
On .* wrote:[\s\S]*$/i, "");
  cleaned = cleaned.replace(/
Le .* a ecrit :[\s\S]*$/i, "");
  cleaned = cleaned.replace(/
-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i, "");
  cleaned = cleaned.replace(/
From:\s.*[\s\S]*$/i, "");
  cleaned = cleaned.replace(/
De\s*:\s.*[\s\S]*$/i, "");
  return cleaned;
}

function sanitizeBody(body: string): string {
  return removeQuotedSections(body)
    .replace(//g, "
")
    .replace(/[ 	]+
/g, "
")
    .replace(/[ 	]{2,}/g, " ")
    .replace(/
{3,}/g, "

")
    .trim();
}

function focusEmailBody(body: string): string {
  const lines = body
    .split(/
+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 220);

  if (lines.length === 0) return body.slice(0, 6000);

  const pickedIndexes = new Set<number>();
  for (let index = 0; index < lines.length; index += 1) {
    if (RELEVANT_LINE_PATTERN.test(normalizeText(lines[index]))) {
      for (let cursor = Math.max(0, index - 1); cursor <= Math.min(lines.length - 1, index + 1); cursor += 1) {
        pickedIndexes.add(cursor);
      }
    }
  }

  const selectedIndexes = pickedIndexes.size > 0
    ? Array.from(pickedIndexes).sort((a, b) => a - b)
    : lines.slice(0, 40).map((_, index) => index);

  const selectedLines: string[] = [];
  const seen = new Set<string>();
  for (const index of selectedIndexes) {
    const line = lines[index];
    const normalizedLine = normalizeText(line);
    if (!normalizedLine || seen.has(normalizedLine)) continue;
    seen.add(normalizedLine);
    selectedLines.push(line);
  }

  return selectedLines.join("
").slice(0, 6000);
}

function parseSender(from: string): { senderEmail: string; senderDomain: string; senderName: string } {
  const emailMatch = from.match(/<([^>]+)>/);
  const senderEmail = (emailMatch?.[1] ?? from).trim().toLowerCase();
  const senderDomain = senderEmail.includes("@") ? senderEmail.split("@").pop() ?? "" : "";
  const senderName = from.replace(/<[^>]+>/g, "").replace(/["']/g, "").trim() || senderDomain;

  return {
    senderEmail,
    senderDomain,
    senderName,
  };
}

function getPrimaryDomainLabel(senderDomain: string): string {
  const parts = senderDomain.split(".").filter(Boolean);
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && parts[parts.length - 2].length <= 3) {
    return parts[parts.length - 3];
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0] ?? "";
}

function inferMerchantFromSender(senderDomain: string, senderName: string): string | null {
  const normalized = normalizeText(`${senderDomain} ${senderName}`);
  const exactMatches: Array<[RegExp, string]> = [
    [/amazon/i, "Amazon"],
    [/bouygues|bouyguestelecom/i, "Bouygues Telecom"],
    [/orange/i, "Orange"],
    [/sfr/i, "SFR"],
    [/free/i, "Free"],
    [/fnac/i, "Fnac"],
    [/paypal/i, "PayPal"],
    [/uber/i, "Uber"],
    [/netflix/i, "Netflix"],
    [/spotify/i, "Spotify"],
    [/apple|itunes/i, "Apple"],
    [/google/i, "Google"],
    [/sncf|ouigo/i, "SNCF"],
    [/ionos/i, "IONOS"],
    [/semerap/i, "Semerap"],
  ];

  for (const [pattern, merchant] of exactMatches) {
    if (pattern.test(normalized)) return merchant;
  }

  const label = normalizeText(getPrimaryDomainLabel(senderDomain));
  if (!label || GENERIC_DOMAIN_LABELS.has(label) || label.length < 3) return null;

  if (label === "bouyguestelecom") return "Bouygues Telecom";
  return titleCase(label);
}

function inferMerchantMetadata(merchant: string | null | undefined): { category: string; subcategory: string } | null {
  if (!merchant) return null;
  const normalizedMerchant = normalizeText(merchant);

  for (const [name, metadata] of Object.entries(MERCHANT_METADATA)) {
    if (normalizeText(name) === normalizedMerchant) {
      return metadata;
    }
  }

  return null;
}

function evaluateCandidate(message: EmailMessage): CandidateDecision {
  const text = message.normalized_text;
  const amount = extractAmount(message.body);
  const hasHardProof = HARD_PROOF_PATTERN.test(text);
  const hasTransactionKeyword = TRANSACTION_KEYWORD_PATTERN.test(text);
  const hasOrderReference = ORDER_REFERENCE_PATTERN.test(text);
  const knownSender = KNOWN_SENDER_PATTERN.test(message.normalized_sender);

  if (INVESTMENT_PATTERN.test(text) || NOTICE_ONLY_PATTERN.test(text)) {
    return { isCandidate: false, reason: "non-expense-financial", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (PROMO_PATTERN.test(text) && !hasHardProof) {
    return { isCandidate: false, reason: "promotion", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (REFUND_NOISE_PATTERN.test(text) && !hasHardProof) {
    return { isCandidate: false, reason: "refund-noise", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (ACCOUNT_UPDATE_PATTERN.test(text) && amount === null && !hasHardProof) {
    return { isCandidate: false, reason: "account-update", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (APPOINTMENT_PATTERN.test(text) && amount === null && !hasHardProof) {
    return { isCandidate: false, reason: "appointment", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (DOMAIN_SETUP_PATTERN.test(text) && amount === null && !hasHardProof) {
    return { isCandidate: false, reason: "domain-setup", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (LOGISTICS_PATTERN.test(text) && amount === null && !hasHardProof) {
    return { isCandidate: false, reason: "logistics", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  if (CONTENT_PATTERN.test(text) && amount === null && !hasHardProof) {
    return { isCandidate: false, reason: "content", score: 0, amount, hasHardProof, hasTransactionKeyword };
  }

  let score = 0;
  if (amount !== null) score += 3;
  if (hasTransactionKeyword) score += 2;
  if (hasHardProof) score += 3;
  if (hasOrderReference) score += 1;
  if (knownSender) score += 1;

  const isCandidate =
    score >= 5 ||
    (amount !== null && (hasTransactionKeyword || hasHardProof)) ||
    (hasHardProof && knownSender) ||
    (hasOrderReference && amount !== null);

  return {
    isCandidate,
    reason: isCandidate ? "candidate" : "low-signal",
    score,
    amount,
    hasHardProof,
    hasTransactionKeyword,
  };
}

function applyMerchantRules(message: EmailMessage): ExtractedExpense | null {
  const text = message.normalized_text;
  const sender = message.normalized_sender;

  for (const rule of MERCHANT_RULES) {
    if (!matchesAny(sender, rule.senderPatterns) && !matchesAny(text, rule.senderPatterns)) continue;

    const hasBlockedSignal = matchesAny(text, rule.blockedPatterns ?? []);
    const hasTransactionProof = matchesAny(text, rule.transactionPatterns) || HARD_PROOF_PATTERN.test(text);
    if (hasBlockedSignal && !hasTransactionProof) continue;
    if (!hasTransactionProof) continue;

    const amount = extractAmount(message.body, rule.amountKeywords);
    if (amount === null) continue;

    const metadata = rule.resolveMetadata?.(message) ?? {
      merchant: rule.merchant,
      category: rule.category,
      subcategory: rule.subcategory,
      recurrence: rule.recurrence,
    };

    return {
      merchant: metadata.merchant,
      amount,
      category: metadata.category,
      subcategory: metadata.subcategory,
      description: message.subject.trim(),
      date: extractEmailDate(message.date),
      source: "rules",
      recurrence: metadata.recurrence,
    };
  }

  return null;
}

function isSafeLearnedProfile(profile: LearnedProfile): boolean {
  const merchantText = normalizeText(`${profile.merchant} ${profile.normalized_name}`);
  const categoryText = normalizeText(profile.category ?? "");

  if (Number(profile.confidence) < MIN_LEARNED_CONFIDENCE) return false;
  if (Number(profile.usage_count ?? 0) < MIN_LEARNED_USAGE) return false;
  if (!merchantText) return false;
  if (LEARNING_BLOCKLIST_PATTERN.test(merchantText)) return false;
  if (BLOCKED_CATEGORY_PATTERN.test(categoryText)) return false;

  return true;
}

function profileMatchesMessage(profile: LearnedProfile, message: EmailMessage): boolean {
  const tokens = new Set<string>();
  const rawTokens = [profile.merchant, profile.normalized_name, ...(profile.patterns ?? [])];
  for (const token of rawTokens) {
    const normalizedToken = normalizeText(token ?? "");
    if (normalizedToken.length >= 3) tokens.add(normalizedToken);
  }

  if (tokens.size === 0) return false;

  const normalizedText = message.normalized_text;
  const compactSender = compactToken(`${message.sender_email} ${message.sender_domain} ${message.sender_name}`);

  for (const token of tokens) {
    if (normalizedText.includes(token)) return true;
    if (compactSender.includes(token.replace(/\s+/g, ""))) return true;
  }

  return false;
}

async function loadLearnedProfiles(supabaseAdmin: any): Promise<LearnedProfile[]> {
  const { data, error } = await supabaseAdmin
    .from("merchant_profiles")
    .select("merchant, normalized_name, category, subcategory, confidence, usage_count, patterns")
    .gte("confidence", MIN_LEARNED_CONFIDENCE)
    .order("confidence", { ascending: false })
    .order("usage_count", { ascending: false });

  if (error || !data) {
    console.warn("Unable to load merchant_profiles", error);
    return [];
  }

  return (data as LearnedProfile[]).filter(isSafeLearnedProfile);
}

function findMatchingLearnedProfile(profiles: LearnedProfile[], message: EmailMessage): LearnedProfile | null {
  return profiles.find((profile) => profileMatchesMessage(profile, message)) ?? null;
}

function applyLearnedProfile(profile: LearnedProfile, message: EmailMessage): ExtractedExpense | null {
  if (!profileMatchesMessage(profile, message)) return null;

  const amount = extractAmount(message.body);
  if (amount === null) return null;

  const text = message.normalized_text;
  if (!HARD_PROOF_PATTERN.test(text) && !TRANSACTION_KEYWORD_PATTERN.test(text)) return null;

  const merchant = profile.normalized_name?.trim() || titleCase(profile.merchant);
  const metadata = inferMerchantMetadata(merchant);

  return {
    merchant,
    amount,
    category: profile.category?.trim() || metadata?.category || "Autre",
    subcategory: profile.subcategory?.trim() || metadata?.subcategory || "",
    description: message.subject.trim(),
    date: extractEmailDate(message.date),
    source: "learned",
  };
}

function shouldLearnMerchant(merchant: string, category: string | null | undefined): boolean {
  const merchantText = normalizeText(merchant);
  const categoryText = normalizeText(category ?? "");

  if (!merchantText || UNKNOWN_PATTERN.test(merchantText)) return false;
  if (LEARNING_BLOCKLIST_PATTERN.test(merchantText)) return false;
  if (BLOCKED_CATEGORY_PATTERN.test(categoryText)) return false;

  return true;
}

function buildLearningPatterns(merchant: string, message: EmailMessage): string[] {
  const patterns = new Set<string>();
  const merchantToken = normalizeText(merchant);
  if (merchantToken.length >= 3) patterns.add(merchantToken);

  const senderLabel = normalizeText(getPrimaryDomainLabel(message.sender_domain));
  if (senderLabel.length >= 3 && !GENERIC_DOMAIN_LABELS.has(senderLabel)) {
    patterns.add(senderLabel);
  }

  const senderNameToken = normalizeText(message.sender_name);
  if (senderNameToken.length >= 3 && senderNameToken.length <= 40) {
    patterns.add(senderNameToken);
  }

  return Array.from(patterns);
}

async function learnFromResult(
  supabaseAdmin: any,
  extracted: ExtractedExpense,
  message: EmailMessage,
): Promise<void> {
  if (!shouldLearnMerchant(extracted.merchant, extracted.category)) return;

  const merchantKey = normalizeText(extracted.merchant);
  const nextPatterns = buildLearningPatterns(extracted.merchant, message);
  const subcategory = extracted.subcategory || inferMerchantMetadata(extracted.merchant)?.subcategory || null;

  const { data: existingRows } = await supabaseAdmin
    .from("merchant_profiles")
    .select("id, usage_count, confidence, patterns")
    .eq("merchant", merchantKey)
    .limit(1);

  const existing = existingRows?.[0];
  if (existing) {
    const mergedPatterns = Array.from(new Set([...(existing.patterns ?? []), ...nextPatterns]));
    await supabaseAdmin
      .from("merchant_profiles")
      .update({
        usage_count: Number(existing.usage_count ?? 0) + 1,
        confidence: Math.min(Number(existing.confidence ?? 0.8) + 0.02, 0.99),
        updated_at: new Date().toISOString(),
        patterns: mergedPatterns,
        normalized_name: extracted.merchant,
        category: extracted.category || null,
        subcategory,
      })
      .eq("id", existing.id);
    return;
  }

  await supabaseAdmin.from("merchant_profiles").insert({
    merchant: merchantKey,
    normalized_name: extracted.merchant,
    category: extracted.category || null,
    subcategory,
    patterns: nextPatterns,
  });
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

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

  const data = await readJson(res);
  if (!res.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      throw new Error("Token Gmail expiré ou révoqué. Déconnectez puis reconnectez votre compte Gmail.");
    }
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
}

async function listMessageIdsByQuery(accessToken: string, query: string, maxResults: number): Promise<string[]> {
  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const listData = await readJson(listRes);
  if (!listRes.ok) {
    throw new Error(`Gmail list API error: ${JSON.stringify(listData)}`);
  }

  return (listData.messages || []).map((message: { id: string }) => message.id);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchMessageDetails(accessToken: string, messageId: string): Promise<EmailMessage | null> {
  const msgRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const msgData = await readJson(msgRes);
  if (!msgRes.ok) {
    console.warn("Skipping Gmail message (fetch error):", messageId, msgData);
    return null;
  }

  const headers = msgData.payload?.headers || [];
  const subject = headers.find((header: any) => header.name?.toLowerCase() === "subject")?.value || "";
  const from = headers.find((header: any) => header.name?.toLowerCase() === "from")?.value || "";
  const date = headers.find((header: any) => header.name?.toLowerCase() === "date")?.value || "";

  const allParts = flattenParts(msgData.payload);
  const plainTextParts = allParts
    .filter((part: any) => part.mimeType === "text/plain" && part.body?.data)
    .map((part: any) => decodeBase64Url(part.body.data));
  const htmlTextParts = allParts
    .filter((part: any) => part.mimeType === "text/html" && part.body?.data)
    .map((part: any) => htmlToText(decodeBase64Url(part.body.data)));

  const payloadBody = msgData.payload?.body?.data ? decodeBase64Url(msgData.payload.body.data) : "";
  const mergedBody = [
    ...plainTextParts,
    ...htmlTextParts,
    payloadBody,
  ]
    .filter(Boolean)
    .join("
");

  const sanitizedBody = sanitizeBody(mergedBody);
  const focusedBody = focusEmailBody(sanitizedBody);
  const body = (focusedBody || sanitizedBody).slice(0, 6000);

  const { senderEmail, senderDomain, senderName } = parseSender(from);

  return {
    gmail_id: messageId,
    subject,
    from,
    date,
    body,
    raw_text: `De: ${from}
Sujet: ${subject}
Date: ${date}

${body}`,
    sender_email: senderEmail,
    sender_domain: senderDomain,
    sender_name: senderName,
    normalized_text: normalizeText(`${subject} ${from} ${body}`),
    normalized_sender: normalizeText(`${senderEmail} ${senderDomain} ${senderName}`),
    normalized_subject: normalizeText(subject),
  };
}

async function searchFinancialEmails(accessToken: string, maxResults = MAX_SEARCH_RESULTS): Promise<EmailMessage[]> {
  const uniqueIds = new Set<string>();

  for (const query of GMAIL_QUERIES) {
    const ids = await listMessageIdsByQuery(accessToken, query, maxResults);
    for (const id of ids) {
      uniqueIds.add(id);
      if (uniqueIds.size >= maxResults * 2) break;
    }
    if (uniqueIds.size >= maxResults * 2) break;
  }

  const messageIds = Array.from(uniqueIds).slice(0, maxResults);
  if (messageIds.length === 0) return [];

  const messages: EmailMessage[] = [];
  for (const batch of chunkArray(messageIds, FETCH_BATCH_SIZE)) {
    const results = await Promise.all(batch.map((messageId) => fetchMessageDetails(accessToken, messageId)));
    for (const message of results) {
      if (message) messages.push(message);
    }
  }

  return messages;
}

function buildExpensePayload(userId: string, sourceId: string, extracted: ExtractedExpense) {
  return {
    user_id: userId,
    source: EMAIL_SOURCE,
    source_id: sourceId,
    type_document: "email_financier",
    fournisseur: extracted.merchant,
    categorie: extracted.category || "Autre",
    montant_total: extracted.amount,
    date_expense: extracted.date,
    description: extracted.description,
    devise: "EUR",
    recurrence: extracted.recurrence ?? "",
    abonnement_detecte: extracted.category === "Abonnements" || Boolean(extracted.recurrence),
    raw_ai_response: { pipeline: `gmail-sync:${extracted.source}` },
  };
}

async function insertExpense(supabaseAdmin: any, userId: string, sourceId: string, extracted: ExtractedExpense): Promise<void> {
  const { error } = await supabaseAdmin.from("expenses").insert(buildExpensePayload(userId, sourceId, extracted));
  if (error) {
    throw new Error(`Insert expense error: ${error.message}`);
  }
}

async function upsertExpense(supabaseAdmin: any, userId: string, sourceId: string, extracted: ExtractedExpense): Promise<void> {
  const { data: existingRows, error: selectError } = await supabaseAdmin
    .from("expenses")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", sourceId)
    .limit(1);

  if (selectError) {
    throw new Error(`Expense lookup failed: ${selectError.message}`);
  }

  const existing = existingRows?.[0];
  if (existing) {
    const { error } = await supabaseAdmin
      .from("expenses")
      .update(buildExpensePayload(userId, sourceId, extracted))
      .eq("id", existing.id);
    if (error) {
      throw new Error(`Expense update failed: ${error.message}`);
    }
    return;
  }

  await insertExpense(supabaseAdmin, userId, sourceId, extracted);
}

async function deleteExpenseBySourceId(supabaseAdmin: any, userId: string, sourceId: string): Promise<void> {
  await supabaseAdmin
    .from("expenses")
    .delete()
    .eq("user_id", userId)
    .eq("source_id", sourceId);
}

function sanitizeMerchant(value: unknown): string {
  const merchant = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!merchant) return "";
  if (UNKNOWN_PATTERN.test(normalizeText(merchant))) return "";
  return merchant;
}

function sanitizeCategory(value: unknown): string {
  const category = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!category) return "";
  if (UNKNOWN_PATTERN.test(normalizeText(category))) return "";
  return category;
}

function findAmountKeywordsForMerchant(merchant: string): string[] {
  const normalizedMerchant = normalizeText(merchant);
  const matchingRule = MERCHANT_RULES.find((rule) => normalizeText(rule.merchant) === normalizedMerchant);
  return matchingRule?.amountKeywords ?? GENERIC_AMOUNT_KEYWORDS;
}

function buildValidatedAiExpense(message: EmailMessage, analyzeData: any): ExtractedExpense | null {
  const aiExpense = analyzeData?.expense ?? {};
  const merchant =
    sanitizeMerchant(aiExpense.fournisseur) ||
    sanitizeMerchant(aiExpense.magasin) ||
    inferMerchantFromSender(message.sender_domain, message.sender_name) ||
    "";

  const inferredMetadata = inferMerchantMetadata(merchant);
  const rawCategory = sanitizeCategory(aiExpense.categorie);
  const category = rawCategory && !BLOCKED_CATEGORY_PATTERN.test(normalizeText(rawCategory))
    ? rawCategory
    : inferredMetadata?.category || "Autre";
  const subcategory = inferredMetadata?.subcategory || "";

  const aiAmount = typeof aiExpense.montant_total === "number"
    ? aiExpense.montant_total
    : parseCurrencyAmount(String(aiExpense.montant_total ?? ""));
  const amount = aiAmount ?? extractAmount(message.body, findAmountKeywordsForMerchant(merchant));

  const description = String(aiExpense.description ?? message.subject ?? "").replace(/\s+/g, " ").trim() || message.subject.trim();
  const validationText = normalizeText(`${message.subject} ${message.sender_name} ${message.body} ${merchant} ${description} ${category}`);

  if (!merchant || UNKNOWN_PATTERN.test(normalizeText(merchant))) return null;
  if (amount === null || amount <= 0) return null;
  if (INVESTMENT_PATTERN.test(validationText)) return null;
  if (BLOCKED_CATEGORY_PATTERN.test(normalizeText(category))) return null;
  if (PROMO_PATTERN.test(validationText) && !HARD_PROOF_PATTERN.test(message.normalized_text)) return null;

  return {
    merchant,
    amount,
    category,
    subcategory,
    description,
    date: extractEmailDate(message.date),
    source: "ai",
    recurrence: String(aiExpense.recurrence ?? "").trim() || (category === "Abonnements" ? "mensuel" : undefined),
  };
}

async function updateLastSync(supabaseAdmin: any, userId: string, email: string): Promise<void> {
  await supabaseAdmin
    .from("connected_emails")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("email", email);
}

async function handleRequest(req: Request): Promise<Response> {
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Corps de requête invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedBody = RequestSchema.safeParse(requestBody);
    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: parsedBody.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = parsedBody.data;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: planData } = await supabaseAdmin
      .from("user_plans")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = planData?.plan || "free";
    const syncLimits: Record<string, number> = { free: 5, essential: 30, premium: 999 };
    const syncLimit = syncLimits[userPlan] ?? syncLimits.free;

    const { data: usageCount } = await supabaseAdmin.rpc("increment_ai_usage", {
      _user_id: user.id,
      _source: EMAIL_SOURCE,
    });

    if ((usageCount as number) > syncLimit) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: `Limite mensuelle atteinte (${syncLimit} synchronisations email/mois pour le plan ${userPlan}).`,
          plan: userPlan,
          usage: usageCount,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    const messages = await searchFinancialEmails(accessToken, MAX_SEARCH_RESULTS);
    if (messages.length === 0) {
      await updateLastSync(supabaseAdmin, user.id, email);
      return new Response(JSON.stringify({ success: true, analyzed: 0, message: "Aucun email de dépense trouvé" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gmailIds = messages.map((message) => `gmail_${message.gmail_id}`);
    const { data: existingExpenses } = await supabaseAdmin
      .from("expenses")
      .select("source_id")
      .eq("user_id", user.id)
      .in("source_id", gmailIds);

    const alreadyProcessed = new Set((existingExpenses || []).map((expense: any) => expense.source_id));
    const newMessages = messages.filter((message) => !alreadyProcessed.has(`gmail_${message.gmail_id}`));

    if (newMessages.length === 0) {
      await updateLastSync(supabaseAdmin, user.id, email);
      return new Response(JSON.stringify({ success: true, analyzed: 0, message: "Tous les emails ont déjà été analysés" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const learnedProfiles = await loadLearnedProfiles(supabaseAdmin);
    const results: any[] = [];

    for (const message of newMessages) {
      const sourceId = `gmail_${message.gmail_id}`;

      try {
        const candidate = evaluateCandidate(message);
        if (!candidate.isCandidate) {
          results.push({
            gmail_id: message.gmail_id,
            subject: message.subject,
            success: false,
            skipped: true,
            reason: candidate.reason,
          });
          continue;
        }

        const ruleResult = applyMerchantRules(message);
        if (ruleResult) {
          await insertExpense(supabaseAdmin, user.id, sourceId, ruleResult);
          await learnFromResult(supabaseAdmin, ruleResult, message);
          results.push({
            gmail_id: message.gmail_id,
            subject: message.subject,
            success: true,
            source: "rules",
            merchant: ruleResult.merchant,
            amount: ruleResult.amount,
          });
          continue;
        }

        const learnedProfile = findMatchingLearnedProfile(learnedProfiles, message);
        if (learnedProfile) {
          const learnedResult = applyLearnedProfile(learnedProfile, message);
          if (learnedResult) {
            await insertExpense(supabaseAdmin, user.id, sourceId, learnedResult);
            await learnFromResult(supabaseAdmin, learnedResult, message);
            results.push({
              gmail_id: message.gmail_id,
              subject: message.subject,
              success: true,
              source: "learned",
              merchant: learnedResult.merchant,
              amount: learnedResult.amount,
            });
            continue;
          }
        }

        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: EMAIL_SOURCE,
            raw_text: message.raw_text,
            source_id: sourceId,
            skip_usage_check: true,
          }),
        });

        const analyzeData = await readJson(analyzeRes);
        if (!analyzeRes.ok) {
          await deleteExpenseBySourceId(supabaseAdmin, user.id, sourceId);
          results.push({
            gmail_id: message.gmail_id,
            subject: message.subject,
            success: false,
            source: "ai",
            error: analyzeData.error || analyzeData.raw || `HTTP ${analyzeRes.status}`,
          });
          continue;
        }

        if (analyzeData.rejected) {
          await deleteExpenseBySourceId(supabaseAdmin, user.id, sourceId);
          results.push({
            gmail_id: message.gmail_id,
            subject: message.subject,
            success: false,
            skipped: true,
            source: "ai",
            reason: analyzeData.reason || "rejected",
          });
          continue;
        }

        const aiExpense = buildValidatedAiExpense(message, analyzeData);
        if (!aiExpense) {
          await deleteExpenseBySourceId(supabaseAdmin, user.id, sourceId);
          results.push({
            gmail_id: message.gmail_id,
            subject: message.subject,
            success: false,
            skipped: true,
            source: "ai",
            reason: "ai-validation",
          });
          continue;
        }

        await upsertExpense(supabaseAdmin, user.id, sourceId, aiExpense);
        await learnFromResult(supabaseAdmin, aiExpense, message);
        results.push({
          gmail_id: message.gmail_id,
          subject: message.subject,
          success: true,
          source: "ai",
          merchant: aiExpense.merchant,
          amount: aiExpense.amount,
        });
      } catch (error) {
        await deleteExpenseBySourceId(supabaseAdmin, user.id, sourceId);
        results.push({
          gmail_id: message.gmail_id,
          subject: message.subject,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await updateLastSync(supabaseAdmin, user.id, email);

    const successCount = results.filter((result) => result.success).length;
    const bySource = {
      rules: results.filter((result) => result.success && result.source === "rules").length,
      learned: results.filter((result) => result.success && result.source === "learned").length,
      ai: results.filter((result) => result.success && result.source === "ai").length,
      skipped: results.filter((result) => result.skipped).length,
    };

    console.info("gmail-sync summary", {
      user_id: user.id,
      email,
      total_messages: newMessages.length,
      analyzed: successCount,
      bySource,
    });

    return new Response(JSON.stringify({
      success: true,
      analyzed: successCount,
      total: results.length,
      by_source: bySource,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("gmail-sync error:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  serve(handleRequest);
}

export {
  applyLearnedProfile,
  applyMerchantRules,
  buildValidatedAiExpense,
  evaluateCandidate,
  extractAmount,
  handleRequest,
  inferMerchantFromSender,
  normalizeText,
};
