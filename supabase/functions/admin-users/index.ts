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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    switch (action) {
      case "list_users": {
        const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 100 });
        if (error) throw error;

        const { data: roles } = await adminClient.from("user_roles").select("*");
        const { data: profiles } = await adminClient.from("profiles").select("*");
        const { data: plans } = await adminClient.from("user_plans").select("*");

        const users = data.users.map((u) => {
          const profile = profiles?.find((p) => p.user_id === u.id);
          const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
          const userPlan = plans?.find((p) => p.user_id === u.id);
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            roles: userRoles,
            plan: userPlan?.plan || "free",
            banned: u.banned_until ? true : false,
            banned_until: u.banned_until || null,
            email_confirmed_at: u.email_confirmed_at || null,
            phone: u.phone || null,
          };
        });

        return json({ users });
      }

      case "get_user_detail": {
        const { target_user_id } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");

        const { data: { user: targetUser }, error } = await adminClient.auth.admin.getUserById(target_user_id);
        if (error) throw error;

        const { data: profile } = await adminClient.from("profiles").select("*").eq("user_id", target_user_id).maybeSingle();
        const { data: userRoles } = await adminClient.from("user_roles").select("role").eq("user_id", target_user_id);
        const { data: plan } = await adminClient.from("user_plans").select("*").eq("user_id", target_user_id).maybeSingle();
        const { data: expenses } = await adminClient.from("expenses").select("id", { count: "exact", head: true }).eq("user_id", target_user_id);
        const { data: documents } = await adminClient.from("documents").select("id", { count: "exact", head: true }).eq("user_id", target_user_id);
        const { data: subscriptions } = await adminClient.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", target_user_id);

        return json({
          user: {
            id: targetUser.id,
            email: targetUser.email,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            created_at: targetUser.created_at,
            last_sign_in_at: targetUser.last_sign_in_at,
            email_confirmed_at: targetUser.email_confirmed_at || null,
            phone: targetUser.phone || null,
            banned: targetUser.banned_until ? true : false,
            banned_until: targetUser.banned_until || null,
            roles: userRoles?.map((r) => r.role) || [],
            plan: plan?.plan || "free",
            stats: {
              expenses_count: expenses?.length ?? 0,
              documents_count: documents?.length ?? 0,
              subscriptions_count: subscriptions?.length ?? 0,
            },
          },
        });
      }

      case "update_profile": {
        const { target_user_id, full_name, avatar_url } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");

        const updates: Record<string, unknown> = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        const { error } = await adminClient
          .from("profiles")
          .update(updates)
          .eq("user_id", target_user_id);
        if (error) throw error;

        return json({ success: true });
      }

      case "update_email": {
        const { target_user_id, email } = params;
        if (!target_user_id || !email) throw new Error("Missing target_user_id or email");

        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, { email });
        if (error) throw error;

        return json({ success: true });
      }

      case "reset_password": {
        const { target_user_id, new_password, send_link } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");

        if (send_link) {
          // Get user email to send reset link
          const { data: { user: targetUser }, error: getUserErr } = await adminClient.auth.admin.getUserById(target_user_id);
          if (getUserErr || !targetUser?.email) throw new Error("Could not find user email");

          // Use generateLink to create a recovery link
          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: "recovery",
            email: targetUser.email,
            options: {
              redirectTo: `${Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app")}`,
            },
          });
          if (linkError) throw linkError;

          return json({ success: true, method: "link_sent" });
        }

        if (new_password) {
          const { error } = await adminClient.auth.admin.updateUserById(target_user_id, { password: new_password });
          if (error) throw error;
          return json({ success: true, method: "password_set" });
        }

        // Generate a random temporary password
        const tempPassword = crypto.randomUUID().slice(0, 16) + "A1!";
        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, { password: tempPassword });
        if (error) throw error;

        return json({ success: true, method: "temp_password", temp_password: tempPassword });
      }

      case "suspend_user": {
        const { target_user_id, duration } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");
        if (target_user_id === user.id) throw new Error("Cannot suspend yourself");

        let banUntil: string;
        if (duration === "permanent") {
          banUntil = "2999-12-31T23:59:59Z";
        } else {
          const days = parseInt(duration) || 30;
          const date = new Date();
          date.setDate(date.getDate() + days);
          banUntil = date.toISOString();
        }

        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: duration === "permanent" ? "876000h" : `${(parseInt(duration) || 30) * 24}h`,
        });
        if (error) throw error;

        return json({ success: true });
      }

      case "unsuspend_user": {
        const { target_user_id } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");

        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: "none",
        });
        if (error) throw error;

        return json({ success: true });
      }

      case "confirm_email": {
        const { target_user_id } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");

        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          email_confirm: true,
        });
        if (error) throw error;

        return json({ success: true });
      }

      case "set_role": {
        const { target_user_id, role, remove } = params;
        if (!target_user_id || !role) throw new Error("Missing target_user_id or role");

        if (remove) {
          await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", target_user_id)
            .eq("role", role);
        } else {
          await adminClient
            .from("user_roles")
            .upsert({ user_id: target_user_id, role }, { onConflict: "user_id,role" });
        }

        return json({ success: true });
      }

      case "reset_user_data": {
        const { target_user_id } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");
        if (target_user_id === user.id) throw new Error("Cannot reset your own data");

        // Delete expenses, documents, subscriptions, ai_usage for the user
        // Keep: profiles, connected_emails, connected_bank_accounts, gmail_tokens, microsoft_tokens
        const delExpenses = adminClient.from("expenses").delete().eq("user_id", target_user_id);
        const delDocuments = adminClient.from("documents").delete().eq("user_id", target_user_id);
        const delSubscriptions = adminClient.from("subscriptions").delete().eq("user_id", target_user_id);
        const delAiUsage = adminClient.from("ai_usage").delete().eq("user_id", target_user_id);

        const results = await Promise.all([delExpenses, delDocuments, delSubscriptions, delAiUsage]);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) throw firstError.error;

        return json({ success: true });
      }

      case "delete_user": {
        const { target_user_id } = params;
        if (!target_user_id) throw new Error("Missing target_user_id");
        if (target_user_id === user.id) throw new Error("Cannot delete yourself");

        const { error } = await adminClient.auth.admin.deleteUser(target_user_id);
        if (error) throw error;

        return json({ success: true });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
