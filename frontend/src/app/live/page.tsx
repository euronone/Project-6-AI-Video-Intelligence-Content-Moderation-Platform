'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Radio } from 'lucide-react';
import { StreamMonitor, type StreamSummary } from '@/components/live/StreamMonitor';
import { AlertBanner } from '@/components/live/AlertBanner';
import { apiClient } from '@/lib/api';

interface StreamListResponse {
  data: {
    items: StreamSummary[];
    total: number;
  };
}

export default function LiveStreamsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['live', 'streams'],
    queryFn: () => apiClient.get<StreamListResponse>('/live/streams'),
    select: (res) => res.data,
    refetchInterval: 10_000,
  });

  const { mutate: stopStream } = useMutation({
    mutationFn: (id: string) => apiClient.post(`/live/streams/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live', 'streams'] });
      toast.success('Stream stopped');
    },
    onError: () => toast.error('Failed to stop stream'),
  });

  return (
    <div className="space-y-0">
      {/* Live alert banner */}
      <AlertBanner />

      <div className="space-y-6 p-0 pt-6">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Streams</h1>
            <p className="text-muted-foreground">
              {data ? `${data.total} stream${data.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
        </div>

        <StreamMonitor
          streams={data?.items ?? []}
          onStop={stopStream}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
