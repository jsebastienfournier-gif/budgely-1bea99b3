import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Two auth modes: admin JWT or API secret key
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("MAINTENANCE_API_KEY");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let authorized = false;

    // Mode 1: API key auth (for curl / external tools)
    if (apiKey && expectedKey && apiKey === expectedKey) {
      authorized = true;
    }

    // Mode 2: JWT auth (admin user)
    if (!authorized && authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        const userId = claimsData.claims.sub;
        const { data: roleData } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (roleData) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const action = body.action; // "enable", "disable", "status", or "toggle"
    const message = body.message;

    // Get current state
    const { data: current } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    const currentValue = (current?.value as any) || { enabled: false, message: "" };

    if (action === "status") {
      return new Response(JSON.stringify({ maintenance: currentValue }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newEnabled: boolean;
    if (action === "enable") newEnabled = true;
    else if (action === "disable") newEnabled = false;
    else newEnabled = !currentValue.enabled; // toggle

    const newValue = {
      enabled: newEnabled,
      message: message ?? currentValue.message ?? "",
    };

    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq("key", "maintenance_mode");

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, maintenance: newValue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
