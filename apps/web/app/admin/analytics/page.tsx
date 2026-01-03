'use client';

import { useEffect, useState } from 'react';

import {
  BarChart3,
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  PageBody,
  PageHeader,
  PageDescription,
  PageTitle,
} from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface SystemAnalytics {
  period: string;
  totals: {
    totalAccounts: number;
    activeAccounts: number;
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    totalAiQueries: number;
  };
  dailyStats: Array<{
    date: string;
    active_users: number;
    total_sessions: number;
    total_ai_queries: number;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    slug: string;
    activeUsers: number;
    sessions: number;
    aiQueries: number;
  }>;
}

export default function AnalyticsPage() {
  const client = useSupabase();
  const [period, setPeriod] = useState('30d');
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await client.auth.getSession();

        if (!session) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(`/api/admin/analytics?period=${period}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, [client, period]);

  return (
    <>
      <PageHeader>
        <PageTitle>Analytics</PageTitle>
        <PageDescription>
          System-wide usage analytics and user activity monitoring.
        </PageDescription>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex justify-end">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : analytics ? (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Users
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totals.activeUsers}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {analytics.totals.totalUsers} total users
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Sessions
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totals.totalSessions.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      in last {period.replace('d', ' days')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      AI Queries
                    </CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totals.totalAiQueries.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI assistant interactions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Accounts
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.totals.activeAccounts}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {analytics.totals.totalAccounts} total accounts
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Activity by Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Activity by Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.accounts && analytics.accounts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">
                            Active Users
                          </TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">
                            AI Queries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.accounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">
                              {account.name || account.slug}
                            </TableCell>
                            <TableCell className="text-right">
                              {account.activeUsers || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {(account.sessions || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {(account.aiQueries || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No activity data yet. Activity tracking will populate
                      once users start using the platform.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Daily Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.dailyStats && analytics.dailyStats.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">
                            Active Users
                          </TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">
                            AI Queries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.dailyStats
                          .slice()
                          .reverse()
                          .slice(0, 14)
                          .map((day) => (
                            <TableRow key={day.date}>
                              <TableCell className="font-medium">
                                {new Date(day.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {day.active_users || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {(day.total_sessions || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {(day.total_ai_queries || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No daily data yet. Stats will appear after the first day
                      of activity.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No analytics data available.
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
