-- Remove email duplicates when the same Railway expense is already linked to a non-email expense
DELETE FROM public.expenses email_expense
USING public.expenses kept_expense
WHERE email_expense.user_id = kept_expense.user_id
  AND email_expense.railway_id IS NOT NULL
  AND email_expense.railway_id = kept_expense.railway_id
  AND email_expense.source = 'email'
  AND kept_expense.source <> 'email';

-- Enforce one local expense per Railway id and user going forward
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_user_railway_id_unique
ON public.expenses (user_id, railway_id)
WHERE railway_id IS NOT NULL;