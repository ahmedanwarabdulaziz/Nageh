'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { APP_ROLES, UNKNOWN_ROLE, getRoleHomePath } from '@/lib/auth/roles';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (role === UNKNOWN_ROLE) {
      router.replace('/login');
      return;
    }

    if (APP_ROLES.includes(role)) {
      router.replace(getRoleHomePath(role));
    }
  }, [loading, role, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-white/80">
      جاري التحويل إلى لوحة التحكم المناسبة...
    </div>
  );
}


