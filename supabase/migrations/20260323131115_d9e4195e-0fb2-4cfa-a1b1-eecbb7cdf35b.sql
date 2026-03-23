ALTER TABLE public.expenses ADD COLUMN source_id text;
CREATE INDEX idx_expenses_source_id ON public.expenses (source_id) WHERE source_id IS NOT NULL;