import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function extractAmount(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,3}(?:[ .]\d{3})*[.,]\d{2})\s*(€|eur)/gi)];
  const values = matches.map((m) => parseFloat(m[1].replace(" ", "").replace(",", "."))).filter((v) => !isNaN(v));
  return values.length ? Math.max(...values) : null;
}

function normalize(text: string) {
  return text.toLowerCase();
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { email } = await req.json();
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: token } = await supabaseAdmin
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email)
      .single();

    if (!token) throw new Error("Gmail not connected");

    const listRes = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=newer_than:365d", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    const listData = await listRes.json();
    const messages = listData.messages ?? [];

    let analyzed = 0;

    for (const { id } of messages.slice(0, 50)) {
      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });

      const msg = await msgRes.json();
      const headers = msg.payload.headers;
      const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "";

      const parts = msg.payload.parts ?? [];
      const bodyPart = parts.find((p: any) => p.mimeType === "text/plain")?.body?.data;
      const body = bodyPart ? atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")) : "";

      const amount = extractAmount(body);
      if (!amount) continue;

      await supabaseAdmin.from("expenses").upsert({
        user_id: user.id,
        source: "email",
        source_id: `gmail_${id}`,
        montant_total: amount,
        description: subject,
        devise: "EUR",
      });

      analyzed++;
    }

    return new Response(JSON.stringify({ success: true, analyzed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gmail-sync error", err);
    return new Response("Sync failed", { status: 500 });
  }
});
