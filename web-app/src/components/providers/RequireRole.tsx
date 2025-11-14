'use client';

import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppRole, UNKNOWN_ROLE } from '@/lib/auth/roles';
import { useAuth } from './AuthProvider';

type RequireRoleProps = {
  allowed: ReadonlyArray<AppRole>;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequireRole({ allowed, children, fallback }: RequireRoleProps) {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (role === UNKNOWN_ROLE || !allowed.includes(role)) {
      router.replace('/login');
    }
  }, [allowed, loading, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/80">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  if (role === UNKNOWN_ROLE || !allowed.includes(role)) {
    return (
      fallback ?? (
        <div className="flex min-h-[60vh] items-center justify-center text-white/80">
          لا تملك صلاحية الوصول إلى هذه الصفحة.
        </div>
      )
    );
  }

  return <>{children}</>;
}


