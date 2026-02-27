-- ============================================================
-- Security fixes migration
-- ============================================================

-- 1. RESTRICT app_settings: only admins can SELECT directly
--    Server-side API routes use SUPABASE_SERVICE_ROLE_KEY to read settings.
--    The "Admins can manage settings" (FOR ALL) policy still covers admin access.
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.app_settings;

-- 2. RESTRICT profiles INSERT to matching user
--    The handle_new_user() trigger uses SECURITY DEFINER (runs as owner),
--    so it bypasses RLS and continues to work.
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. RESTRICT usage_logs INSERT to authenticated users
DROP POLICY IF EXISTS "Service can insert usage logs" ON public.usage_logs;
CREATE POLICY "Authenticated users can insert usage logs" ON public.usage_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
