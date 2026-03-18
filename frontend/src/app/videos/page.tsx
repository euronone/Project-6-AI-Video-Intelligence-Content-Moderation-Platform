'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCard } from '@/components/video/VideoCard';
import { useVideoList, useDeleteVideo } from '@/hooks/useVideo';
import { ROUTES, PAGE_SIZE_DEFAULT } from '@/lib/constants';
import type { VideoStatus } from '@/types/video';

export default function VideosPage() {
  const [status, setStatus] = useState<VideoStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching } = useVideoList({
    page,
    page_size: PAGE_SIZE_DEFAULT,
    status: status === 'all' ? undefined : status,
  });

  const { mutate: deleteVideo } = useDeleteVideo();

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE_DEFAULT) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">
            {data ? `${data.total} video${data.total !== 1 ? 's' : ''}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh" disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href={ROUTES.videoUpload}>
              <Plus className="mr-2 h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as VideoStatus | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load videos.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No videos found.</p>
          <Button asChild className="mt-4">
            <Link href={ROUTES.videoUpload}>Upload your first video</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.items.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={deleteVideo} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
