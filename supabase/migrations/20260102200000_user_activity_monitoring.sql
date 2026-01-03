-- User Activity Monitoring Schema
-- Tracks user activity for admin analytics dashboard

-- =============================================================================
-- Activity Log (append-only, time-series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity types:
-- 'session_start', 'session_end'
-- 'page_view'
-- 'ai_query'
-- 'segment_create', 'segment_update', 'segment_delete'
-- 'analysis_run'
-- 'export_generate'
-- 'report_generate'
-- 'api_call'

-- Indexes for common queries
CREATE INDEX idx_user_activity_user_created
  ON public.user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_account_created
  ON public.user_activity(account_id, created_at DESC);
CREATE INDEX idx_user_activity_type_created
  ON public.user_activity(activity_type, created_at DESC);
CREATE INDEX idx_user_activity_created
  ON public.user_activity(created_at DESC);

-- Partition by month for better performance (optional, for scale)
-- CREATE INDEX idx_user_activity_partition ON public.user_activity(created_at);

-- =============================================================================
-- User Daily Stats (aggregated for performance)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sessions_count INTEGER DEFAULT 0,
  time_minutes INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  ai_queries INTEGER DEFAULT 0,
  segments_created INTEGER DEFAULT 0,
  analyses_run INTEGER DEFAULT 0,
  exports_generated INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  pages_visited JSONB DEFAULT '[]',
  features_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, account_id, date)
);

CREATE INDEX idx_user_daily_stats_user_date
  ON public.user_daily_stats(user_id, date DESC);
CREATE INDEX idx_user_daily_stats_account_date
  ON public.user_daily_stats(account_id, date DESC);

-- =============================================================================
-- Account (Team) Daily Stats
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.account_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_ai_queries INTEGER DEFAULT 0,
  total_segments INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  total_exports INTEGER DEFAULT 0,
  total_reports INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  feature_usage JSONB DEFAULT '{}',
  top_users JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, date)
);

CREATE INDEX idx_account_daily_stats_account_date
  ON public.account_daily_stats(account_id, date DESC);

-- =============================================================================
-- System-wide Daily Stats (for super admin)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_accounts INTEGER DEFAULT 0,
  active_accounts INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  total_ai_queries INTEGER DEFAULT 0,
  total_exports INTEGER DEFAULT 0,
  total_reports INTEGER DEFAULT 0,
  feature_adoption JSONB DEFAULT '{}',
  top_accounts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_daily_stats_date
  ON public.system_daily_stats(date DESC);

-- =============================================================================
-- Usage Alerts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Alert types:
-- 'inactive_user' - User hasn't logged in for X days
-- 'unusual_activity' - Abnormal usage patterns
-- 'quota_warning' - Approaching usage limits
-- 'new_user' - New user joined team
-- 'feature_milestone' - First use of a feature

CREATE INDEX idx_usage_alerts_account
  ON public.usage_alerts(account_id, created_at DESC);
CREATE INDEX idx_usage_alerts_unread
  ON public.usage_alerts(account_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- User Activity: Users can only see their own activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User Activity: Service role can insert
CREATE POLICY "Service role can insert activity"
  ON public.user_activity FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User Daily Stats: Users can view own stats
CREATE POLICY "Users can view own daily stats"
  ON public.user_daily_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Account Daily Stats: Account members can view
CREATE POLICY "Account members can view account stats"
  ON public.account_daily_stats FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.accounts_memberships
      WHERE user_id = auth.uid()
    )
  );

-- System Daily Stats: Super admins only (via service role)
CREATE POLICY "Super admins can view system stats"
  ON public.system_daily_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
  );

-- Usage Alerts: Account admins can view
CREATE POLICY "Account admins can view alerts"
  ON public.usage_alerts FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT account_id FROM public.accounts_memberships
      WHERE user_id = auth.uid() AND account_role = 'owner'
    )
    OR user_id = auth.uid()
  );

-- Usage Alerts: Users can update their own alerts (mark as read)
CREATE POLICY "Users can update own alerts"
  ON public.usage_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR account_id IN (
    SELECT account_id FROM public.accounts_memberships
    WHERE user_id = auth.uid() AND account_role = 'owner'
  ))
  WITH CHECK (user_id = auth.uid() OR account_id IN (
    SELECT account_id FROM public.accounts_memberships
    WHERE user_id = auth.uid() AND account_role = 'owner'
  ));

-- =============================================================================
-- Functions for Aggregation
-- =============================================================================

-- Function to aggregate daily stats for a user
CREATE OR REPLACE FUNCTION public.aggregate_user_daily_stats(
  p_user_id UUID,
  p_account_id UUID,
  p_date DATE
) RETURNS void AS $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT
    COUNT(DISTINCT CASE WHEN activity_type = 'session_start' THEN id END) as sessions,
    COUNT(CASE WHEN activity_type = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN activity_type = 'ai_query' THEN 1 END) as ai_queries,
    COUNT(CASE WHEN activity_type = 'segment_create' THEN 1 END) as segments,
    COUNT(CASE WHEN activity_type = 'analysis_run' THEN 1 END) as analyses,
    COUNT(CASE WHEN activity_type = 'export_generate' THEN 1 END) as exports,
    COUNT(CASE WHEN activity_type = 'report_generate' THEN 1 END) as reports,
    COUNT(CASE WHEN activity_type = 'api_call' THEN 1 END) as api_calls,
    ARRAY_AGG(DISTINCT activity_data->>'page') FILTER (WHERE activity_type = 'page_view') as pages,
    ARRAY_AGG(DISTINCT activity_data->>'feature') FILTER (WHERE activity_data->>'feature' IS NOT NULL) as features
  INTO v_stats
  FROM public.user_activity
  WHERE user_id = p_user_id
    AND (p_account_id IS NULL OR account_id = p_account_id)
    AND created_at::date = p_date;

  INSERT INTO public.user_daily_stats (
    user_id, account_id, date,
    sessions_count, page_views, ai_queries,
    segments_created, analyses_run, exports_generated,
    reports_generated, api_calls, pages_visited, features_used
  ) VALUES (
    p_user_id, p_account_id, p_date,
    COALESCE(v_stats.sessions, 0),
    COALESCE(v_stats.page_views, 0),
    COALESCE(v_stats.ai_queries, 0),
    COALESCE(v_stats.segments, 0),
    COALESCE(v_stats.analyses, 0),
    COALESCE(v_stats.exports, 0),
    COALESCE(v_stats.reports, 0),
    COALESCE(v_stats.api_calls, 0),
    COALESCE(to_jsonb(v_stats.pages), '[]'::jsonb),
    COALESCE(to_jsonb(v_stats.features), '[]'::jsonb)
  )
  ON CONFLICT (user_id, account_id, date) DO UPDATE SET
    sessions_count = EXCLUDED.sessions_count,
    page_views = EXCLUDED.page_views,
    ai_queries = EXCLUDED.ai_queries,
    segments_created = EXCLUDED.segments_created,
    analyses_run = EXCLUDED.analyses_run,
    exports_generated = EXCLUDED.exports_generated,
    reports_generated = EXCLUDED.reports_generated,
    api_calls = EXCLUDED.api_calls,
    pages_visited = EXCLUDED.pages_visited,
    features_used = EXCLUDED.features_used,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate account daily stats
CREATE OR REPLACE FUNCTION public.aggregate_account_daily_stats(
  p_account_id UUID,
  p_date DATE
) RETURNS void AS $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT
    COUNT(DISTINCT user_id) as active_users,
    SUM(sessions_count) as total_sessions,
    SUM(time_minutes) as total_time,
    SUM(page_views) as total_page_views,
    SUM(ai_queries) as total_ai_queries,
    SUM(segments_created) as total_segments,
    SUM(analyses_run) as total_analyses,
    SUM(exports_generated) as total_exports,
    SUM(reports_generated) as total_reports,
    SUM(api_calls) as total_api_calls
  INTO v_stats
  FROM public.user_daily_stats
  WHERE account_id = p_account_id AND date = p_date;

  INSERT INTO public.account_daily_stats (
    account_id, date,
    active_users, total_sessions, total_time_minutes,
    total_page_views, total_ai_queries, total_segments,
    total_analyses, total_exports, total_reports, total_api_calls
  ) VALUES (
    p_account_id, p_date,
    COALESCE(v_stats.active_users, 0),
    COALESCE(v_stats.total_sessions, 0),
    COALESCE(v_stats.total_time, 0),
    COALESCE(v_stats.total_page_views, 0),
    COALESCE(v_stats.total_ai_queries, 0),
    COALESCE(v_stats.total_segments, 0),
    COALESCE(v_stats.total_analyses, 0),
    COALESCE(v_stats.total_exports, 0),
    COALESCE(v_stats.total_reports, 0),
    COALESCE(v_stats.total_api_calls, 0)
  )
  ON CONFLICT (account_id, date) DO UPDATE SET
    active_users = EXCLUDED.active_users,
    total_sessions = EXCLUDED.total_sessions,
    total_time_minutes = EXCLUDED.total_time_minutes,
    total_page_views = EXCLUDED.total_page_views,
    total_ai_queries = EXCLUDED.total_ai_queries,
    total_segments = EXCLUDED.total_segments,
    total_analyses = EXCLUDED.total_analyses,
    total_exports = EXCLUDED.total_exports,
    total_reports = EXCLUDED.total_reports,
    total_api_calls = EXCLUDED.total_api_calls,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.user_activity IS 'Append-only log of all user activity for analytics';
COMMENT ON TABLE public.user_daily_stats IS 'Aggregated daily stats per user for performance';
COMMENT ON TABLE public.account_daily_stats IS 'Aggregated daily stats per team/account';
COMMENT ON TABLE public.system_daily_stats IS 'System-wide aggregated stats for super admin';
COMMENT ON TABLE public.usage_alerts IS 'Alerts for unusual activity or milestones';
