
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 2 AND 100
  AND name !~* '(https?://|www\.)'
  AND length(email) BETWEEN 5 AND 320
  AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(btrim(message)) BETWEEN 10 AND 5000
  AND read = false
);

DROP POLICY IF EXISTS "Anyone can track page views" ON public.page_views;
CREATE POLICY "Anyone can track page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  path ~ '^/[^\s]{0,300}$'
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (user_agent IS NULL OR length(user_agent) <= 500)
  AND (session_id IS NULL OR length(session_id) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);
