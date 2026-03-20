
CREATE TABLE public.microsoft_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  connected_email_id uuid REFERENCES public.connected_emails(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

ALTER TABLE public.microsoft_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own microsoft tokens" ON public.microsoft_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own microsoft tokens" ON public.microsoft_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own microsoft tokens" ON public.microsoft_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own microsoft tokens" ON public.microsoft_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
