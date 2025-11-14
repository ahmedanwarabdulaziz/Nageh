'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamLeaderDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leaders/members');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-white/80">
      جاري التحويل إلى صفحة الأعضاء...
    </div>
  );
}



