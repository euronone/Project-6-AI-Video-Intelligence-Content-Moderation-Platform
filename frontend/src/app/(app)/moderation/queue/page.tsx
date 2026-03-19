'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ModerationBadge } from '@/components/moderation/ModerationBadge';
import { ReviewPanel } from '@/components/moderation/ReviewPanel';
import { useModerationQueue } from '@/hooks/useModeration';
import { useModerationStore } from '@/stores/moderationStore';
import { formatDistanceToNow } from 'date-fns';
import { PAGE_SIZE_DEFAULT } from '@/lib/constants';
import type { ModerationStatus } from '@/types/moderation';

export default function ModerationQueuePage() {
  const [page, setPage] = useState(1);
  const { queueFilter, setQueueFilter, selectedQueueItemId, selectQueueItem } =
    useModerationStore();

  const { data, isLoading, isError, refetch, isFetching } = useModerationQueue({
    page,
    page_size: PAGE_SIZE_DEFAULT,
    status: queueFilter === 'all' ? undefined : (queueFilter as ModerationStatus),
  });

  const selectedItem = data?.items.find((i) => i.id === selectedQueueItemId);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE_DEFAULT) : 1;

  return (
    <div className="flex h-full gap-0">
      {/* Main table */}
      <div className="flex flex-1 flex-col space-y-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moderation Queue</h1>
            <p className="text-muted-foreground">
              {data ? `${data.total} item${data.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filter */}
        <Select
          value={queueFilter}
          onValueChange={(v) => {
            setQueueFilter(v as ModerationStatus | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load queue.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No items in queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      data-state={selectedQueueItemId === item.id ? 'selected' : undefined}
                      onClick={() =>
                        selectQueueItem(selectedQueueItemId === item.id ? null : item.id)
                      }
                    >
                      <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}…</TableCell>
                      <TableCell className="capitalize">
                        {item.video_id ? 'Video' : 'Stream'}
                      </TableCell>
                      <TableCell>
                        <ModerationBadge status={item.status} />
                      </TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>{item.report?.violations?.length ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Review panel */}
      {selectedItem && (
        <ReviewPanel item={selectedItem} onClose={() => selectQueueItem(null)} />
      )}
    </div>
  );
}
