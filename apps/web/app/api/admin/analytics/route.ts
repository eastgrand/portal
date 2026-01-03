/**
 * Admin Analytics API
 *
 * GET /api/admin/analytics - Get system-wide or account analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if super admin
    const isSuperAdmin = user.user_metadata?.is_super_admin === true;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const accountId = searchParams.get('accountId');

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    if (accountId) {
      // Account-specific analytics
      const { data: accountStats, error: accountError } = await supabase
        .from('account_daily_stats')
        .select('*')
        .eq('account_id', accountId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (accountError) {
        console.error('[API] Error fetching account stats:', accountError);
        return NextResponse.json(
          { error: accountError.message },
          { status: 500 },
        );
      }

      // Get user breakdown
      const { data: userStats } = await supabase
        .from('user_daily_stats')
        .select('user_id, date, sessions_count, page_views, ai_queries')
        .eq('account_id', accountId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      // Aggregate by user
      const userAggregates = new Map<
        string,
        { sessions: number; pageViews: number; aiQueries: number }
      >();

      userStats?.forEach((stat) => {
        const existing = userAggregates.get(stat.user_id) || {
          sessions: 0,
          pageViews: 0,
          aiQueries: 0,
        };
        userAggregates.set(stat.user_id, {
          sessions: existing.sessions + (stat.sessions_count || 0),
          pageViews: existing.pageViews + (stat.page_views || 0),
          aiQueries: existing.aiQueries + (stat.ai_queries || 0),
        });
      });

      // Get user details
      const userIds = Array.from(userAggregates.keys());
      const { data: users } = await supabase.auth.admin.listUsers();

      const userDetails = users?.users
        .filter((u) => userIds.includes(u.id))
        .map((u) => ({
          id: u.id,
          email: u.email,
          ...userAggregates.get(u.id),
          lastActive: u.last_sign_in_at,
        }));

      // Calculate totals
      const totals =
        accountStats?.reduce(
          (acc, day) => ({
            activeUsers: Math.max(acc.activeUsers, day.active_users || 0),
            totalSessions: acc.totalSessions + (day.total_sessions || 0),
            totalTimeMinutes:
              acc.totalTimeMinutes + (day.total_time_minutes || 0),
            totalAiQueries: acc.totalAiQueries + (day.total_ai_queries || 0),
            totalExports: acc.totalExports + (day.total_exports || 0),
          }),
          {
            activeUsers: 0,
            totalSessions: 0,
            totalTimeMinutes: 0,
            totalAiQueries: 0,
            totalExports: 0,
          },
        ) || {};

      return NextResponse.json({
        period,
        accountId,
        totals,
        dailyStats: accountStats,
        users: userDetails,
      });
    } else {
      // System-wide analytics
      const { data: systemStats, error: systemError } = await supabase
        .from('system_daily_stats')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (systemError) {
        console.error('[API] Error fetching system stats:', systemError);
        return NextResponse.json(
          { error: systemError.message },
          { status: 500 },
        );
      }

      // Get account breakdown
      const { data: accountStats } = await supabase
        .from('account_daily_stats')
        .select('account_id, date, active_users, total_sessions, total_ai_queries')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      // Aggregate by account
      const accountAggregates = new Map<
        string,
        { activeUsers: number; sessions: number; aiQueries: number }
      >();

      accountStats?.forEach((stat) => {
        const existing = accountAggregates.get(stat.account_id) || {
          activeUsers: 0,
          sessions: 0,
          aiQueries: 0,
        };
        accountAggregates.set(stat.account_id, {
          activeUsers: Math.max(existing.activeUsers, stat.active_users || 0),
          sessions: existing.sessions + (stat.total_sessions || 0),
          aiQueries: existing.aiQueries + (stat.total_ai_queries || 0),
        });
      });

      // Get account details
      const accountIds = Array.from(accountAggregates.keys());
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, slug')
        .in('id', accountIds);

      const accountDetails = accounts?.map((a) => ({
        ...a,
        ...accountAggregates.get(a.id),
      }));

      // Calculate totals
      const totals =
        systemStats?.reduce(
          (acc, day) => ({
            totalAccounts: Math.max(acc.totalAccounts, day.total_accounts || 0),
            activeAccounts: Math.max(acc.activeAccounts, day.active_accounts || 0),
            totalUsers: Math.max(acc.totalUsers, day.total_users || 0),
            activeUsers: Math.max(acc.activeUsers, day.active_users || 0),
            totalSessions: acc.totalSessions + (day.total_sessions || 0),
            totalAiQueries: acc.totalAiQueries + (day.total_ai_queries || 0),
          }),
          {
            totalAccounts: 0,
            activeAccounts: 0,
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            totalAiQueries: 0,
          },
        ) || {};

      return NextResponse.json({
        period,
        totals,
        dailyStats: systemStats,
        accounts: accountDetails,
      });
    }
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
