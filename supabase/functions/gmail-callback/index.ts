import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-callback`;

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");

    if (!code || !stateRaw) {
      return new Response("Invalid OAuth callback: missing code or state", { status: 400 });
    }

    // State is base64-encoded JSON from gmail-auth
    let userId: string;
    try {
      const parsed = JSON.parse(atob(stateRaw));
      userId = parsed.user_id;
      if (!userId) throw new Error("no user_id in state");
    } catch {
      return new Response("Invalid OAuth state parameter", { status: 400 });
    }

    // Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("[gmail-callback] Token exchange status:", tokenRes.status);

    if (!tokenData.access_token) {
      console.error("[gmail-callback] Token exchange failed:", JSON.stringify(tokenData));
      throw new Error(`Token exchange failed: ${tokenData.error || "no access_token"}`);
    }

    // Get user email from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const gmailEmail = profile.email;

    if (!gmailEmail) {
      throw new Error("Could not retrieve email from Google profile");
    }

    console.log("[gmail-callback] Gmail email:", gmailEmail, "for user:", userId);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Upsert connected email
    const { data: connectedEmail, error: ceError } = await supabase
      .from("connected_emails")
      .upsert(
        {
          user_id: userId,
          email: gmailEmail,
          provider: "gmail",
          status: "active",
          label: gmailEmail,
        },
        { onConflict: "user_id,email" }
      )
      .select("id")
      .single();

    if (ceError) {
      console.error("[gmail-callback] connected_emails upsert error:", ceError);
    }

    // Upsert gmail token with correct column names
    const { error: tokenError } = await supabase
      .from("gmail_tokens")
      .upsert(
        {
          user_id: userId,
          email: gmailEmail,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          connected_email_id: connectedEmail?.id || null,
        },
        { onConflict: "user_id,email" }
      );

    if (tokenError) {
      console.error("[gmail-callback] gmail_tokens upsert error:", tokenError);
      throw new Error(`Failed to save token: ${tokenError.message}`);
    }

    console.log("[gmail-callback] Successfully connected Gmail for user:", userId);

    // Redirect user back to the app
    const appUrl = "https://budgely.lovable.app/receipts?gmail=connected";
    return new Response(null, {
      status: 302,
      headers: { Location: appUrl },
    });
  } catch (err) {
    console.error("[gmail-callback] error:", err);
    const appUrl = "https://budgely.lovable.app/receipts?gmail=error";
    return new Response(null, {
      status: 302,
      headers: { Location: appUrl },
    });
  }
});
