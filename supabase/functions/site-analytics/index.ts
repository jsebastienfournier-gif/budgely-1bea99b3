import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { days = 30 } = await req.json().catch(() => ({ days: 30 }));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const todayStr = new Date().toISOString().substring(0, 10);

    const [usersRes, pageViewsRes, documentsRes, expensesRes, viewsRes, todayViewsRes] =
      await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("page_views").select("id", { count: "exact", head: true }),
        admin.from("documents").select("id", { count: "exact", head: true }),
        admin.from("expenses").select("id", { count: "exact", head: true }),
        admin
          .from("page_views")
          .select("created_at, path")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000),
        admin
          .from("page_views")
          .select("session_id")
          .gte("created_at", todayStr + "T00:00:00Z")
          .limit(5000),
      ]);

    // Aggregate views by day
    const viewsByDay: Record<string, number> = {};
    (viewsRes.data || []).forEach((v: any) => {
      const day = v.created_at.substring(0, 10);
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    // Aggregate views by page
    const viewsByPage: Record<string, number> = {};
    (viewsRes.data || []).forEach((v: any) => {
      viewsByPage[v.path] = (viewsByPage[v.path] || 0) + 1;
    });

    const uniqueSessionsToday = new Set(
      (todayViewsRes.data || [])
        .map((s: any) => s.session_id)
        .filter(Boolean)
    ).size;

    const stats = {
      total_users: usersRes.count || 0,
      total_page_views: pageViewsRes.count || 0,
      total_documents: documentsRes.count || 0,
      total_expenses: expensesRes.count || 0,
      active_sessions_today: uniqueSessionsToday,
      views_by_day: Object.entries(viewsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      top_pages: Object.entries(viewsByPage)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
