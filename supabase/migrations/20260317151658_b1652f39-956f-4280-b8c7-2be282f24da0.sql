
-- Table for connected email accounts
CREATE TABLE public.connected_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'other',
  label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected emails"
ON public.connected_emails FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected emails"
ON public.connected_emails FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected emails"
ON public.connected_emails FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected emails"
ON public.connected_emails FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_connected_emails_updated_at
BEFORE UPDATE ON public.connected_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for connected bank accounts
CREATE TABLE public.connected_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  account_label TEXT,
  account_type TEXT DEFAULT 'checking',
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_account_id TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bank accounts"
ON public.connected_bank_accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
ON public.connected_bank_accounts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
ON public.connected_bank_accounts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
ON public.connected_bank_accounts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_connected_bank_accounts_updated_at
BEFORE UPDATE ON public.connected_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
