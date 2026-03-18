'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ArrowUpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ModerationBadge } from './ModerationBadge';
import { ViolationCard } from './ViolationCard';
import { useSubmitReview } from '@/hooks/useModeration';
import { formatDistanceToNow } from 'date-fns';
import type { ModerationQueueItem, ReviewAction } from '@/types/moderation';

interface ReviewPanelProps {
  item: ModerationQueueItem;
  onClose: () => void;
}

export function ReviewPanel({ item, onClose }: ReviewPanelProps) {
  const [notes, setNotes] = useState('');
  const { mutate: submitReview, isPending } = useSubmitReview();

  const handleAction = (action: ReviewAction) => {
    submitReview(
      { id: item.id, body: { action, notes: notes.trim() || undefined } },
      { onSuccess: onClose }
    );
  };

  const violations = item.report?.violations ?? [];

  return (
    <aside className="flex h-full w-96 flex-col border-l bg-card" aria-label="Review panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">Review Item</h2>
          <ModerationBadge status={item.status} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Meta */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              ID: <span className="font-mono">{item.id}</span>
            </p>
            {item.video_id && (
              <p>
                Video: <span className="font-mono">{item.video_id}</span>
              </p>
            )}
            {item.stream_id && (
              <p>
                Stream: <span className="font-mono">{item.stream_id}</span>
              </p>
            )}
            <p>
              Created: {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </p>
          </div>

          <Separator />

          {/* Summary */}
          {item.report && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Report</h3>
              {item.report.summary && (
                <p className="text-sm text-muted-foreground">{item.report.summary}</p>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Recommended:</span>
                <Badge variant="secondary" className="capitalize">
                  {item.report.recommended_action}
                </Badge>
              </div>
            </div>
          )}

          {/* Violations */}
          {violations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Violations ({violations.length})
              </h3>
              <div className="space-y-2">
                {violations.map((v) => (
                  <ViolationCard key={v.id} violation={v} />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Review notes */}
          <div className="space-y-2">
            <Label htmlFor="review-notes" className="text-sm">
              Notes (optional)
            </Label>
            <Textarea
              id="review-notes"
              placeholder="Add review notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="border-t p-4 space-y-2">
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => handleAction('approve')}
          disabled={isPending || item.status !== 'pending' && item.status !== 'in_review'}
        >
          <CheckCircle className="h-4 w-4" />
          Approve
        </Button>
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => handleAction('reject')}
          disabled={isPending || item.status !== 'pending' && item.status !== 'in_review'}
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => handleAction('escalate')}
          disabled={isPending || item.status !== 'pending' && item.status !== 'in_review'}
        >
          <ArrowUpCircle className="h-4 w-4" />
          Escalate
        </Button>
      </div>
    </aside>
  );
}
