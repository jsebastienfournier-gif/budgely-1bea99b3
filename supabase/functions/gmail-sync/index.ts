import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Determine frontend origin for redirects
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // Derive frontend URL from supabase URL (project-ref.supabase.co -> project-ref based app)
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://budgely.lovable.app";

    if (error) {
      console.error("Google OAuth error:", error);
      return Response.redirect(`${frontendUrl}/receipts?gmail_error=${error}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${frontendUrl}/receipts?gmail_error=missing_params`, 302);
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const state = JSON.parse(atob(stateParam));
      userId = state.user_id;
    } catch {
      return Response.redirect(`${frontendUrl}/receipts?gmail_error=invalid_state`, 302);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
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

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${frontendUrl}/receipts?gmail_error=token_exchange_failed`, 302);
    }

    // Get user's Gmail address
    const profileResponse = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();
    const gmailAddress = profileData.emailAddress;

    if (!gmailAddress) {
      console.error("Could not get Gmail address:", profileData);
      return Response.redirect(`${frontendUrl}/receipts?gmail_error=no_email`, 302);
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
          email: gmailAddress,
          provider: "gmail",
          status: "active",
          label: "Gmail",
          last_sync_at: null,
        },
        { onConflict: "user_id,email", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert gmail_tokens
    await supabaseAdmin.from("gmail_tokens").upsert(
      {
        user_id: userId,
        email: gmailAddress,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        connected_email_id: connectedEmail?.id || null,
      },
      { onConflict: "user_id,email", ignoreDuplicates: false },
    );

    return Response.redirect(
      `${frontendUrl}/receipts?gmail_connected=true&email=${encodeURIComponent(gmailAddress)}`,
      302,
    );
  } catch (e) {
    console.error("gmail-callback error:", e);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://budgely.lovable.app";
    return Response.redirect(`${frontendUrl}/receipts?gmail_error=server_error`, 302);
  }
});
