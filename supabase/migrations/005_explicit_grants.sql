-- ============================================================
-- Explicit Data API grants (future-proofing for Supabase change)
--
-- From May 30, 2026: new projects require explicit GRANTs for
-- tables to be accessible via PostgREST / supabase-js.
-- From Oct 30, 2026: enforced on new tables in existing projects.
--
-- This migration makes all grants explicit so that:
--   1. Any future table added follows the same pattern.
--   2. A fresh DB restore works correctly without relying on defaults.
--
-- RLS policies (defined in 001–004) remain the actual security layer.
-- These grants simply allow PostgREST to route requests to each table.
-- ============================================================

-- Schema usage (required for PostgREST to see the schema)
GRANT USAGE ON SCHEMA public TO authenticated;

-- profiles — authenticated users can read/write their own row (RLS enforced)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- app_settings — admins manage via RLS; authenticated users read via API routes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;

-- company_analyses — shared cache; all authenticated users can read/write (RLS enforced)
GRANT SELECT, INSERT, UPDATE ON public.company_analyses TO authenticated;

-- search_history — per-user; RLS restricts to own rows
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;

-- bookmarks — per-user; RLS restricts to own rows
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;

-- usage_logs — admins see all, users see own (RLS enforced)
GRANT SELECT, INSERT ON public.usage_logs TO authenticated;

-- cost_alerts — admin-only via RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_alerts TO authenticated;
