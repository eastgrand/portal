/**
 * Activity Tracker Service
 *
 * Tracks user activity and persists to Supabase for admin analytics.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

export type ActivityType =
  | 'session_start'
  | 'session_end'
  | 'page_view'
  | 'ai_query'
  | 'segment_create'
  | 'segment_update'
  | 'segment_delete'
  | 'analysis_run'
  | 'export_generate'
  | 'report_generate'
  | 'api_call';

export interface ActivityData {
  page?: string;
  feature?: string;
  query?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface TrackActivityParams {
  type: ActivityType;
  data?: ActivityData;
  accountId?: string;
}

export interface UserActivityStats {
  totalSessions: number;
  totalPageViews: number;
  totalAiQueries: number;
  totalExports: number;
  lastActive: Date | null;
}

export interface AccountActivityStats {
  activeUsers: number;
  totalSessions: number;
  totalTimeMinutes: number;
  totalAiQueries: number;
  featureUsage: Record<string, number>;
}

// =============================================================================
// Activity Tracker Class
// =============================================================================

export class ActivityTracker {
  private supabase: SupabaseClient;
  private sessionStartTime: number | null = null;
  private currentSessionId: string | null = null;
  private userId: string | null = null;
  private accountId: string | null = null;
  private batchQueue: Array<{
    type: ActivityType;
    data: ActivityData;
    accountId?: string;
    timestamp: Date;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY_MS = 1000;
  private readonly BATCH_SIZE = 10;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Initialize tracker with user context
   */
  async initialize(userId: string, accountId?: string): Promise<void> {
    this.userId = userId;
    this.accountId = accountId ?? null;
    this.currentSessionId = crypto.randomUUID();
    this.sessionStartTime = Date.now();

    // Track session start
    await this.track({ type: 'session_start' });

    // Set up beforeunload handler
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.endSession();
      });
    }
  }

  /**
   * Track an activity
   */
  async track(params: TrackActivityParams): Promise<void> {
    if (!this.userId) {
      console.warn('[ActivityTracker] Not initialized, skipping track');
      return;
    }

    const activity = {
      type: params.type,
      data: params.data ?? {},
      accountId: params.accountId ?? this.accountId ?? undefined,
      timestamp: new Date(),
    };

    this.batchQueue.push(activity);

    // Flush if batch size reached
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    } else {
      // Schedule delayed flush
      this.scheduleBatchFlush();
    }
  }

  /**
   * Track a page view
   */
  async trackPageView(path: string): Promise<void> {
    await this.track({
      type: 'page_view',
      data: { page: path },
    });
  }

  /**
   * Track an AI query
   */
  async trackAiQuery(query: string, durationMs?: number): Promise<void> {
    await this.track({
      type: 'ai_query',
      data: {
        query: query.substring(0, 500), // Truncate for storage
        duration_ms: durationMs,
        feature: 'ai_assistant',
      },
    });
  }

  /**
   * Track feature usage
   */
  async trackFeature(
    feature: string,
    action: 'create' | 'update' | 'delete' | 'run' | 'generate',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const typeMap: Record<string, Record<string, ActivityType>> = {
      segment: {
        create: 'segment_create',
        update: 'segment_update',
        delete: 'segment_delete',
      },
      analysis: {
        run: 'analysis_run',
      },
      export: {
        generate: 'export_generate',
      },
      report: {
        generate: 'report_generate',
      },
    };

    const activityType = typeMap[feature]?.[action] ?? 'api_call';

    await this.track({
      type: activityType as ActivityType,
      data: {
        feature,
        metadata,
      },
    });
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.sessionStartTime) return;

    const durationMs = Date.now() - this.sessionStartTime;

    await this.track({
      type: 'session_end',
      data: {
        duration_ms: durationMs,
      },
    });

    // Flush any remaining activities
    await this.flush();

    this.sessionStartTime = null;
    this.currentSessionId = null;
  }

  /**
   * Flush batched activities to database
   */
  async flush(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const activities = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      const records = activities.map((a) => ({
        user_id: this.userId,
        account_id: a.accountId || null,
        activity_type: a.type,
        activity_data: a.data,
        created_at: a.timestamp.toISOString(),
      }));

      const { error } = await this.supabase
        .from('user_activity')
        .insert(records);

      if (error) {
        console.error('[ActivityTracker] Error flushing activities:', error);
        // Re-queue failed activities
        this.batchQueue = [...activities, ...this.batchQueue];
      }
    } catch (error) {
      console.error('[ActivityTracker] Error flushing activities:', error);
    }
  }

  /**
   * Get user activity stats for a date range
   */
  async getUserStats(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserActivityStats> {
    const { data, error } = await this.supabase
      .from('user_daily_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('[ActivityTracker] Error fetching user stats:', error);
      return {
        totalSessions: 0,
        totalPageViews: 0,
        totalAiQueries: 0,
        totalExports: 0,
        lastActive: null,
      };
    }

    interface DayStat {
      sessions_count?: number;
      page_views?: number;
      ai_queries?: number;
      exports_generated?: number;
      date: string;
    }

    interface StatsAccumulator {
      totalSessions: number;
      totalPageViews: number;
      totalAiQueries: number;
      totalExports: number;
      lastActive: string | null;
    }

    const stats = data?.reduce(
      (acc: StatsAccumulator, day: DayStat) => ({
        totalSessions: acc.totalSessions + (day.sessions_count || 0),
        totalPageViews: acc.totalPageViews + (day.page_views || 0),
        totalAiQueries: acc.totalAiQueries + (day.ai_queries || 0),
        totalExports: acc.totalExports + (day.exports_generated || 0),
        lastActive: day.date > (acc.lastActive || '') ? day.date : acc.lastActive,
      }),
      {
        totalSessions: 0,
        totalPageViews: 0,
        totalAiQueries: 0,
        totalExports: 0,
        lastActive: null as string | null,
      },
    );

    return {
      ...stats,
      lastActive: stats?.lastActive ? new Date(stats.lastActive) : null,
    };
  }

  /**
   * Get account activity stats for a date range
   */
  async getAccountStats(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AccountActivityStats> {
    const { data, error } = await this.supabase
      .from('account_daily_stats')
      .select('*')
      .eq('account_id', accountId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('[ActivityTracker] Error fetching account stats:', error);
      return {
        activeUsers: 0,
        totalSessions: 0,
        totalTimeMinutes: 0,
        totalAiQueries: 0,
        featureUsage: {},
      };
    }

    interface AccountDayStat {
      active_users?: number;
      total_sessions?: number;
      total_time_minutes?: number;
      total_ai_queries?: number;
      feature_usage?: Record<string, number>;
    }

    interface AccountStatsAccumulator {
      activeUsers: number;
      totalSessions: number;
      totalTimeMinutes: number;
      totalAiQueries: number;
      featureUsage: Record<string, number>;
    }

    // Aggregate across days
    const stats = data?.reduce(
      (acc: AccountStatsAccumulator, day: AccountDayStat) => {
        const usage = (day.feature_usage as Record<string, number>) || {};
        Object.entries(usage).forEach(([feature, count]) => {
          acc.featureUsage[feature] = (acc.featureUsage[feature] || 0) + count;
        });

        return {
          activeUsers: Math.max(acc.activeUsers, day.active_users || 0),
          totalSessions: acc.totalSessions + (day.total_sessions || 0),
          totalTimeMinutes: acc.totalTimeMinutes + (day.total_time_minutes || 0),
          totalAiQueries: acc.totalAiQueries + (day.total_ai_queries || 0),
          featureUsage: acc.featureUsage,
        };
      },
      {
        activeUsers: 0,
        totalSessions: 0,
        totalTimeMinutes: 0,
        totalAiQueries: 0,
        featureUsage: {} as Record<string, number>,
      },
    );

    return stats || {
      activeUsers: 0,
      totalSessions: 0,
      totalTimeMinutes: 0,
      totalAiQueries: 0,
      featureUsage: {},
    };
  }

  /**
   * Schedule a delayed batch flush
   */
  private scheduleBatchFlush(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY_MS);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let trackerInstance: ActivityTracker | null = null;

export function getActivityTracker(
  supabase: SupabaseClient,
): ActivityTracker {
  if (!trackerInstance) {
    trackerInstance = new ActivityTracker(supabase);
  }
  return trackerInstance;
}

export function createActivityTracker(
  supabase: SupabaseClient,
): ActivityTracker {
  return new ActivityTracker(supabase);
}
