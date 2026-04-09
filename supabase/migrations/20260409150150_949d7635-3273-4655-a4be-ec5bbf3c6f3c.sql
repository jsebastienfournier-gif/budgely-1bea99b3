
-- 1. Fix user_plans: restrict INSERT/UPDATE to service_role only
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;

CREATE POLICY "Only service role can insert plans"
  ON public.user_plans FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service role can update plans"
  ON public.user_plans FOR UPDATE
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Fix app_settings: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fix contact_messages INSERT: restrict to basic validation
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) > 0 AND length(name) <= 200
    AND length(email) > 0 AND length(email) <= 320
    AND length(message) > 0 AND length(message) <= 5000
  );

-- 4. Fix page_views INSERT: restrict fields
DROP POLICY IF EXISTS "Anyone can track page views" ON public.page_views;

CREATE POLICY "Anyone can track page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(path) > 0 AND length(path) <= 2000
  );

-- 5. Fix mutable search_path on functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
