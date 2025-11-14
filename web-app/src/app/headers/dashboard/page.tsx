'use client';

import Link from 'next/link';

export default function TeamHeadDashboard() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">لوحة رئيس الفريق</h2>
        <p className="mt-2 text-sm text-white/70">
          راقب فرقك، وزّع الأعضاء على القادة، وتأكد من تنفيذ خطة التواصل كاملة.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/headers/leaders" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">إدارة القادة الميدانيين</h3>
          <p className="mt-2 text-sm text-white/70">
            متابعة نشاط القادة، إضافة قائد جديد، وتوزيع المهام عليهم.
          </p>
        </Link>
        <Link href="/headers/members" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">قاعدة بيانات الأعضاء</h3>
          <p className="mt-2 text-sm text-white/70">
            بحث شامل عن الأعضاء، توزيعهم على القادة، وتحديث حالة المتابعة.
          </p>
        </Link>
        <Link href="/dashboard/groups" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">إدارة المجموعات</h3>
          <p className="mt-2 text-sm text-white/70">
            إنشاء مجموعات تصنيفية لتسهيل المتابعة وتذكّر الأولويات.
          </p>
        </Link>
        <Link href="/dashboard/election-day" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">جاهزية يوم الانتخاب</h3>
          <p className="mt-2 text-sm text-white/70">
            استعد لقوائم الحضور، تواصل مع المتأخرين، وتأكد من جاهزية القادة.
          </p>
        </Link>
      </div>
    </section>
  );
}


