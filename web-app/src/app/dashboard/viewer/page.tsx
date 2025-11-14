'use client';

import Link from 'next/link';

export default function ViewerDashboard() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">لوحة المشاهد</h2>
        <p className="mt-2 text-sm text-white/70">
          متابعة لحظية لإحصائيات الحملة مع صلاحيات قراءة فقط لمراجعة التقدم.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/dashboard/overview" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">مؤشرات الحملة</h3>
          <p className="mt-2 text-sm text-white/70">
            شاهد الأرقام الرئيسية: الأعضاء المتواصل معهم، الأصوات المؤكدة، والتغطية الحالية.
          </p>
        </Link>
        <Link href="/dashboard/members" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">قائمة الأعضاء</h3>
          <p className="mt-2 text-sm text-white/70">
            استعرض أعضاء الفريق مع البيانات المتاحة للاطلاع فقط دون تعديلات.
          </p>
        </Link>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <h3 className="text-lg font-heading text-white">ملاحظات الصلاحيات</h3>
        <p className="mt-2 text-sm text-white/70">
          هذا الحساب مخصص للمتابعة فقط. إذا احتجت لإجراء تغييرات على البيانات، يرجى التواصل مع المشرف أو رئيس
          الفريق المسؤول.
        </p>
      </div>
    </section>
  );
}



