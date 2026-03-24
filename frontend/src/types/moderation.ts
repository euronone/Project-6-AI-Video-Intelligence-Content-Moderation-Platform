export type ModerationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

export type ViolationCategory =
  | 'violence'
  | 'nudity'
  | 'drugs'
  | 'hate_symbols'
  | 'spam'
  | 'misinformation'
  | 'other';

export type ReviewAction = 'approve' | 'reject' | 'escalate';

export type PolicyAction = 'block' | 'flag' | 'allow';

export interface Violation {
  id: string;
  category: ViolationCategory;
  timestamp_seconds?: number;
  confidence: number;
  snippet?: string;
  frame_url?: string;
  details?: Record<string, unknown>;
}

export interface ModerationReport {
  violations: Violation[];
  recommended_action: ReviewAction;
  policy_id?: string;
  summary?: string;
  processed_at: string;
}

export interface ModerationQueueItem {
  id: string;
  video_id?: string;
  stream_id?: string;
  status: ModerationStatus;
  priority: number;
  report?: ModerationReport;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationQueueResponse {
  items: ModerationQueueItem[];
  total: number;
  page: number;
  page_size: number;
}

export type ModerationResultResponse = ModerationQueueItem;

export interface SubmitReviewRequest {
  action: ReviewAction;
  notes?: string;
}

export interface PolicyRule {
  category: ViolationCategory;
  threshold: number;
  action: PolicyAction;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  rules: PolicyRule[] | null;
  default_action: PolicyAction;
  owner_id: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyListResponse {
  items: Policy[];
  total: number;
}

export type PolicyResponse = Policy;

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  rules?: PolicyRule[];
  default_action?: PolicyAction;
}

export interface ModerationQueueParams {
  page?: number;
  page_size?: number;
  status?: ModerationStatus;
  priority?: number;
}
