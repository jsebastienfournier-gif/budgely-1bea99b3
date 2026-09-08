import type { PlanKey } from "@/lib/stripe-plans";

export type CaptureSource = "receipt" | "invoice" | "email" | "bank";

export const UNLIMITED = Infinity;

export type PlanCapability = {
  /** Sources autorisées pour cette formule */
  sources: Record<CaptureSource, boolean>;
  /** Quota mensuel par source (Infinity = illimité, 0 = interdit) */
  monthlyLimits: Record<CaptureSource, number>;
};

export const PLAN_CAPABILITIES: Record<PlanKey, PlanCapability> = {
  free: {
    sources: { receipt: true, invoice: true, email: true, bank: false },
    monthlyLimits: { receipt: UNLIMITED, invoice: UNLIMITED, email: 5, bank: 0 },
  },
  essentiel: {
    sources: { receipt: true, invoice: true, email: true, bank: true },
    monthlyLimits: { receipt: UNLIMITED, invoice: UNLIMITED, email: 5, bank: UNLIMITED },
  },
  premium: {
    sources: { receipt: true, invoice: true, email: true, bank: true },
    monthlyLimits: { receipt: UNLIMITED, invoice: UNLIMITED, email: UNLIMITED, bank: UNLIMITED },
  },
};

const capabilitiesFor = (plan: PlanKey | string | undefined): PlanCapability =>
  PLAN_CAPABILITIES[(plan as PlanKey) ?? "free"] ?? PLAN_CAPABILITIES.free;

export const canUseSource = (plan: PlanKey | string | undefined, source: CaptureSource): boolean =>
  capabilitiesFor(plan).sources[source] === true;

export const getMonthlyLimit = (plan: PlanKey | string | undefined, source: CaptureSource): number =>
  capabilitiesFor(plan).monthlyLimits[source] ?? 0;

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Découverte",
  essentiel: "Essentiel",
  premium: "Premium",
};

/**
 * Détermine l'origine réelle d'une dépense renvoyée par le backend externe.
 * Le backend peut étiqueter "email" des transactions issues de l'agrégation
 * bancaire (Powens) : on inspecte tous les champs susceptibles de la trahir.
 */
export const detectExpenseOrigin = (raw: any): CaptureSource => {
  const haystack = [
    raw?.source,
    raw?.source_type,
    raw?.provider,
    raw?.source_provider,
    raw?.origin,
    raw?.type_document,
    raw?.source?.provider,
    raw?.source?.type,
  ]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();

  if (haystack.includes("powens") || haystack.includes("bank") || haystack.includes("banc")) {
    return "bank";
  }
  if (haystack.includes("mail")) return "email";
  if (haystack.includes("invoice") || haystack.includes("facture")) return "invoice";
  if (haystack.includes("receipt") || haystack.includes("ticket")) return "receipt";
  return "email";
};
