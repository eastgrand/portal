import { createAnalyticsManager } from './analytics-manager';
import { NullAnalyticsService } from './null-analytics-service';
import type { AnalyticsManager } from './types';

export const analytics: AnalyticsManager = createAnalyticsManager({
  providers: {
    null: () => NullAnalyticsService,
  },
});

// Activity tracking for admin analytics
export {
  ActivityTracker,
  getActivityTracker,
  createActivityTracker,
} from './activity-tracker';

export type {
  ActivityType,
  ActivityData,
  TrackActivityParams,
  UserActivityStats,
  AccountActivityStats,
} from './activity-tracker';
