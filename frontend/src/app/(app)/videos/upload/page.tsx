'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadDropzone, type UploadFile } from '@/components/video/UploadDropzone';
import { useUploadVideo } from '@/hooks/useVideo';
import { useShallow } from 'zustand/react/shallow';
import { useVideoStore } from '@/stores/videoStore';
import { ROUTES } from '@/lib/constants';

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { mutate: upload, isPending } = useUploadVideo();
  const uploads = useVideoStore(useShallow((s) => s.uploads));

  const currentUpload = uploads.find(
    (u) => files.some((f) => f.file.name === u.filename) && u.status === 'uploading'
  );

  const handleFilesAdded = (newFiles: UploadFile[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 1)); // one file at a time
  };

  const handleFileRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    upload(
      { file: files[0].file },
      {
        onSuccess: () => {
          router.push(ROUTES.videos);
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Video</h1>
          <p className="text-muted-foreground">
            Upload a video to start AI-powered content moderation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select file</CardTitle>
          <CardDescription>
            Supported formats: MP4, WebM, MOV, AVI, MKV — up to 5 GB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadDropzone
            files={files}
            onFilesAdded={handleFilesAdded}
            onFileRemove={handleFileRemove}
            uploading={isPending}
            progress={currentUpload?.progress}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || isPending}>
              {isPending ? 'Uploading…' : 'Upload & process'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
