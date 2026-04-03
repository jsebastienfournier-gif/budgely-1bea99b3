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

const MAX_MESSAGES_PER_SYNC = 100;

/* ============================================================
   UTILS
============================================================ */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9€@.\s]/g, " ")
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

function parseSender(from: string) {
  const emailMatch = from.match(/<([^>]+)>/);
  const email = (emailMatch?.[1] ?? from).trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] : "";
  const name =
    from
      .replace(/<[^>]+>/g, "")
      .replace(/["']/g, "")
      .trim() || domain;
  return { email, domain, name };
}

/* ============================================================
   HANDLER
============================================================ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    /* ---------------- AUTH ---------------- */

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

    /* ---------------- CONNECTED EMAIL ---------------- */

    const { data: connectedEmail } = await supabaseAdmin
      .from("connected_emails")
      .select("id, last_sync_at")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!connectedEmail) {
      throw new Error("Connected email not found");
    }

    /* ---------------- TOKENS ---------------- */

    const { data: token } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!token) throw new Error("Gmail not connected");

    const accessToken = token.access_token;

    /* ---------------- CURSEUR INCRÉMENTAL ---------------- */

    const afterTimestamp = connectedEmail.last_sync_at
      ? Math.floor(new Date(connectedEmail.last_sync_at).getTime() / 1000)
      : null;

    let gmailQuery = "newer_than:365d";
    if (afterTimestamp) gmailQuery += ` after:${afterTimestamp}`;

    /* ---------------- LISTE SMTP ---------------- */

    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
        gmailQuery,
      )}&maxResults=${MAX_MESSAGES_PER_SYNC}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const listData = await listRes.json();
    const messageIds: string[] = listData.messages?.map((m: any) => m.id) ?? [];

    let processed = 0;

    /* ---------------- PROCESS ---------------- */

    for (const messageId of messageIds) {
      const { data: exists } = await supabaseAdmin
        .from("expenses")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_id", `gmail_${messageId}`)
        .maybeSingle();

      if (exists) continue;

      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
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

      /* ========= FILTRES MINIMAUX (CRITIQUES) ========= */

      // 1. Bloquer crédits / gains / tirages
      if (
        bodyNorm.includes("credit") ||
        bodyNorm.includes("gagne") ||
        bodyNorm.includes("tirage") ||
        bodyNorm.includes("recompense")
      ) {
        continue;
      }

      // 2. Exiger preuve explicite de paiement
      const hasPaymentProof =
        bodyNorm.includes("€") ||
        bodyNorm.includes("eur") ||
        bodyNorm.includes("facture") ||
        bodyNorm.includes("recu") ||
        bodyNorm.includes("paiement") ||
        bodyNorm.includes("prelev");

      if (!hasPaymentProof) continue;

      const amount = extractAmount(body);
      if (amount === null || amount <= 0) continue;

      const sender = parseSender(from);

      await supabaseAdmin.from("expenses").insert({
        user_id: user.id,
        source: "email",
        source_id: `gmail_${messageId}`,
        fournisseur: sender.name || sender.domain,
        montant_total: amount,
        description: subject,
        date_expense: extractDate(date),
        devise: "EUR",
        type_document: "email_financier",
      });

      processed++;
    }

    /* ---------------- UPDATE CURSOR ---------------- */

    await supabaseAdmin
      .from("connected_emails")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connectedEmail.id);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        scanned: messageIds.length,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("gmail-sync error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
