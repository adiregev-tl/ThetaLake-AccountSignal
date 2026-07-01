-- ============================================================
-- Security & performance fixes (from Supabase advisor scan)
-- ============================================================


-- ============================================================
-- 1. SECURITY: Fix handle_new_user
--    - Add SET search_path = '' to prevent search-path injection
--    - Revoke direct invocation from anon/authenticated
--      (it runs via trigger as owner, not via PostgREST)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 2. SECURITY: Fix is_admin
--    - Add SET search_path = ''
--    - Revoke direct invocation from anon/authenticated
--    - Also wrap internal auth.uid() call for consistency
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 3. SECURITY: Revoke direct PostgREST access to rls_auto_enable
--    (Supabase system event-trigger function — should not be
--    callable by end-users via /rest/v1/rpc)
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 4. PERFORMANCE: Fix RLS initplan on all tables
--    Replace bare auth.uid() with (select auth.uid()) so
--    Postgres evaluates it once per query, not once per row.
--    Also merges multiple permissive SELECT/UPDATE policies on
--    profiles and usage_logs into single policies.
-- ============================================================

-- profiles — SELECT (merge user + admin into one policy)
DROP POLICY IF EXISTS "Users can view own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"    ON public.profiles;
CREATE POLICY "View own or all profiles (admin)"        ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

-- profiles — UPDATE (merge user + admin into one policy)
DROP POLICY IF EXISTS "Users can update own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"  ON public.profiles;
CREATE POLICY "Update own or all profiles (admin)"      ON public.profiles
  FOR UPDATE
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );

-- profiles — INSERT
DROP POLICY IF EXISTS "Users can insert own profile"    ON public.profiles;
CREATE POLICY "Users can insert own profile"            ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- company_analyses
DROP POLICY IF EXISTS "Authenticated users can read analyses"   ON public.company_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert analyses" ON public.company_analyses;
DROP POLICY IF EXISTS "Authenticated users can update analyses" ON public.company_analyses;
CREATE POLICY "Authenticated users can read analyses"   ON public.company_analyses
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can insert analyses" ON public.company_analyses
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update analyses" ON public.company_analyses
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

-- search_history
DROP POLICY IF EXISTS "Users can view own search history"   ON public.search_history;
DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can view own search history"   ON public.search_history
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own search history" ON public.search_history
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own search history" ON public.search_history
  FOR DELETE USING ((select auth.uid()) = user_id);

-- bookmarks
DROP POLICY IF EXISTS "Users can view own bookmarks"   ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks"   ON public.bookmarks
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING ((select auth.uid()) = user_id);

-- usage_logs — SELECT (merge admin + user into one policy)
DROP POLICY IF EXISTS "Admins can view all usage logs"      ON public.usage_logs;
DROP POLICY IF EXISTS "Users can view own usage logs"       ON public.usage_logs;
CREATE POLICY "View own or all usage logs (admin)"          ON public.usage_logs
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- usage_logs — INSERT
DROP POLICY IF EXISTS "Authenticated users can insert usage logs" ON public.usage_logs;
CREATE POLICY "Authenticated users can insert usage logs"         ON public.usage_logs
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);


-- ============================================================
-- 5. PERFORMANCE: Index on profiles.role for admin lookups
--    The admin subquery (WHERE role = 'admin') currently does
--    a seq scan on profiles. A partial index makes it fast.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role)
  WHERE role = 'admin';


-- ============================================================
-- 6. Record this migration
-- ============================================================
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('007', '007_security_and_perf_fixes')
ON CONFLICT (version) DO NOTHING;
