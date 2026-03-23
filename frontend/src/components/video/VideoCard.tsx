import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Film, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDuration } from '@/lib/utils';
import { ROUTES, VIDEO_STATUS_LABELS } from '@/lib/constants';
import type { Video, VideoStatus } from '@/types/video';

const statusVariant: Record<VideoStatus, 'default' | 'secondary' | 'destructive' | 'warning' | 'success' | 'info'> = {
  pending: 'secondary',
  processing: 'info',
  completed: 'success',
  flagged: 'warning',
  ready: 'success',
  failed: 'destructive',
  deleted: 'secondary',
};

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const videoTitle = video.title ?? video.filename ?? 'Untitled video';
  const durationSeconds = video.duration_seconds ?? video.duration;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <Link href={ROUTES.videoDetail(video.id)} className="block relative aspect-video bg-muted">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={videoTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {durationSeconds !== undefined && (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(durationSeconds)}
          </span>
        )}
      </Link>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={ROUTES.videoDetail(video.id)}>
              <p className="truncate font-medium leading-tight hover:underline">
                {videoTitle}
              </p>
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={statusVariant[video.status]}>
              {VIDEO_STATUS_LABELS[video.status]}
            </Badge>

            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    aria-label="Video actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(video.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
