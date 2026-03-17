'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes } from '@/lib/utils';
import { ACCEPTED_VIDEO_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/constants';

export interface UploadFile {
  file: File;
  id: string;
}

interface UploadDropzoneProps {
  files: UploadFile[];
  onFilesAdded: (files: UploadFile[]) => void;
  onFileRemove: (id: string) => void;
  uploading?: boolean;
  progress?: number;
  disabled?: boolean;
}

export function UploadDropzone({
  files,
  onFilesAdded,
  onFileRemove,
  uploading = false,
  progress = 0,
  disabled = false,
}: UploadDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const newFiles: UploadFile[] = accepted.map((f) => ({
        file: f,
        id: `${f.name}-${f.size}-${Date.now()}`,
      }));
      onFilesAdded(newFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ACCEPTED_VIDEO_TYPES.map((t) => [t, []])),
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    multiple: false,
    disabled: disabled || uploading,
  });

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/30',
          (disabled || uploading) && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <CloudUpload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop the video here' : 'Drag & drop a video, or click to select'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          MP4, WebM, MOV, AVI, MKV — max {formatBytes(MAX_UPLOAD_SIZE_BYTES)}
        </p>
      </div>

      {/* Rejections */}
      {fileRejections.length > 0 && (
        <ul className="space-y-1">
          {fileRejections.map(({ file, errors }) => (
            <li key={file.name} className="text-xs text-destructive">
              {file.name}: {errors.map((e) => e.message).join(', ')}
            </li>
          ))}
        </ul>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(({ file, id }) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3"
            >
              <File className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                {uploading && (
                  <Progress value={progress} className="mt-2 h-1.5" />
                )}
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onFileRemove(id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
