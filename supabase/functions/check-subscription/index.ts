import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(
        JSON.stringify({ subscribed: false, plan: "free", product_id: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing
    let sub = subscriptions.data[0];
    if (!sub) {
      const trialing = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      sub = trialing.data[0];
    }

    if (!sub) {
      logStep("No active subscription");
      return new Response(
        JSON.stringify({ subscribed: false, plan: "free", product_id: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const productId = sub.items.data[0].price.product as string;
    const priceId = sub.items.data[0].price.id;

    // Debug: log raw subscription fields for date
    logStep("Raw sub fields", {
      current_period_end: sub.current_period_end,
      current_period_start: sub.current_period_start,
      ended_at: (sub as any).ended_at,
      cancel_at: (sub as any).cancel_at,
      keys: Object.keys(sub).filter(k => k.includes("period") || k.includes("end") || k.includes("cancel")),
    });

    // Handle current_period_end - may be unix timestamp (number), ISO string, or undefined
    let subscriptionEnd: string;
    const rawEnd = sub.current_period_end ?? (sub as any).currentPeriodEnd;
    if (typeof rawEnd === "number") {
      subscriptionEnd = new Date(rawEnd * 1000).toISOString();
    } else if (typeof rawEnd === "string") {
      subscriptionEnd = rawEnd;
    } else {
      // Fallback: calculate from billing interval
      subscriptionEnd = "";
    }

    // Map product to plan name
    let plan = "free";
    if (productId === "prod_UB0o8RgT872wSx") plan = "essentiel";
    if (productId === "prod_UB0o3UEzKce9M3") plan = "premium";

    logStep("Active subscription found", { plan, productId, priceId, subscriptionEnd });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        product_id: productId,
        price_id: priceId,
        subscription_end: subscriptionEnd,
        status: sub.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
