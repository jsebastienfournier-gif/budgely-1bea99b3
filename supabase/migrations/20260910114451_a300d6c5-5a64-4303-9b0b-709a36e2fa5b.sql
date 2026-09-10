-- ai_usage: only the server may create/modify usage counters
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.ai_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON public.ai_usage;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage FROM authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

-- connected_bank_accounts: users may only edit cosmetic fields
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.connected_bank_accounts;
CREATE POLICY "Users can rename their own bank accounts"
ON public.connected_bank_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.connected_bank_accounts FROM authenticated;
GRANT UPDATE (bank_name, account_label, account_type, updated_at) ON public.connected_bank_accounts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.connected_bank_accounts TO authenticated;
GRANT ALL ON public.connected_bank_accounts TO service_role;