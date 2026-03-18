
-- Source types enum
CREATE TYPE public.document_source AS ENUM ('receipt', 'invoice', 'email', 'bank');

-- Analysis status enum
CREATE TYPE public.analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Documents table: raw uploaded documents from all sources
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.document_source NOT NULL,
  file_url TEXT,
  raw_text TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status public.analysis_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Expenses table: parsed expenses from AI analysis
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  source public.document_source NOT NULL,
  type_document TEXT,
  fournisseur TEXT,
  magasin TEXT,
  montant_total NUMERIC(12,2),
  devise TEXT DEFAULT 'EUR',
  date_expense DATE,
  categorie TEXT,
  description TEXT,
  numero_facture TEXT,
  moyen_paiement TEXT,
  recurrence TEXT,
  type_depense TEXT,
  abonnement_detecte BOOLEAN DEFAULT false,
  commentaire TEXT,
  articles JSONB DEFAULT '[]'::jsonb,
  raw_ai_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Subscriptions table: detected recurring payments
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fournisseur TEXT NOT NULL,
  montant NUMERIC(12,2),
  devise TEXT DEFAULT 'EUR',
  categorie TEXT,
  recurrence TEXT DEFAULT 'mensuel',
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'actif',
  source public.document_source,
  detected_from_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI usage tracking for plan limits
CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.document_source NOT NULL,
  month_year TEXT NOT NULL, -- format: '2026-03'
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, month_year)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage" ON public.ai_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User plans table
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan" ON public.user_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plan" ON public.user_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan" ON public.user_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Function to increment AI usage and check limits
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  _user_id UUID,
  _source document_source
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month TEXT;
  _count INTEGER;
BEGIN
  _month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO ai_usage (user_id, source, month_year, usage_count)
  VALUES (_user_id, _source, _month, 1)
  ON CONFLICT (user_id, source, month_year)
  DO UPDATE SET usage_count = ai_usage.usage_count + 1, updated_at = now()
  RETURNING usage_count INTO _count;
  
  RETURN _count;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_usage_updated_at BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 10485760);

-- Storage RLS policies
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
