'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type {
  VideoListResponse,
  VideoResponse,
  VideoListParams,
  UploadUrlRequest,
  UploadUrlResponse,
  RegisterUploadRequest,
  RegisterUploadResponse,
} from '@/types/video';
import { useVideoStore } from '@/stores/videoStore';

export const videoKeys = {
  all: ['videos'] as const,
  list: (params: VideoListParams) => ['videos', 'list', params] as const,
  detail: (id: string) => ['videos', 'detail', id] as const,
};

export function useVideoList(params: VideoListParams = {}) {
  return useQuery({
    queryKey: videoKeys.list(params),
    queryFn: () =>
      apiClient.get<VideoListResponse>('/videos', { params }),
    select: (res) => res.data,
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => apiClient.get<VideoResponse>(`/videos/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
      toast.success('Video deleted');
    },
    onError: () => {
      toast.error('Failed to delete video');
    },
  });
}

export function useUploadVideo() {
  const queryClient = useQueryClient();
  const { addUpload, updateUpload } = useVideoStore();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      // 1. Get presigned upload URL
      const urlReq: UploadUrlRequest = {
        filename: file.name,
        content_type: file.type,
        size: file.size,
      };
      const urlRes = await apiClient.post<UploadUrlResponse>('/videos/upload-url', urlReq);
      const { upload_url, video_id } = urlRes.data;

      // Track upload
      addUpload({ videoId: video_id, filename: file.name, progress: 0, status: 'uploading' });

      // 2. Upload file directly to S3 presigned URL
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (e) => {
          const progress = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          updateUpload(video_id, { progress });
        },
      });

      updateUpload(video_id, { status: 'registering', progress: 100 });

      // 3. Register upload with backend
      const s3Key = new URL(upload_url).pathname.slice(1);
      const regReq: RegisterUploadRequest = {
        source: 'upload',
        storage_key: s3Key,
        filename: file.name,
        content_type: file.type,
      };
      const regRes = await apiClient.post<RegisterUploadResponse>('/videos', regReq);

      updateUpload(video_id, { status: 'done' });
      return regRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: videoKeys.all });
      toast.success('Video uploaded and queued for processing');
    },
    onError: () => {
      toast.error('Upload failed. Please try again.');
    },
  });
}
