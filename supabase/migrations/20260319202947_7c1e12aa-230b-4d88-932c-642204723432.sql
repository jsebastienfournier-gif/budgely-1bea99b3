
-- Add unique constraint for upsert support
ALTER TABLE public.connected_emails ADD CONSTRAINT connected_emails_user_id_email_key UNIQUE (user_id, email);
