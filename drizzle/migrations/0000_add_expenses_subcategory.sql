ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS subcategory VARCHAR;
COMMENT ON COLUMN public.expenses.subcategory IS 'Sous-catégorie de la dépense (ex: Restauration sous Alimentation)';