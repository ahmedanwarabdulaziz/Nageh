'use client';

import Link from 'next/link';

export default function SuperAdminDashboard() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">لوحة المشرف الأعلى</h2>
        <p className="mt-2 text-sm text-white/70">
          تحكم كامل في المنصة لإدارة المشرفين، رؤساء الفرق، البيانات وملفات التكرار.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/dashboard/overview" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">نظرة عامة على الأداء</h3>
          <p className="mt-2 text-sm text-white/70">
            مؤشرات الحملة، أعداد الأعضاء حسب الحالة، وأداء الفرق لحظيًا.
          </p>
        </Link>
        <Link href="/dashboard/heads" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">إدارة رؤساء الفرق</h3>
          <p className="mt-2 text-sm text-white/70">
            إنشاء رؤساء جدد، متابعة فرقهم، وضبط الصلاحيات الميدانية.
          </p>
        </Link>
        <Link href="/dashboard/duplicates" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">مركز معالجة التكرارات</h3>
          <p className="mt-2 text-sm text-white/70">
            مراجعة طلبات التكرار وتوزيع الأعضاء على الجهات الصحيحة.
          </p>
        </Link>
        <Link href="/dashboard/groups" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">إدارة المجموعات العامة</h3>
          <p className="mt-2 text-sm text-white/70">
            تنظيم المجموعات الرئيسية وتعيين المسؤولين عنها لضمان تغطية كافة الدوائر.
          </p>
        </Link>
      </div>
    </section>
  );
}



