'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } =
    useAuthStore();
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    router.push(ROUTES.dashboard);
  };

  const handleRegister = async (email: string, password: string, name: string, role: 'admin' | 'operator') => {
    await register(email, password, name, role);
    router.push(ROUTES.login);
  };

  const handleLogout = () => {
    logout();
    router.push(ROUTES.login);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator' || user?.role === 'admin',
  };
}
