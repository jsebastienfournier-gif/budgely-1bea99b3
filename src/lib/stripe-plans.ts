export const STRIPE_PLANS = {
  free: {
    name: "Découverte",
    product_id: null,
    prices: {},
  },
  essentiel: {
    name: "Essentiel",
    product_id: "prod_UB0o8RgT872wSx",
    prices: {
      monthly: "price_1TCembLcvqIG7XZtIyFkWimQ",
    },
  },
  premium: {
    name: "Premium",
    product_id: "prod_UB0o3UEzKce9M3",
    prices: {
      monthly: "price_1TCemuLcvqIG7XZtD51lLHnv",
      annual: "price_1TCequLcvqIG7XZtWEhSTAVJ",
    },
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
