'use client';

import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ROUTES } from '@/lib/constants';

export default function SettingsPage() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform configuration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile summary */}
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
                  {user?.role === 'api_consumer' ? 'API Consumer' : user?.role}
                </Badge>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              To update your name, address, or password go to{' '}
              <a href={ROUTES.profile} className="text-primary hover:underline">
                your profile page
              </a>
              .
            </p>
          </CardContent>
        </Card>

        {/* System info */}
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
    </div>
  );
}
