import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { RequireRole } from '@/components/providers/RequireRole';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { APP_ROLES } from '@/lib/auth/roles';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireRole allowed={APP_ROLES}>
        <DashboardShell>{children}</DashboardShell>
      </RequireRole>
    </AuthProvider>
  );
}

