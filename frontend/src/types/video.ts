export type VideoStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'flagged';

export type VideoSource = 'upload' | 'api' | 'live';

export interface Video {
  id: string;
  filename: string;
  title?: string;
  description?: string;
  source: VideoSource;
  status: VideoStatus;
  duration?: number;
  size?: number;
  content_type?: string;
  storage_key?: string;
  thumbnail_url?: string;
  playback_url?: string;
  tenant_id?: string;
  job_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  data: {
    items: Video[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface VideoResponse {
  data: Video;
}

export interface UploadUrlRequest {
  filename: string;
  content_type: string;
  size: number;
}

export interface UploadUrlResponse {
  data: {
    upload_url: string;
    video_id: string;
    expires_at: string;
  };
}

export interface RegisterUploadRequest {
  source: 'upload';
  storage_key: string;
  filename: string;
  content_type: string;
}

export interface RegisterUploadResponse {
  data: {
    video_id: string;
    job_id: string;
  };
}

export interface VideoListParams {
  page?: number;
  page_size?: number;
  status?: VideoStatus;
  tenant_id?: string;
}
