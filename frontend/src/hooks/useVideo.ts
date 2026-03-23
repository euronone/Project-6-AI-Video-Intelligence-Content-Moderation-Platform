'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type {
  Video,
  VideoListResponse,
  VideoListParams,
  UploadUrlRequest,
  UploadUrlResponse,
  RegisterUploadRequest,
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
    queryFn: () => apiClient.get<VideoListResponse>('/videos', { params }),
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: () => apiClient.get<Video>(`/videos/${id}`),
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
      // 1. Get presigned S3 PUT URL from backend
      const urlReq: UploadUrlRequest = {
        filename: file.name,
        content_type: file.type,
        file_size_bytes: file.size,
      };
      const urlRes = await apiClient.post<UploadUrlResponse>('/videos/upload-url', urlReq);
      // Backend returns the object directly — no .data wrapper
      const { upload_url, s3_key } = urlRes;

      // Use a client-side temp ID for progress tracking (no video_id at this stage)
      const tempId = `${file.name}-${Date.now()}`;
      addUpload({ videoId: tempId, filename: file.name, progress: 0, status: 'uploading' });

      // 2. PUT file directly to S3 using the presigned URL
      // Must send the same Content-Type that was used to sign the URL
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (e) => {
          const progress = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          updateUpload(tempId, { progress });
        },
      });

      updateUpload(tempId, { status: 'registering', progress: 100 });

      // 3. Register the video in the backend database
      const regReq: RegisterUploadRequest = {
        title: file.name,   // use filename as initial title; user can edit later
        source: 'upload',
        s3_key,             // use s3_key returned by upload-url endpoint
        content_type: file.type,
        file_size_bytes: file.size,
      };
      const video = await apiClient.post<Video>('/videos', regReq);

      updateUpload(tempId, { status: 'done' });
      return video;
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
