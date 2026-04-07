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
Règles : remplis tous les champs. Les champs manquants = chaînes vides. Aucune interprétation non justifiée.
Catégories possibles : Alimentation, Transport, Logement, Santé, Loisirs, Shopping, Restauration, Éducation, Abonnements, Épargne, Investissement, Autre.`,

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
Règles : remplis tous les champs. Les champs manquants = chaînes vides. Aucune interprétation non justifiée.
Catégories possibles : Alimentation, Transport, Logement, Santé, Loisirs, Shopping, Restauration, Éducation, Abonnements, Épargne, Investissement, Autre.`,

  email: `Tu es un assistant ultra-fiable spécialisé dans l’analyse d’e-mails financiers et commerciaux afin d’identifier les dépenses réelles d’un utilisateur. Tu dois déterminer si l’e-mail correspond ou non à une transaction financière, puis extraire toutes les informations utiles. Tu DOIS être robuste aux messages bruités, HTML mal formé, pièces jointes manquantes, doublons, signatures, footer marketing et tracking.

ÉTAPE 1 — DÉTERMINER SI L’EMAIL EST UNE VRAIE DÉPENSE

REJETTE l’e-mail (renvoie {"rejected": true, "reason": "..."} ) s’il s’agit de :
- Newsletters, promotions, offres commerciales, publicités ("Offre", "Promo", "Vente flash", etc.)
- Notification logistique sans montant (colis en route, livraison prévue, confirmation d'expédition, etc.)
- Messages de fidélité sans achat (points, avantages, cumul, offres club)
- Notifications bancaires sans débit (historique, info sécurité, alerte login)
- Reçus d’estimation/ devis / brouillons non payés

ACCEPTE l’e-mail (vraie transaction) si :
- Il indique un paiement, un prélèvement, un débit, un achat, une commande, une facture ou un abonnement
- Il contient un numéro de commande / facture / transaction
- Il contient un montant explicite (5.99 €, €12.50, 19,99 EUR, etc.)
- Il provient d’un marchand connu : amazon, sncf, apple, google, paypal, bouygues, orange, sfr, free, uber, fnac, carrefour, lidl, etc.
- Il concerne un renouvellement d’abonnement (Netflix, Spotify, iCloud, etc.)
- Important : en cas de doute, ACCEPTE.

ÉTAPE 2 — EXTRACTION DES INFORMATIONS

Si l’e-mail est une vraie dépense, renvoie UNIQUEMENT un JSON strict :

{
  "rejected": false,
  "type_document": "email_financier",
  "fournisseur": "",
  "montant_total": 0,
  "devise": "",
  "date": "",
  "categorie": "",
  "recurrence": "",
  "description": "",
  "numero_facture": "",
  "numero_commande": "",
  "moyen_paiement": "",
  "abonnement_detecte": false
}

RÈGLES D’EXTRACTION (IMPORTANT)

- montant_total : NE JAMAIS laisser 0 si un montant apparaît quelque part.
  - Prendre le TOTAL TTC si disponible.
  - Gérer les formats : 5.99 €, 5,99€, €5.99, 9 EUR, 1 234,56€.
  - S’il y a plusieurs montants, choisir celui qui représente la transaction principale.
- devise : par défaut “EUR” sauf indication contraire.
- date : utiliser la date de l’e-mail si aucune date de facture n’est trouvée.
- fournisseur : toujours extraire le marchand réel (amazon, sncf, orange, etc.).
- numero_facture / numero_commande : détecter si présents.
- description : résumé clair de la transaction.
- categorie : déduire si possible (courses, restaurant, transport, télécom, services, santé, digital, abonnement, épargne, investissement, etc.)
- récurrence :
  - "mensuel" / "annuel" / "hebdomadaire" si un abonnement est détecté.
  - Sinon : "".
- abonnement_detecte :
  - true si présence de termes comme : "renouvellement", "abonnement", "subscription", "monthly bill", "your plan", "renewal".
  - Sinon false.
- moyen_paiement : détecter une carte (Visa, Mastercard, AMEX), PayPal, SEPA, prélèvement, etc. Si inconnu, laisser vide.

CONTRAINTES STRICTES

- Toujours renvoyer du JSON valide SANS texte autour.
- Ne jamais inventer des informations non présentes dans l’e-mail.
- Ne jamais halluciner des montants.
- Si plusieurs interprétations possibles → choisir la plus prudente et cohérente.
- Être tolérant au bruit, signatures, disclaimers légaux, footers, tracking, HTML cassé.

MISSION

Ton rôle est d’aider Budgely à détecter automatiquement les dépenses réelles à partir d’e-mails potentiellement confus, en renvoyant un JSON propre, fiable et complet `,

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

function parseCurrencyAmount(raw: string): number | null {
  const value = raw.trim().replace(/\s+/g, "");

  let normalized = value;
  if (value.includes(",") && value.includes(".")) {
    // 1.234,56 => 1234.56 / 1,234.56 => 1234.56
    if (value.indexOf(".") < value.indexOf(",")) {
      normalized = value.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = value.replace(/,/g, "");
    }
  } else if (value.includes(",")) {
    normalized = value.replace(",", ".");
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function extractAmountFromRawText(rawText: string): number | null {
  const text = rawText.replace(/\u00a0/g, " ");

  const keywordRegex =
    /(?:montant|total(?:\s*ttc)?|facture(?:\s*de)?|pay(?:é|e)|paiement|pr[ée]lev(?:é|e)|d[ée]bit(?:é|e)?|commande(?:\s*de)?|amount)[^\d]{0,25}(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:€|eur)/gi;
  const keywordMatches: number[] = [];
  for (const match of text.matchAll(keywordRegex)) {
    const amount = parseCurrencyAmount(match[1] ?? "");
    if (amount) keywordMatches.push(amount);
  }
  if (keywordMatches.length > 0) {
    return keywordMatches[keywordMatches.length - 1];
  }

  const genericRegex = /(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:€|eur)/gi;
  const genericMatches: number[] = [];
  for (const match of text.matchAll(genericRegex)) {
    const amount = parseCurrencyAmount(match[1] ?? "");
    if (amount) genericMatches.push(amount);
  }
  if (genericMatches.length === 0) return null;

  // Usually the total is the highest currency amount shown in transactional emails.
  return Math.max(...genericMatches);
}

function shouldOverrideRejectedEmail(rawText: string): boolean {
  const text = rawText.toLowerCase();
  const promoOnly = /(offre|promo|promotion|soldes|code promo|vente flash|bon plan|newsletter|publicit[ée]|r[ée]duction|deals?)/.test(text);
  const hardTransactionSignal = /(n°\s*de\s*commande|num[eé]ro\s*de\s*commande|order\s*#|num[eé]ro\s*de\s*facture|facture\s*n°|confirmation\s*de\s*paiement|paiement\s*confirm[ée]|re[çc]u\s*de\s*paiement|merci\s+pour\s+votre\s+achat|total\s*ttc\s*[:=]|montant\s+pay[ée]\s*[:=]?)/.test(text);
  const transactionSignal = /(commande|order|facture|invoice|reçu|receipt|total|ttc|montant|paiement|payé|abonnement|amazon|bouygues|ionos|paypal|orange|sfr|free|n°\s*de\s*commande|num[eé]ro\s*de\s*commande)/.test(text);
  const hasCurrency = /(\d+[,.]\d{1,2}\s*(€|eur)|€\s*\d+[,.]?\d*)/.test(text);

  if (!hasCurrency) return false;
  if (hardTransactionSignal) return true;
  if (promoOnly) return false;
  return transactionSignal;
}

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
    const RAILWAY_URL = "https://budgely-backend-production.up.railway.app/api/documentai/parse";

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

    const { document_id, source, raw_text, source_id, skip_usage_check } = await req.json();

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

    // Check usage (skip if called from sync functions that already counted)
    if (!skip_usage_check) {
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
    }

    // Update document status
    if (document_id) {
      await supabaseAdmin.from("documents").update({ status: "processing" }).eq("id", document_id);
    }

    // Call Railway backend
    const systemPrompt = PROMPTS[source] || PROMPTS.receipt;

    const aiResponse = await fetch(RAILWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source,
        raw_text,
        system_prompt: systemPrompt,
      }),
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("Railway backend error:", statusCode, errText);
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atteint. Réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Railway backend error: ${statusCode}`);
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

    // Check if email was rejected (promotional/non-transactional)
    const rejectionOverridden = parsed.rejected === true && shouldOverrideRejectedEmail(raw_text);
    if (parsed.rejected === true && !rejectionOverridden) {
      if (document_id) {
        await supabaseAdmin.from("documents").update({ status: "completed", error_message: `Rejeté: ${parsed.reason || "email non transactionnel"}` }).eq("id", document_id);
      }
      return new Response(JSON.stringify({ success: true, rejected: true, reason: parsed.reason || "Email non transactionnel" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rejectionOverridden) {
      parsed.rejected = false;
      parsed.reason = "Rejet IA annulé: signaux transactionnels détectés";
    }

    const aiAmount = parseCurrencyAmount(String(parsed.montant_total ?? parsed.montant ?? "")) ?? 0;
    const fallbackAmount = aiAmount > 0 ? aiAmount : extractAmountFromRawText(raw_text);

    // Store expense
    const expenseData: any = {
      user_id: user.id,
      document_id: document_id || null,
      source,
      source_id: source_id || null,
      type_document: parsed.type_document || "",
      fournisseur: parsed.fournisseur || parsed.magasin || "",
      magasin: parsed.magasin || "",
      montant_total: fallbackAmount ?? 0,
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
      raw_ai_response: {
        ...parsed,
        amount_fallback_used: aiAmount <= 0 && fallbackAmount !== null,
      },
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
        montant: fallbackAmount ?? 0,
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
