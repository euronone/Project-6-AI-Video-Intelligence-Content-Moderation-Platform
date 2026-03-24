'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { Film, ShieldAlert, CheckCircle, Activity, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/analytics/StatCard';
import { ModerationBadge } from '@/components/moderation/ModerationBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsSummary, useViolationsData } from '@/hooks/useAnalytics';
import { useModerationQueue } from '@/hooks/useModeration';
import { useVideoList } from '@/hooks/useVideo';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';

// Lazy-load chart components to keep Recharts out of the initial bundle
const InsightChart = dynamic(
  () => import('@/components/analytics/InsightChart').then((m) => m.InsightChart),
  {
    loading: () => (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    ),
    ssr: false,
  }
);
const HeatmapOverlay = dynamic(
  () => import('@/components/analytics/HeatmapOverlay').then((m) => m.HeatmapOverlay),
  { ssr: false }
);

const from = format(subDays(new Date(), 30), 'yyyy-MM-dd');
const to = format(new Date(), 'yyyy-MM-dd');

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary({ from, to });
  const { data: violations, isLoading: violationsLoading } = useViolationsData({ from, to });
  const { data: queue, isLoading: queueLoading } = useModerationQueue({ page_size: 5, status: 'pending' });
  const { data: videos, isLoading: videosLoading } = useVideoList({ page_size: 1 });

  const greeting = user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground">
          Platform overview — last 30 days
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Videos"
          value={videosLoading ? '—' : (videos?.total ?? 0)}
          icon={Film}
          isLoading={videosLoading}
          description="All ingested videos"
        />
        <StatCard
          title="Pending Review"
          value={queueLoading ? '—' : (queue?.total ?? 0)}
          icon={ShieldAlert}
          isLoading={queueLoading}
          description="Items awaiting moderation"
        />
        <StatCard
          title="Violation Rate"
          value={summary ? `${summary.violation_rate_percent}%` : '—'}
          icon={Activity}
          isLoading={summaryLoading}
          description={
            summary
              ? `${summary.total_violations_detected} detected · ${summary.videos_rejected} rejected`
              : undefined
          }
        />
        <StatCard
          title="Approved"
          value={summaryLoading ? '—' : (summary?.videos_approved ?? 0)}
          icon={CheckCircle}
          isLoading={summaryLoading}
          description={summary ? `${summary.videos_escalated} escalated` : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InsightChart
          data={violations?.time_series}
          isLoading={violationsLoading}
          title="Violations over time (30d)"
        />
        <HeatmapOverlay
          data={violations?.breakdown}
          isLoading={violationsLoading}
        />
      </div>

      {/* Recent pending queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Recent Pending Reviews</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.moderationQueue} className="flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !queue?.items?.length ? (
            <p className="text-sm text-muted-foreground">No pending items — queue is clear.</p>
          ) : (
            <div className="divide-y">
              {queue.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {item.video_id
                        ? `Video ${item.video_id.slice(0, 8)}…`
                        : item.stream_id
                        ? `Stream ${item.stream_id.slice(0, 8)}…`
                        : item.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <ModerationBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
