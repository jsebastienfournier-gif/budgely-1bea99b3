
CREATE TABLE public.merchant_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant text NOT NULL,
  normalized_name text NOT NULL,
  category text,
  subcategory text,
  patterns jsonb DEFAULT '[]'::jsonb,
  usage_count integer NOT NULL DEFAULT 1,
  confidence numeric NOT NULL DEFAULT 0.8,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(merchant)
);

ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage merchant profiles"
  ON public.merchant_profiles
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can read merchant profiles"
  ON public.merchant_profiles
  FOR SELECT
  TO authenticated
  USING (true);
