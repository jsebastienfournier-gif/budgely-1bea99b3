
-- Table to store Gmail OAuth tokens
CREATE TABLE public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  connected_email_id uuid REFERENCES public.connected_emails(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gmail tokens"
  ON public.gmail_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail tokens"
  ON public.gmail_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail tokens"
  ON public.gmail_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail tokens"
  ON public.gmail_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_gmail_tokens_updated_at
  BEFORE UPDATE ON public.gmail_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
