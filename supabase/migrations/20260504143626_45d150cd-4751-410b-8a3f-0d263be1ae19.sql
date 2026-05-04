DROP POLICY IF EXISTS "Anyone can read maintenance mode" ON public.app_settings;
CREATE POLICY "Anyone can read maintenance mode" ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = 'maintenance_mode');