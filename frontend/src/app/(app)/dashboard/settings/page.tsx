'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { KeyRound, Pencil, Plus, Shield, ShieldAlert, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['admin', 'operator']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'operator']),
});

const changePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type AddUserForm = z.infer<typeof addUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// ── Role selector ─────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin' as const, label: 'Admin', icon: ShieldCheck },
  { value: 'operator' as const, label: 'Operator', icon: ShieldAlert },
];

function RoleSelector({
  value,
  onChange,
}: {
  value: 'admin' | 'operator';
  onChange: (v: 'admin' | 'operator') => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ROLES.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
            value === v ? 'border-primary bg-accent' : 'border-border'
          )}
        >
          <Icon className={cn('h-4 w-4', value === v ? 'text-primary' : 'text-muted-foreground')} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Add User dialog ───────────────────────────────────────────────────────────
function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<AddUserForm>({
      resolver: zodResolver(addUserSchema),
      defaultValues: { role: 'operator' },
    });

  const { mutate, isPending } = useMutation({
    mutationFn: (body: Omit<AddUserForm, 'confirmPassword'>) =>
      apiClient.post('/users', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User added successfully');
      onClose();
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Failed to add user';
      toast.error(msg);
    },
  });

  const onSubmit = ({ confirmPassword: _c, ...values }: AddUserForm) => mutate(values);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add new user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-name">Full name</Label>
            <Input id="add-name" placeholder="Jane Smith" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-email">Email</Label>
            <Input id="add-email" type="email" placeholder="jane@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <RoleSelector value={watch('role')} onChange={(v) => setValue('role', v)} />
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-password">Password</Label>
            <Input id="add-password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-confirm">Confirm password</Label>
            <Input id="add-confirm" type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset(); }} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add user'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit User dialog ──────────────────────────────────────────────────────────
function EditUserDialog({
  user,
  onClose,
}: {
  user: ManagedUser | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<EditUserForm>({
      resolver: zodResolver(editUserSchema),
      values: user ? { name: user.name, role: user.role } : undefined,
    });

  const { mutate, isPending } = useMutation({
    mutationFn: (body: EditUserForm) => apiClient.patch(`/users/${user!.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      onClose();
    },
    onError: () => toast.error('Failed to update user'),
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user — {user?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full name</Label>
            <Input id="edit-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <RoleSelector value={watch('role')} onChange={(v) => setValue('role', v)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset(); }} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Change Password dialog ────────────────────────────────────────────────────
function ChangePasswordDialog({
  user,
  onClose,
}: {
  user: ManagedUser | null;
  onClose: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ password }: ChangePasswordForm) =>
      apiClient.patch(`/users/${user!.id}`, { password }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      onClose();
      reset();
    },
    onError: () => toast.error('Failed to change password'),
  });

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change password — {user?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-confirm">Confirm new password</Label>
            <Input id="new-confirm" type="password" placeholder="••••••••" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset(); }} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── User Management tab ───────────────────────────────────────────────────────
function UserManagement({ currentUserId }: { currentUserId?: string }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [pwTarget, setPwTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () =>
      apiClient.get<{ data: { items: ManagedUser[] } }>('/users').then((r) => r.data.items),
  });

  const { mutate: deleteUser, isPending: deleting } = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to remove user'),
  });

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} user${data.length !== 1 ? 's' : ''} in your organisation` : ''}
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.name}
                          {u.id === currentUserId && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setEditTarget(u)}
                        aria-label="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setPwTarget(u)}
                        aria-label="Change password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUserId}
                        aria-label="Remove user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} />
      <ChangePasswordDialog user={pwTarget} onClose={() => setPwTarget(null)} />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Remove user
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{' '}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteUser(deleteTarget.id)}
              disabled={deleting}
            >
              {deleting ? 'Removing…' : 'Remove user'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settings page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, isAdmin } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform configuration</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
        </TabsList>

        {/* ── General tab ──────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="mt-1 capitalize flex items-center gap-1 w-fit">
                      <Shield className="h-3 w-3" />
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  To update your name, role, or password go to{' '}
                  <a href="/dashboard/profile" className="text-primary hover:underline">
                    your profile page
                  </a>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System</CardTitle>
                <CardDescription>Platform information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <Badge variant="outline">
                    {process.env.NEXT_PUBLIC_APP_ENV ?? 'development'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">API URL</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">
                    {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mock mode</span>
                  <Badge variant={process.env.NEXT_PUBLIC_MOCK_API === 'true' ? 'secondary' : 'outline'}>
                    {process.env.NEXT_PUBLIC_MOCK_API === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── User Management tab (admin only) ─────────────────────────── */}
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Add, edit, change passwords, or remove users in your organisation.
                  Only admins can access this section.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement currentUserId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
