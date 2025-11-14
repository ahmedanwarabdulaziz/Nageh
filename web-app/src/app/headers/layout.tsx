import type { ReactNode } from 'react';
import { RequireRole } from '@/components/providers/RequireRole';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function HeadersLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={['teamHead']}>
      <DashboardShell>{children}</DashboardShell>
    </RequireRole>
  );
}



