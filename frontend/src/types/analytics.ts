import type { ViolationCategory } from './moderation';

export interface AnalyticsSummary {
  processed_count: number;
  violation_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  flagged_count: number;
  rejected_count: number;
  period_start: string;
  period_end: string;
}

export interface ViolationDataPoint {
  date: string;
  count: number;
  category?: ViolationCategory;
  policy_id?: string;
}

export interface ViolationBreakdown {
  category: ViolationCategory;
  count: number;
  rate: number;
}

export interface AnalyticsSummaryResponse {
  data: AnalyticsSummary;
}

export interface ViolationsResponse {
  data: {
    time_series: ViolationDataPoint[];
    breakdown: ViolationBreakdown[];
  };
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  tenant_id?: string;
}

export interface ViolationsParams extends AnalyticsParams {
  policy_id?: string;
  category?: ViolationCategory;
}
