'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type {
  ModerationQueueResponse,
  ModerationResultResponse,
  ModerationQueueParams,
  SubmitReviewRequest,
  PolicyListResponse,
  PolicyResponse,
  CreatePolicyRequest,
} from '@/types/moderation';

export const moderationKeys = {
  queue: (params: ModerationQueueParams) => ['moderation', 'queue', params] as const,
  result: (videoId: string) => ['moderation', 'result', videoId] as const,
  policies: ['moderation', 'policies'] as const,
  policy: (id: string) => ['moderation', 'policies', id] as const,
};

export function useModerationQueue(params: ModerationQueueParams = {}) {
  return useQuery({
    queryKey: moderationKeys.queue(params),
    queryFn: () =>
      apiClient.get<ModerationQueueResponse>('/moderation/queue', { params }),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useModerationResult(videoId: string) {
  return useQuery({
    queryKey: moderationKeys.result(videoId),
    queryFn: () =>
      apiClient.get<ModerationResultResponse>(`/moderation/videos/${videoId}`),
    enabled: !!videoId,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SubmitReviewRequest }) =>
      apiClient.post(`/moderation/${id}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'queue'] });
      toast.success('Review submitted');
    },
    onError: () => {
      toast.error('Failed to submit review');
    },
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: moderationKeys.policies,
    queryFn: () => apiClient.get<PolicyListResponse>('/policies'),
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: moderationKeys.policy(id),
    queryFn: () => apiClient.get<PolicyResponse>(`/policies/${id}`),
    enabled: !!id,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePolicyRequest) =>
      apiClient.post<PolicyResponse>('/policies', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.policies });
      toast.success('Policy created');
    },
    onError: () => {
      toast.error('Failed to create policy');
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreatePolicyRequest> }) =>
      apiClient.put<PolicyResponse>(`/policies/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.policies });
      toast.success('Policy updated');
    },
    onError: () => {
      toast.error('Failed to update policy');
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.policies });
      toast.success('Policy deleted');
    },
    onError: () => {
      toast.error('Failed to delete policy');
    },
  });
}

export function useTogglePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<PolicyResponse>(`/policies/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.policies });
    },
    onError: () => {
      toast.error('Failed to toggle policy');
    },
  });
}
