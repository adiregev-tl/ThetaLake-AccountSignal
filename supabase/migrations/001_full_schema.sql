-- ============================================================
-- MarketPulse / Theta Lake AccountSignal — Full Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Users can update their own profile (display_name, avatar)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (e.g. change roles)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Allow inserts (needed for the trigger and service role)
CREATE POLICY "Allow profile insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Auto-create profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. APP_SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_provider TEXT NOT NULL DEFAULT 'openai'
    CHECK (default_provider IN ('openai', 'anthropic', 'gemini', 'perplexity')),
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  gemini_api_key TEXT,
  perplexity_api_key TEXT,
  openai_model TEXT DEFAULT 'gpt-4o',
  anthropic_model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  gemini_model TEXT DEFAULT 'gemini-2.5-flash',
  perplexity_model TEXT DEFAULT 'sonar-pro',
  web_search_provider TEXT DEFAULT 'none'
    CHECK (web_search_provider IN ('tavily', 'websearchapi', 'claude', 'none')),
  tavily_api_key TEXT,
  websearchapi_key TEXT,
  show_stock_chart BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- All authenticated users can READ settings (needed by /api/analyze)
CREATE POLICY "Authenticated users can read settings" ON public.app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ============================================================
-- 3. COMPANY_ANALYSES TABLE (shared analysis cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.company_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_name_lower TEXT NOT NULL UNIQUE,
  analysis_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  web_search_used BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Named foreign key constraint for the join in analyze route
-- (already created inline above, but add explicit name for the query reference)
ALTER TABLE public.company_analyses
  DROP CONSTRAINT IF EXISTS company_analyses_created_by_fkey;
ALTER TABLE public.company_analyses
  ADD CONSTRAINT company_analyses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_company_analyses_lower ON public.company_analyses(company_name_lower);
CREATE INDEX IF NOT EXISTS idx_company_analyses_created_at ON public.company_analyses(created_at DESC);

ALTER TABLE public.company_analyses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cached analyses
CREATE POLICY "Authenticated users can read analyses" ON public.company_analyses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert analyses
CREATE POLICY "Authenticated users can insert analyses" ON public.company_analyses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update analyses (for upsert)
CREATE POLICY "Authenticated users can update analyses" ON public.company_analyses
  FOR UPDATE USING (auth.uid() IS NOT NULL);


-- ============================================================
-- 4. SEARCH_HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  provider TEXT NOT NULL
    CHECK (provider IN ('openai', 'anthropic', 'gemini', 'perplexity')),
  sentiment TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON public.search_history(created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Users can manage their own history
CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON public.search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history" ON public.search_history
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 5. BOOKMARKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  provider TEXT NOT NULL
    CHECK (provider IN ('openai', 'anthropic', 'gemini', 'perplexity')),
  sentiment TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_name)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 6. USAGE_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  company_name TEXT NOT NULL,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10, 6) DEFAULT 0,
  search_provider TEXT,
  search_queries INTEGER DEFAULT 0,
  search_cost_usd DECIMAL(10, 6) DEFAULT 0,
  total_cost_usd DECIMAL(10, 6) DEFAULT 0,
  cached BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_ai_provider ON public.usage_logs(ai_provider);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage logs
CREATE POLICY "Admins can view all usage logs" ON public.usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs" ON public.usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (server-side logging)
CREATE POLICY "Service can insert usage logs" ON public.usage_logs
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- 7. COST_ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  daily_threshold DECIMAL(10, 2) DEFAULT 10.00,
  weekly_threshold DECIMAL(10, 2) DEFAULT 50.00,
  monthly_threshold DECIMAL(10, 2) DEFAULT 200.00,
  alert_email TEXT,
  alerts_enabled BOOLEAN DEFAULT TRUE,
  last_daily_alert TIMESTAMP WITH TIME ZONE,
  last_weekly_alert TIMESTAMP WITH TIME ZONE,
  last_monthly_alert TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost alerts" ON public.cost_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );


-- ============================================================
-- 8. SEED: Default app_settings row
-- ============================================================
INSERT INTO public.app_settings (
  default_provider, openai_model, anthropic_model, gemini_model, perplexity_model,
  web_search_provider, show_stock_chart
)
SELECT 'openai', 'gpt-4o', 'claude-sonnet-4-5-20250929', 'gemini-2.5-flash', 'sonar-pro',
       'none', false
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings LIMIT 1);


-- ============================================================
-- 9. SEED: Default cost_alerts row
-- ============================================================
INSERT INTO public.cost_alerts (
  alert_email, alerts_enabled
)
SELECT 'adi.regev@thetalake.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.cost_alerts LIMIT 1);
