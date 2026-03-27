import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: { receipt: 999, invoice: 999, email: 5, bank: 0 },
  essential: { receipt: 999, invoice: 999, email: 15, bank: 999 },
  premium: { receipt: 999, invoice: 999, email: 999, bank: 999 },
};

const PROMPTS: Record<string, string> = {
  receipt: `Tu es un assistant spécialisé dans l'analyse de tickets de caisse. 
Analyse le texte suivant et renvoie UNIQUEMENT un JSON strict avec ces champs :
{
  "type_document": "ticket_de_caisse",
  "magasin": "",
  "date": "",
  "montant_total": 0,
  "devise": "EUR",
  "categorie": "",
  "articles": [{"nom": "", "quantite": 1, "prix_unitaire": 0, "prix_total": 0}]
}
Règles : remplis tous les champs. Les champs manquants = chaînes vides. Aucune interprétation non justifiée.`,

  invoice: `Tu es un assistant spécialisé dans l'analyse de factures.
Analyse le texte suivant et renvoie UNIQUEMENT un JSON strict avec ces champs :
{
  "type_document": "facture",
  "fournisseur": "",
  "montant_total": 0,
  "devise": "EUR",
  "date_facture": "",
  "date_echeance": "",
  "categorie": "",
  "recurrence": "",
  "numero_facture": "",
  "periode_couverte": "",
  "details": ""
}
Règles : remplis tous les champs. Les champs manquants = chaînes vides. Aucune interprétation non justifiée.`,

  email: `Tu es un assistant spécialisé dans l'extraction de données financières à partir d'emails.
Analyse attentivement le texte suivant et extrais les informations de paiement/dépense.
Renvoie UNIQUEMENT un JSON strict avec ces champs :
{
  "type_document": "",
  "fournisseur": "",
  "montant_total": 0,
  "devise": "EUR",
  "date": "",
  "categorie": "",
  "recurrence": "",
  "description": "",
  "numero_facture": "",
  "moyen_paiement": "",
  "abonnement_detecte": false
}
Règles IMPORTANTES :
- montant_total est LE CHAMP LE PLUS IMPORTANT. Tu DOIS absolument trouver le montant dans le texte.
- Cherche partout : sujet de l'email, tableaux, récapitulatifs, lignes de total, pied de page.
- Cherche des patterns comme "Total", "Montant", "Amount", "Prix", "€", "$", "TTC", "HT", tout nombre suivi ou précédé d'un symbole de devise.
- Exemples de patterns à détecter : "5,99 €", "€5.99", "Total : 12,50€", "montant de 3,00 EUR", "29.99 EUR/mois".
- Si tu vois "5,99" ou "3,00" ou "12.50" ce sont des montants. Utilise le point comme séparateur décimal dans ta réponse (ex: 5.99 et non 5,99).
- ATTENTION aux emails de notification (ex: "Votre facture est disponible") : même si l'email dit de consulter la facture en ligne, cherche quand même un montant dans le corps ou le sujet. Si le sujet contient un montant (ex: "Facture Bouygues 15,99€"), extrais-le.
- Pour les opérateurs télécom (Bouygues, Orange, SFR, Free), le montant est souvent dans le sujet ou dans une phrase comme "montant de X€" ou "d'un montant de X,XX €".
- Ne JAMAIS laisser montant_total à 0 si un montant est visible quelque part dans le texte, le sujet ou les en-têtes.
- Si plusieurs montants existent, prends le total TTC.
- type_document peut être : facture, reçu, abonnement, renouvellement, confirmation_commande, notification_paiement.
- fournisseur : nom de l'entreprise/service qui envoie l'email.
- date : date du paiement ou de la facture au format YYYY-MM-DD.
- abonnement_detecte : true si c'est un paiement récurrent (abonnement, renouvellement).
- recurrence : mensuel, annuel, trimestriel, ou vide si pas récurrent.
- Champs manquants = chaînes vides, sauf montant_total qui doit être 0 uniquement si AUCUN montant n'est trouvé NULLE PART dans le texte (sujet inclus).`,

  bank: `Tu es un assistant spécialisé dans l'analyse de transactions bancaires.
Analyse les transactions suivantes et renvoie UNIQUEMENT un JSON strict avec ces champs pour CHAQUE transaction :
[{
  "type_document": "transaction_bancaire",
  "categorie": "",
  "fournisseur": "",
  "recurrence": "",
  "commentaire": "",
  "type_depense": "",
  "abonnement_detecte": false
}]
Règles : catégorise intelligemment, détecte abonnements et récurrences. Champs manquants = chaînes vides.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auth client to get user
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { document_id, source, raw_text, source_id } = await req.json();

    if (!source || !raw_text) {
      return new Response(JSON.stringify({ error: "source et raw_text requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user plan
    const { data: planData } = await supabaseAdmin
      .from("user_plans")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const userPlan = planData?.plan || "free";
    const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
    const sourceLimit = limits[source] ?? 0;

    if (sourceLimit === 0) {
      return new Response(
        JSON.stringify({ error: "limit_reached", message: "Cette fonctionnalité nécessite un abonnement supérieur.", plan: userPlan }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage
    const { data: usageCount } = await supabaseAdmin.rpc("increment_ai_usage", {
      _user_id: user.id,
      _source: source,
    });

    if (usageCount > sourceLimit) {
      return new Response(
        JSON.stringify({ error: "limit_reached", message: `Limite mensuelle atteinte (${sourceLimit} analyses ${source}/mois).`, plan: userPlan, usage: usageCount }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status
    if (document_id) {
      await supabaseAdmin.from("documents").update({ status: "processing" }).eq("id", document_id);
    }

    // Call Lovable AI
    const systemPrompt = PROMPTS[source] || PROMPTS.receipt;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: raw_text },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atteint. Réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez le support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", statusCode, errText);
      throw new Error(`AI gateway error: ${statusCode}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsed: any;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      if (document_id) {
        await supabaseAdmin.from("documents").update({ status: "failed", error_message: "Échec du parsing IA" }).eq("id", document_id);
      }
      return new Response(JSON.stringify({ error: "Échec de l'analyse IA", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store expense
    const expenseData: any = {
      user_id: user.id,
      document_id: document_id || null,
      source,
      source_id: source_id || null,
      type_document: parsed.type_document || "",
      fournisseur: parsed.fournisseur || parsed.magasin || "",
      magasin: parsed.magasin || "",
      montant_total: parseFloat(parsed.montant_total || parsed.montant || 0),
      devise: parsed.devise || "EUR",
      date_expense: parsed.date || parsed.date_facture || null,
      categorie: parsed.categorie || "",
      description: parsed.description || parsed.details || "",
      numero_facture: parsed.numero_facture || "",
      moyen_paiement: parsed.moyen_paiement || "",
      recurrence: parsed.recurrence || "",
      type_depense: parsed.type_depense || "",
      abonnement_detecte: parsed.abonnement_detecte || false,
      commentaire: parsed.commentaire || "",
      articles: parsed.articles || [],
      raw_ai_response: parsed,
    };

    const { data: expense, error: insertError } = await supabaseAdmin
      .from("expenses")
      .insert(expenseData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert expense error:", insertError);
      throw new Error("Erreur lors de l'enregistrement");
    }

    // Create subscription if detected
    if (parsed.abonnement_detecte || (parsed.recurrence && parsed.recurrence !== "" && parsed.recurrence !== "aucune")) {
      await supabaseAdmin.from("subscriptions").insert({
        user_id: user.id,
        fournisseur: parsed.fournisseur || parsed.magasin || "Inconnu",
        montant: parseFloat(parsed.montant_total || parsed.montant || 0),
        devise: parsed.devise || "EUR",
        categorie: parsed.categorie || "",
        recurrence: parsed.recurrence || "mensuel",
        source,
        detected_from_document_id: document_id || null,
      });
    }

    // Update document status
    if (document_id) {
      await supabaseAdmin.from("documents").update({ status: "completed" }).eq("id", document_id);
    }

    return new Response(JSON.stringify({ success: true, expense, parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
