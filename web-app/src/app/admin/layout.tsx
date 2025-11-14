import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { RequireRole } from '@/components/providers/RequireRole';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <RequireRole allowed={['superAdmin', 'admin']}>
      <DashboardShell>{children}</DashboardShell>
    </RequireRole>
  );
}




