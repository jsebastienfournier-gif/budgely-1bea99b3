// Normalisation et couleurs des catégories de dépenses

const CANONICAL: Record<string, string> = {
  alimentation: "Alimentation",
  courses: "Alimentation",
  restauration: "Alimentation",
  restaurants: "Alimentation",
  restaurant: "Alimentation",
  transport: "Transport",
  transports: "Transport",
  logement: "Logement",
  sante: "Santé",
  santé: "Santé",
  loisirs: "Loisirs",
  loisir: "Loisirs",
  shopping: "Shopping",
  education: "Éducation",
  éducation: "Éducation",
  abonnements: "Abonnements",
  abonnement: "Abonnements",
  epargne: "Épargne & Investissement",
  épargne: "Épargne & Investissement",
  investissement: "Épargne & Investissement",
  "épargne & investissement": "Épargne & Investissement",
  "epargne & investissement": "Épargne & Investissement",
  divers: "Autre",
  mixte: "Autre",
  autre: "Autre",
  autres: "Autre",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "hsl(142, 71%, 45%)",
  Transport: "hsl(221, 83%, 53%)",
  Logement: "hsl(262, 60%, 55%)",
  Loisirs: "hsl(25, 90%, 55%)",
  Santé: "hsl(340, 70%, 55%)",
  Shopping: "hsl(320, 65%, 55%)",
  "Éducation": "hsl(45, 90%, 50%)",
  Abonnements: "hsl(250, 60%, 55%)",
  "Épargne & Investissement": "hsl(170, 60%, 45%)",
  Autre: "hsl(215, 16%, 47%)",
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  Alimentation: "🛒",
  Transport: "🚗",
  Logement: "🏠",
  Santé: "💊",
  Loisirs: "🎭",
  Shopping: "🛍️",
  "Éducation": "🎓",
  Abonnements: "📦",
  "Épargne & Investissement": "💰",
  Autre: "📌",
};

// Palette de secours pour toute catégorie inconnue (couleur stable par nom)
const FALLBACK_COLORS = [
  "hsl(190, 70%, 45%)",
  "hsl(15, 75%, 55%)",
  "hsl(280, 55%, 58%)",
  "hsl(95, 50%, 45%)",
  "hsl(355, 65%, 58%)",
  "hsl(210, 45%, 45%)",
];

export function normalizeCategory(cat?: string | null): string {
  const raw = (cat || "").trim();
  if (!raw) return "Autre";
  const key = raw.toLowerCase();
  if (CANONICAL[key]) return CANONICAL[key];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getCategoryColor(cat: string): string {
  const name = normalizeCategory(cat);
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 9973;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function getCategoryEmoji(cat: string): string {
  return CATEGORY_EMOJIS[normalizeCategory(cat)] || "📌";
}
