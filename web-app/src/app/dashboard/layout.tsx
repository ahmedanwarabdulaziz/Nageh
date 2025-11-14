import type { ReactNode } from 'react';
import { RequireRole } from '@/components/providers/RequireRole';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { APP_ROLES } from '@/lib/auth/roles';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={APP_ROLES}>
      <DashboardShell>{children}</DashboardShell>
    </RequireRole>
  );
}


