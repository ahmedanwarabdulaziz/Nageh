import type { ReactNode } from 'react';
import { RequireRole } from '@/components/providers/RequireRole';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function LeadersLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={['teamLeader']}>
      <DashboardShell>{children}</DashboardShell>
    </RequireRole>
  );
}



