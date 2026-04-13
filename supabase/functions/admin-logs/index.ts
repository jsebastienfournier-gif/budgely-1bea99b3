import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const logType = url.searchParams.get("type") || "postgres";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const search = url.searchParams.get("search") || "";

    // Use Supabase Analytics API
    const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");

    let query = "";
    switch (logType) {
      case "auth":
        query = `select id, auth_logs.timestamp, event_message, metadata.level, metadata.status, metadata.path, metadata.msg as msg, metadata.error from auth_logs
          cross join unnest(metadata) as metadata
          ${search ? `where event_message ilike '%${search.replace(/'/g, "''")}%' or metadata.msg ilike '%${search.replace(/'/g, "''")}%'` : ""}
          order by timestamp desc
          limit ${limit}`;
        break;
      case "edge":
        query = `select id, function_edge_logs.timestamp, event_message, response.status_code, request.method, m.function_id, m.execution_time_ms from function_edge_logs
          cross join unnest(metadata) as m
          cross join unnest(m.response) as response
          cross join unnest(m.request) as request
          ${search ? `where event_message ilike '%${search.replace(/'/g, "''")}%'` : ""}
          order by timestamp desc
          limit ${limit}`;
        break;
      default: // postgres
        query = `select identifier, postgres_logs.timestamp, id, event_message, parsed.error_severity from postgres_logs
          cross join unnest(metadata) as m
          cross join unnest(m.parsed) as parsed
          ${search ? `where event_message ilike '%${search.replace(/'/g, "''")}%'` : ""}
          order by timestamp desc
          limit ${limit}`;
        break;
    }

    // Call analytics endpoint
    const analyticsRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs.all?sql=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );

    if (!analyticsRes.ok) {
      const errText = await analyticsRes.text();
      console.error("Analytics API error:", analyticsRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to fetch logs", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await analyticsRes.json();

    return new Response(JSON.stringify({ logs: data.result || data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
