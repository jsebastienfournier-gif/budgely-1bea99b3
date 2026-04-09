
-- 1. Restrict app_settings SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;

CREATE POLICY "Admins can read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow reading maintenance_mode for all authenticated users (needed for maintenance gate)
CREATE POLICY "Anyone can read maintenance mode"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (key = 'maintenance_mode');

-- 2. Add UPDATE policy for documents storage bucket
CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Harden has_role function to use auth.uid() internally
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  )
$$;
