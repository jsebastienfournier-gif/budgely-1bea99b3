
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_user_source_id 
ON public.expenses (user_id, source_id) 
WHERE source_id IS NOT NULL;
