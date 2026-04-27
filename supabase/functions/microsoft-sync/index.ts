import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-railway-jwt, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;

  const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "openid email profile Mail.Read offline_access",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Microsoft token refresh failed: ${JSON.stringify(data)}`);
  }
  return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
}

async function searchFinancialEmails(accessToken: string, maxResults = 10): Promise<any[]> {
  const filter = encodeURIComponent(
    "contains(subject,'facture') or contains(subject,'invoice') or contains(subject,'reçu') or contains(subject,'receipt') or contains(subject,'confirmation') or contains(subject,'commande') or contains(subject,'order') or contains(subject,'paiement') or contains(subject,'payment')"
  );

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=${filter}&$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,body`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  if (!data.value || data.value.length === 0) {
    return [];
  }

  return data.value.map((msg: any) => {
    const from = msg.from?.emailAddress?.address || "";
    const subject = msg.subject || "";
    const date = msg.receivedDateTime || "";
    // Strip HTML tags for plain text
    let body = (msg.body?.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    body = body.substring(0, 3000);

    return {
      ms_id: msg.id,
      subject,
      from,
      date,
      body,
      raw_text: `De: ${from}\nSujet: ${subject}\nDate: ${date}\n\n${body}`,
    };
  });
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

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("microsoft_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Compte Microsoft non connecté" }), {
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
        .from("microsoft_tokens")
        .update({ access_token: accessToken, token_expires_at: newExpiry })
        .eq("id", tokenData.id);
    }

    const messages = await searchFinancialEmails(accessToken, 5);

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

    const railwayJwt = req.headers.get("X-Railway-JWT") || req.headers.get("x-railway-jwt") || "";

    const results = [];
    for (const msg of messages) {
      try {
        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            ...(railwayJwt ? { "X-Railway-JWT": railwayJwt } : {}),
          },
          body: JSON.stringify({
            source: "email",
            raw_text: msg.raw_text,
          }),
        });

        const analyzeData = await analyzeRes.json();
        if (analyzeRes.ok) {
          results.push({ ms_id: msg.ms_id, subject: msg.subject, success: true });
        } else {
          results.push({ ms_id: msg.ms_id, subject: msg.subject, success: false, error: analyzeData.error });
        }
      } catch (err) {
        results.push({ ms_id: msg.ms_id, subject: msg.subject, success: false, error: String(err) });
      }
    }

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
    console.error("microsoft-sync error:", e);
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
