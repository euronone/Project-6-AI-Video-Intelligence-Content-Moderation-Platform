'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    role: z.enum(['admin', 'operator'], { required_error: 'Please select a role' }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const ROLES = [
  {
    value: 'admin' as const,
    label: 'Admin',
    description: 'Full access — manage policies, users, and all moderation decisions',
    icon: ShieldCheck,
  },
  {
    value: 'operator' as const,
    label: 'Operator',
    description: 'Review content, action queue items, and monitor live streams',
    icon: ShieldAlert,
  },
];

export default function RegisterPage() {
  const { register: registerUser, isLoading, error, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'operator' },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser(values.email, values.password, values.name, values.role);
      toast.success('Account created! Please sign in.');
    } catch {
      // error handled via store + toast above
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">VidShield AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI Video Intelligence & Content Moderation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Register to access VidShield AI</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>
                )}
              </div>

              {/* Role selector */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(({ value, label, description, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('role', value, { shouldValidate: true })}
                      className={cn(
                        'flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-colors hover:bg-accent',
                        selectedRole === value
                          ? 'border-primary bg-accent'
                          : 'border-border'
                      )}
                      aria-pressed={selectedRole === value}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', selectedRole === value ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                    </button>
                  ))}
                </div>
                {errors.role && (
                  <p className="text-xs text-destructive" role="alert">{errors.role.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href={ROUTES.login} className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
