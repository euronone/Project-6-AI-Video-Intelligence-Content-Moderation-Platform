'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/live/AlertBanner';
import { LiveFeed } from '@/components/live/LiveFeed';

export default function LiveStreamDetailPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const router = useRouter();

  return (
    <div className="space-y-0">
      <AlertBanner />

      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Stream</h1>
            <p className="font-mono text-sm text-muted-foreground">{streamId}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LiveFeed streamId={streamId} />
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Stream Info</h3>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Stream ID</dt>
                  <dd className="font-mono truncate">{streamId}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
