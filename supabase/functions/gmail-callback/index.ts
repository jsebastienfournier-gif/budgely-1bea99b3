import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userId = url.searchParams.get("state"); // passé lors du consentement

    if (!code || !userId) {
      return new Response("Invalid OAuth callback", { status: 400 });
    }

    // Échange code → tokens
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
    if (!tokenData.access_token) {
      throw new Error("Invalid Gmail token exchange");
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const gmailEmail = profile.email;

    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase.from("gmail_tokens").upsert({
      user_id: userId,
      email: gmailEmail,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

    await supabase.from("connected_emails").upsert({
      user_id: userId,
      email: gmailEmail,
      provider: "gmail",
    });

    return new Response("Gmail connected successfully 🚀", { status: 200 });
  } catch (err) {
    console.error("gmail-callback error", err);
    return new Response("OAuth failed", { status: 500 });
  }
});
