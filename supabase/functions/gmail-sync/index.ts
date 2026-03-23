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

// Search Gmail for financial emails
async function searchFinancialEmails(accessToken: string, maxResults = 10): Promise<any[]> {
  const query = encodeURIComponent(
    "subject:(facture OR invoice OR reçu OR receipt OR confirmation OR commande OR order OR paiement OR payment) newer_than:90d"
  );

  const listRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();

  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch each message content
  const messages = [];
  for (const msg of listData.messages.slice(0, maxResults)) {
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const msgData = await msgRes.json();

    // Extract subject, from, date
    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
    const from = headers.find((h: any) => h.name === "From")?.value || "";
    const date = headers.find((h: any) => h.name === "Date")?.value || "";

    // Extract body text
    let body = "";
    if (msgData.payload?.body?.data) {
      body = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    } else if (msgData.payload?.parts) {
      const textPart = msgData.payload.parts.find(
        (p: any) => p.mimeType === "text/plain" && p.body?.data
      );
      if (textPart) {
        body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }

    // Truncate body to avoid oversized AI prompts
    const truncatedBody = body.substring(0, 3000);

    messages.push({
      gmail_id: msg.id,
      subject,
      from,
      date,
      body: truncatedBody,
      raw_text: `De: ${from}\nSujet: ${subject}\nDate: ${date}\n\n${truncatedBody}`,
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
    const messages = await searchFinancialEmails(accessToken, 10);

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
