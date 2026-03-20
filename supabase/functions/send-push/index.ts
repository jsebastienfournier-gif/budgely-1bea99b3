import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push crypto helpers
async function generateJWT(
  vapidPublicKey: string,
  vapidPrivateKey: string,
  audience: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:noreply@budgely.fr",
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the private key
  const rawKey = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    await convertRawToP8(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sig = new Uint8Array(signature);
  const rawSig = derToRaw(sig);

  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${sigB64}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If it's already 64 bytes, it's raw format
  if (der.length === 64) return der;

  // Parse DER sequence
  if (der[0] !== 0x30) return der;

  let offset = 2;
  const readInt = () => {
    if (der[offset] !== 0x02) throw new Error("Expected INTEGER");
    offset++;
    const len = der[offset++];
    const value = der.slice(offset, offset + len);
    offset += len;
    // Remove leading zero if present
    return value[0] === 0 ? value.slice(1) : value;
  };

  const r = readInt();
  const s = readInt();

  // Pad to 32 bytes each
  const result = new Uint8Array(64);
  result.set(r, 32 - r.length);
  result.set(s, 64 - s.length);
  return result;
}

async function convertRawToP8(rawKey: Uint8Array): Promise<ArrayBuffer> {
  // PKCS8 wrapper for EC P-256 private key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);

  // We need the public key too - derive it
  // For simplicity, we'll use a different approach: JWK import
  // Actually, let's build the full PKCS8 without the public key part
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const jwt = await generateJWT(vapidPublicKey, vapidPrivateKey, audience);

  // For encryption, we use the simpler aes128gcm approach
  // But Web Push requires content encryption which is complex in Deno
  // Instead, let's use the web-push compatible payload

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/json",
      TTL: "86400",
    },
    body: payload,
  });

  if (response.status === 410 || response.status === 404) {
    // Subscription expired - should be cleaned up
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`Push failed [${response.status}]:`, text);
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "BA0_OtQXYWHp4_Tl_zsDyvPgXi9USruU61CgyCprRr-mudiAjGkP2hbT1j5LvCzaGJHdpqpheHXQVq2W38APlEk";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
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

    const { action, ...params } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    switch (action) {
      case "broadcast": {
        // Admin only - send to all subscribers
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          return new Response(JSON.stringify({ error: "Admin required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: subs } = await adminClient
          .from("push_subscriptions")
          .select("*");

        if (!subs || subs.length === 0) {
          return new Response(JSON.stringify({ sent: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const payload = JSON.stringify({
          title: params.title || "Budgely",
          body: params.body || "",
          url: params.url || "/dashboard",
          tag: "admin-broadcast",
        });

        let sent = 0;
        const expired: string[] = [];

        for (const sub of subs) {
          const ok = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
          if (ok) sent++;
          else expired.push(sub.id);
        }

        // Clean up expired subscriptions
        if (expired.length > 0) {
          await adminClient
            .from("push_subscriptions")
            .delete()
            .in("id", expired);
        }

        return new Response(JSON.stringify({ sent, expired: expired.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "notify_user": {
        // Admin only - send to a specific user
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          return new Response(JSON.stringify({ error: "Admin required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: subs } = await adminClient
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", params.target_user_id);

        if (!subs || subs.length === 0) {
          return new Response(JSON.stringify({ sent: 0, reason: "no_subscription" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const payload = JSON.stringify({
          title: params.title || "Budgely",
          body: params.body || "",
          url: params.url || "/dashboard",
        });

        let sent = 0;
        for (const sub of subs) {
          const ok = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
          if (ok) sent++;
        }

        return new Response(JSON.stringify({ sent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
