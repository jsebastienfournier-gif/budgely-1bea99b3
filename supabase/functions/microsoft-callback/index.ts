import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://budgely.lovable.app";

    if (error) {
      console.error("Microsoft OAuth error:", error);
      return Response.redirect(`${frontendUrl}/receipts?microsoft_error=${error}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${frontendUrl}/receipts?microsoft_error=missing_params`, 302);
    }

    let userId: string;
    try {
      const state = JSON.parse(atob(stateParam));
      userId = state.user_id;
    } catch {
      return Response.redirect(`${frontendUrl}/receipts?microsoft_error=invalid_state`, 302);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
    const redirectUri = `${supabaseUrl}/functions/v1/microsoft-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid email profile Mail.Read offline_access",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Microsoft token exchange failed:", tokenData);
      return Response.redirect(`${frontendUrl}/receipts?microsoft_error=token_exchange_failed`, 302);
    }

    // Get user's email from Microsoft Graph
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();
    const msEmail = profileData.mail || profileData.userPrincipalName;

    if (!msEmail) {
      console.error("Could not get Microsoft email:", profileData);
      return Response.redirect(`${frontendUrl}/receipts?microsoft_error=no_email`, 302);
    }

    // Store tokens using service role
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Upsert connected_emails record
    const { data: connectedEmail } = await supabaseAdmin
      .from("connected_emails")
      .upsert(
        {
          user_id: userId,
          email: msEmail,
          provider: "microsoft",
          status: "active",
          label: "Outlook",
          last_sync_at: null,
        },
        { onConflict: "user_id,email", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert microsoft_tokens
    await supabaseAdmin
      .from("microsoft_tokens")
      .upsert(
        {
          user_id: userId,
          email: msEmail,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          connected_email_id: connectedEmail?.id || null,
        },
        { onConflict: "user_id,email", ignoreDuplicates: false }
      );

    return Response.redirect(`${frontendUrl}/receipts?microsoft_connected=true&email=${encodeURIComponent(msEmail)}`, 302);
  } catch (e) {
    console.error("microsoft-callback error:", e);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://budgely.lovable.app";
    return Response.redirect(`${frontendUrl}/receipts?microsoft_error=server_error`, 302);
  }
});
