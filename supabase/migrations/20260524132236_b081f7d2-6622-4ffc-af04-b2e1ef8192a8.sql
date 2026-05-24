
-- 1) Fix has_role to actually use the _user_id parameter
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- 2) Tighten page_views INSERT to prevent user_id spoofing
DROP POLICY IF EXISTS "Anyone can track page views" ON public.page_views;
CREATE POLICY "Anyone can track page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (length(path) > 0)
  AND (length(path) <= 2000)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, document_source) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
-- has_role is kept executable since RLS policies invoke it from the authenticated role.

-- 4) Remove broad SELECT policy on storage.objects for the public 'avatars' bucket.
-- The bucket is public, so direct public URLs still work without an RLS SELECT policy.
-- Dropping this policy prevents clients from listing all avatar files.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
