'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PolicyEditor } from '@/components/moderation/PolicyEditor';
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
} from '@/hooks/useModeration';
import { VIOLATION_CATEGORY_LABELS } from '@/lib/constants';
import type { Policy } from '@/types/moderation';

export default function PoliciesPage() {
  const { data, isLoading, isError } = usePolicies();
  const { mutate: createPolicy, isPending: creating } = useCreatePolicy();
  const { mutate: updatePolicy, isPending: updating } = useUpdatePolicy();
  const { mutate: deletePolicy } = useDeletePolicy();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const openCreate = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  const openEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const handleSubmit = (values: Parameters<typeof createPolicy>[0]) => {
    if (editingPolicy) {
      updatePolicy(
        { id: editingPolicy.id, body: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createPolicy(values, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground">
            Configure moderation rules and automated actions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New policy
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load policies.</p>
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No policies yet.</p>
          <Button className="mt-4" onClick={openCreate}>
            Create your first policy
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((policy) => (
            <Card key={policy.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{policy.name}</CardTitle>
                  <Badge variant={policy.is_active ? 'success' : 'secondary'}>
                    {policy.is_active ? (
                      <><ShieldCheck className="mr-1 h-3 w-3" />Active</>
                    ) : (
                      <><ShieldOff className="mr-1 h-3 w-3" />Inactive</>
                    )}
                  </Badge>
                </div>
                {policy.description && (
                  <CardDescription className="text-xs">{policy.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Categories */}
                <div className="flex flex-wrap gap-1">
                  {policy.categories.map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {VIOLATION_CATEGORY_LABELS[cat]}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{policy.rules.length} rule{policy.rules.length !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{policy.actions.length} action{policy.actions.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(policy)}
                    aria-label="Edit policy"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deletePolicy(policy.id)}
                    aria-label="Delete policy"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit policy' : 'Create policy'}
            </DialogTitle>
          </DialogHeader>
          <PolicyEditor
            policy={editingPolicy ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={creating || updating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
