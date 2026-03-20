'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const { mutate: changePassword, isPending: changingPassword } = useMutation({
    mutationFn: ({ current_password, new_password }: ChangePasswordForm) =>
      apiClient.patch('/users/me/password', { current_password, new_password }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Failed to change password';
      toast.error(msg);
    },
  });

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your account information and preferences</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your personal details and role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
            </div>
          </div>

          <Separator />

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs break-all">{user?.id ?? '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Organization</dt>
              <dd>{user?.organization_id ?? '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Member since</dt>
              <dd>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>
                {user?.updated_at
                  ? new Date(user.updated_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how VidShield AI looks for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent ${
                  theme === value
                    ? 'border-primary bg-accent'
                    : 'border-border'
                }`}
                aria-pressed={theme === value}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
                {value === 'system' && (
                  <span className="text-[10px] text-muted-foreground">Follows OS</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>System</strong> mode automatically follows your operating system&apos;s
            light/dark preference — recommended for eye comfort.
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => changePassword(v))} className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="••••••••"
                {...register('current_password')}
              />
              {errors.current_password && (
                <p className="text-xs text-destructive">{errors.current_password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                {...register('new_password')}
              />
              {errors.new_password && (
                <p className="text-xs text-destructive">{errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Manage your current session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Active session</p>
              <p className="text-xs text-muted-foreground">You are currently signed in</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
