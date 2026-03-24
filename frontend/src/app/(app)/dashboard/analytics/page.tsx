'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Film, ShieldAlert } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/analytics/StatCard';
import { InsightChart } from '@/components/analytics/InsightChart';
import { HeatmapOverlay } from '@/components/analytics/HeatmapOverlay';
import { useAnalyticsSummary, useViolationsData } from '@/hooks/useAnalytics';
import { subDays, format } from 'date-fns';

type DateRange = '7d' | '30d' | '90d';

const ranges: Record<DateRange, { label: string; days: number }> = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('30d');

  const from = format(subDays(new Date(), ranges[range].days), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useAnalyticsSummary({ from, to });

  const {
    data: violations,
    isLoading: violationsLoading,
  } = useViolationsData({ from, to });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide moderation metrics</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ranges) as DateRange[]).map((r) => (
              <SelectItem key={r} value={r}>
                {ranges[r].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Videos Processed"
          value={summary?.total_videos_processed ?? '—'}
          icon={Film}
          isLoading={summaryLoading}
        />
        <StatCard
          title="Violation Rate"
          value={summary ? `${summary.violation_rate_percent}%` : '—'}
          icon={ShieldAlert}
          isLoading={summaryLoading}
          description={`${summary?.total_violations_detected ?? 0} detected`}
        />
        <StatCard
          title="Approved"
          value={summary?.videos_approved ?? '—'}
          icon={CheckCircle}
          isLoading={summaryLoading}
          description={`${summary?.videos_escalated ?? 0} escalated`}
        />
        <StatCard
          title="Rejected"
          value={summary?.videos_rejected ?? '—'}
          icon={XCircle}
          isLoading={summaryLoading}
          description={`${summary?.avg_confidence ? (summary.avg_confidence * 100).toFixed(0) + '% avg confidence' : ''}`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <InsightChart
          data={violations?.time_series}
          isLoading={violationsLoading}
          title="Violations over time"
        />
        <HeatmapOverlay
          data={violations?.breakdown}
          isLoading={violationsLoading}
        />
      </div>
    </div>
  );
}
