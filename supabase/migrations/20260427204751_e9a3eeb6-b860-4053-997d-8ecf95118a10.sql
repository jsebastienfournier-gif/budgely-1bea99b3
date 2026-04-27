ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS railway_id text;
CREATE INDEX IF NOT EXISTS idx_expenses_railway_id ON public.expenses(railway_id);