// Empty string = relative paths (same origin). Falls back to localhost:8000
// only when the env var is completely absent (not set to "").
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000';

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL !== undefined
    ? process.env.NEXT_PUBLIC_WS_URL
    : 'http://localhost:8000';

export const API_V1 = '/api/v1';

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  analytics: '/dashboard/analytics',
  settings: '/dashboard/settings',
  profile: '/dashboard/profile',
  videos: '/videos',
  videoUpload: '/videos/upload',
  videoDetail: (id: string) => `/videos/${id}`,
  moderation: '/moderation',
  moderationQueue: '/moderation/queue',
  moderationPolicies: '/moderation/policies',
  live: '/live',
  liveStream: (id: string) => `/live/${id}`,
} as const;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export const VIOLATION_CATEGORY_LABELS: Record<string, string> = {
  violence: 'Violence',
  nudity: 'Nudity',
  drugs: 'Drugs',
  hate_symbols: 'Hate Symbols',
  spam: 'Spam',
  misinformation: 'Misinformation',
  other: 'Other',
};

export const MODERATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
};

export const VIDEO_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  flagged: 'Flagged',
  ready: 'Ready',
  failed: 'Failed',
  deleted: 'Deleted',
};
