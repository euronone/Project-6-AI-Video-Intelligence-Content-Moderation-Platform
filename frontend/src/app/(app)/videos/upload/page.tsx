'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadDropzone } from '@/components/video/UploadDropzone';
import { useBulkUploadVideo, checkDuplicates } from '@/hooks/useVideo';
import { ROUTES } from '@/lib/constants';
import type { UploadFile } from '@/types/video';

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { uploadAll, isUploading } = useBulkUploadVideo();

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const allDone = files.length > 0 && doneCount + errorCount === files.length;

  const handleFilesAdded = async (newFiles: UploadFile[]) => {
    // 1. Deduplicate against files already in the current queue
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.file.name}-${f.file.size}`));
      return [
        ...prev,
        ...newFiles.filter((f) => !existingKeys.has(`${f.file.name}-${f.file.size}`)),
      ];
    });

    // 2. Check against already-uploaded videos in the database
    try {
      const duplicateKeys = await checkDuplicates(newFiles);
      if (duplicateKeys.size === 0) return;

      const duplicateNames = newFiles
        .filter((f) => duplicateKeys.has(`${f.file.name}-${f.file.size}`))
        .map((f) => f.file.name);

      // Remove the duplicates from the queue
      setFiles((prev) =>
        prev.filter((f) => !duplicateKeys.has(`${f.file.name}-${f.file.size}`))
      );

      toast.warning(
        duplicateNames.length === 1
          ? `"${duplicateNames[0]}" already exists — skipped`
          : `${duplicateNames.length} files already exist and were skipped:\n${duplicateNames.join(', ')}`
      );
    } catch {
      // Non-fatal: if the check fails, let the upload proceed
    }
  };

  const handleFileRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0 || isUploading) return;
    const onUpdate = (id: string, patch: Partial<Pick<UploadFile, 'status' | 'progress' | 'error'>>) => {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };
    await uploadAll(files, onUpdate);
  };

  const uploadableCount = files.filter(
    (f) => f.status === 'pending' || f.status === 'error'
  ).length;

  const buttonLabel = isUploading
    ? `Uploading (${doneCount}/${files.length})…`
    : uploadableCount > 0
    ? `Upload ${uploadableCount} video${uploadableCount > 1 ? 's' : ''}`
    : 'Upload & process';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Videos</h1>
          <p className="text-muted-foreground">
            Select one or more videos for AI-powered content moderation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select files</CardTitle>
          <CardDescription>
            Supported formats: MP4, WebM, MOV, AVI, MKV — up to 5 GB per file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadDropzone
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            disabled={isUploading}
          />

          {/* Summary row when uploads are complete */}
          {allDone && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {doneCount} video{doneCount !== 1 ? 's' : ''} uploaded
                {errorCount > 0 ? `, ${errorCount} failed` : ''}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {files.length > 0 && !allDone && !isUploading && (
                <span>{pendingCount} file{pendingCount !== 1 ? 's' : ''} ready</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()} disabled={isUploading}>
                Cancel
              </Button>
              {allDone ? (
                <Button onClick={() => router.push(ROUTES.videos)}>
                  Go to Videos
                </Button>
              ) : (
                <Button
                  onClick={handleUpload}
                  disabled={uploadableCount === 0 || isUploading}
                >
                  {buttonLabel}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
