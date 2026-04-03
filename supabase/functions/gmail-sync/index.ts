import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

/* ===========================================================
   CONFIG / TYPES
   =========================================================== */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

/* ===========================================================
   NORMALIZATION UTILS
   =========================================================== */

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9@.\s]/g, " ")
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

/* ===========================================================
   GMAIL HELPERS
   =========================================================== */

function flattenParts(payload: any): any[] {
  if (!payload) return [];
  if (!payload.parts) return [payload];
  return payload.parts.flatMap((p: any) => (p.parts ? flattenParts(p) : p));
}

function parseSender(from: string) {
  const emailMatch = from.match(/<([^>]+)>/);
  const senderEmail = (emailMatch?.[1] ?? from).trim().toLowerCase();
  const senderDomain = senderEmail.split("@")[1] ?? "";
  const senderName =
    from
      .replace(/<[^>]+>/g, "")
      .replace(/["']/g, "")
      .trim() || senderDomain;
  return { senderEmail, senderDomain, senderName };
}

/* ===========================================================
   AMOUNT EXTRACTION
   =========================================================== */

function parseCurrencyAmount(raw: string): number | null {
  let normalized = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function extractAmount(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(€|eur)/gi)];
  const amounts = matches.map((m) => parseCurrencyAmount(m[1])).filter((v): v is number => v !== null);
  return amounts.length ? Math.max(...amounts) : null;
}

/* ===========================================================
   MERCHANT RULES (MINIMAL, SAFE SET)
   =========================================================== */

const MERCHANT_RULES = [
  { key: "amazon", merchant: "Amazon", category: "Shopping", subcategory: "E-commerce" },
  { key: "netflix", merchant: "Netflix", category: "Abonnements", subcategory: "Streaming", recurrence: "mensuel" },
  { key: "spotify", merchant: "Spotify", category: "Abonnements", subcategory: "Streaming", recurrence: "mensuel" },
  { key: "uber", merchant: "Uber", category: "Transport", subcategory: "VTC" },
];

function applyRules(message: EmailMessage): ExtractedExpense | null {
  for (const rule of MERCHANT_RULES) {
    if (message.normalized_text.includes(rule.key)) {
      const amount = extractAmount(message.body);
      if (!amount) return null;
      return {
        merchant: rule.merchant,
        amount,
        category: rule.category,
        subcategory: rule.subcategory,
        description: message.subject,
        date: extractEmailDate(message.date),
        source: "rules",
        recurrence: rule.recurrence,
      };
    }
  }
  return null;
}

function extractEmailDate(raw: string): string | null {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

/* ===========================================================
   MAIN HANDLER
   =========================================================== */

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = RequestSchema.parse(await req.json());
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: token } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", body.email)
      .single();

    if (!token) {
      return new Response(JSON.stringify({ error: "Gmail non connecté" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const listRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?q=category:purchases%20newer_than:120d",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );

    const listData = await listRes.json();
    const messages = listData.messages ?? [];

    const results = [];

    for (const { id } of messages.slice(0, 30)) {
      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });

      const msg = await msgRes.json();
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h: any) => h.name === "From")?.value ?? "";
      const date = headers.find((h: any) => h.name === "Date")?.value ?? "";

      const parts = flattenParts(msg.payload);
      const bodyText =
        decodeBase64Url(parts.find((p) => p.mimeType === "text/plain")?.body?.data) ||
        decodeBase64Url(parts.find((p) => p.mimeType === "text/html")?.body?.data);

      const sender = parseSender(from);

      const emailMessage: EmailMessage = {
        gmail_id: id,
        subject,
        from,
        date,
        body: bodyText,
        raw_text: bodyText,
        sender_email: sender.senderEmail,
        sender_domain: sender.senderDomain,
        sender_name: sender.senderName,
        normalized_text: normalizeText(`${subject} ${from} ${bodyText}`),
        normalized_sender: normalizeText(`${sender.senderEmail} ${sender.senderDomain}`),
      };

      const extracted = applyRules(emailMessage);
      if (!extracted) continue;

      await supabaseAdmin.from("expenses").upsert({
        user_id: user.id,
        source: "email",
        source_id: `gmail_${id}`,
        fournisseur: extracted.merchant,
        montant_total: extracted.amount,
        categorie: extracted.category,
        date_expense: extracted.date,
        devise: "EUR",
        description: extracted.description,
      });

      results.push({ id, merchant: extracted.merchant, amount: extracted.amount });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

serve(handleRequest);
