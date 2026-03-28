import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Refresh access token if expired
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

// Decode base64url-encoded string
function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return "";
  }
}

// Recursively flatten MIME parts (handles nested multipart messages)
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

const PROMO_KEYWORDS = /(offre|promo|promotion|soldes|newsletter|code promo|vente flash|bon plan|r[ée]duction|publicit[ée]|deals?)/i;
const HARD_TRANSACTION_PROOF = /(n[°º]\s*de\s*commande|num[eé]ro\s*de\s*commande|order\s*#|num[eé]ro\s*de\s*facture|facture\s*n[°º]|confirmation\s*de\s*paiement|paiement\s*(confirm[ée]|effectu[ée])|re[çc]u\s*de\s*paiement|merci\s+pour\s+votre\s+achat|total(?:\s*ttc)?\s*[:=]|montant(?:\s+pay[ée]|\s+de)\s*[:=]?)/i;
const SOFT_TRANSACTION_SIGNALS = /(facture|invoice|commande|order|paiement|payment|re[çc]u|receipt|total|ttc|montant|abonnement|pr[ée]l[eè]vement|d[ée]bit)/i;
const TRUSTED_MERCHANTS = /(amazon|bouygues|bouygues telecom|orange|sfr|free|paypal|ionos|apple|google|uber|sncf|edf|engie)/i;
const CURRENCY_PATTERN = /(\d+[.,]\d{1,2}\s*(€|eur)|€\s*\d+[.,]?\d*)/i;

function isPromotionalWithoutTransactionProof(rawText: string, subject: string, from: string): boolean {
  const text = `${subject}\n${from}\n${rawText}`.toLowerCase();

  if (!PROMO_KEYWORDS.test(text)) return false;
  if (!CURRENCY_PATTERN.test(text)) return true;
  if (HARD_TRANSACTION_PROOF.test(text)) return false;

  const hasSoftTransactionSignal = SOFT_TRANSACTION_SIGNALS.test(text);
  const hasTrustedMerchant = TRUSTED_MERCHANTS.test(text);

  return !(hasSoftTransactionSignal && hasTrustedMerchant);
}

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

// Search Gmail for financial emails
async function searchFinancialEmails(accessToken: string, maxResults = 120): Promise<any[]> {
  const includeTerms = [
    "facture", "invoice", "reçu", "receipt", "confirmation", "commande", "order",
    "paiement", "payment", "achat", "purchase", "livraison", "delivery", "expédition",
    "expedition", "prélèvement", "prelevement", "abonnement", "subscription", "montant", "amount",
    "amazon", "bouygues", "ionos", "orange", "sfr", "fnac"
  ];

  const queries = [
    `(${includeTerms.join(" OR ")}) newer_than:180d -category:social`,
    `(from:amazon OR from:amazon.fr OR from:bouygues OR from:bouyguestelecom OR from:paypal) newer_than:365d -category:social`,
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
  if (messageIds.length === 0) {
    return [];
  }

  // Fetch each message content
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

    // Extract subject, from, date
    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
    const from = headers.find((h: any) => h.name === "From")?.value || "";
    const date = headers.find((h: any) => h.name === "Date")?.value || "";

    // Extract body text - try plain text first, fall back to HTML
    let body = "";
    const allParts = flattenParts(msgData.payload);
    
    // Try text/plain first
    const textPart = allParts.find((p: any) => p.mimeType === "text/plain" && p.body?.data);
    if (textPart) {
      body = decodeBase64Url(textPart.body.data);
    }
    
    // Also get HTML and strip tags - often contains amounts not in plain text
    const htmlPart = allParts.find((p: any) => p.mimeType === "text/html" && p.body?.data);
    let htmlBody = "";
    if (htmlPart) {
      const rawHtml = decodeBase64Url(htmlPart.body.data);
      htmlBody = rawHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&euro;/g, "€")
        .replace(/&amp;/g, "&")
        .replace(/&#\d+;/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // If plain text is empty or very short, use HTML-derived text
    if (!body || body.trim().length < 50) {
      body = htmlBody;
    } else if (htmlBody && htmlBody.length > body.length) {
      // Append HTML content as it may contain amounts missing from plain text
      body = body + "\n\n--- Contenu HTML ---\n" + htmlBody;
    }
    
    // Also check top-level body
    if (!body && msgData.payload?.body?.data) {
      body = decodeBase64Url(msgData.payload.body.data);
    }

    // Truncate body to avoid oversized AI prompts
    const truncatedBody = body.substring(0, 4500);
    const rawText = `De: ${from}\nSujet: ${subject}\nDate: ${date}\n\n${truncatedBody}`;

    if (isPromotionalWithoutTransactionProof(rawText, subject, from)) {
      continue;
    }

    messages.push({
      gmail_id: messageId,
      subject,
      from,
      date,
      body: truncatedBody,
      raw_text: rawText,
    });
  }

  return messages;
}

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

    // Verify user
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

    // --- Check sync limit (1 sync = 1 usage, regardless of email count) ---
    const { data: planData } = await supabaseAdmin
      .from("user_plans")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = planData?.plan || "free";
    const SYNC_LIMITS: Record<string, number> = {
      free: 5,
      essential: 30,
      premium: 999,
    };
    const syncLimit = SYNC_LIMITS[userPlan] ?? SYNC_LIMITS.free;

    // Increment usage ONCE for this sync call
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

    // Get tokens
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

    // Refresh token if expired
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

    // Search financial emails
    const messages = await searchFinancialEmails(accessToken, 120);

    if (messages.length === 0) {
      // Update last_sync_at
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

    // Check which gmail IDs were already processed
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

    // Analyze each new email via analyze-document function
    const results = [];
    for (const msg of newMessages) {
      try {
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
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: true });
        } else {
          results.push({ gmail_id: msg.gmail_id, subject: msg.subject, success: false, error: analyzeData.error });
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

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: results.filter((r) => r.success).length,
        total: results.length,
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
