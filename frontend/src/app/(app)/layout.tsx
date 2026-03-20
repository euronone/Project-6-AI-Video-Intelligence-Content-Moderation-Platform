'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/lib/constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  // Wait for Zustand persist to rehydrate from localStorage before
  // deciding whether to redirect. Without this, the initial SSR/hydration
  // render always sees isAuthenticated=false and immediately redirects.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(ROUTES.login);
    }
  // router is a stable ref; omitting it avoids spurious re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated]);

  // Show nothing until we know the auth state
  if (!hydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden lg:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6" id="main-content">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
