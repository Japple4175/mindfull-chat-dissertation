'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Or a more sophisticated loading skeleton for the specific page
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }

  return <>{children}</>;
}
