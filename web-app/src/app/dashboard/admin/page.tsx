'use client';

import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">لوحة المشرف</h2>
        <p className="mt-2 text-sm text-white/70">
          إدارة الفرق اليومية، متابعة المؤشرات، والتنسيق مع المشرف الأعلى وفريق الميدان.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/dashboard/overview" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">نظرة عامة على الأداء</h3>
          <p className="mt-2 text-sm text-white/70">
            احصائيات الأعضاء، التزام الأصوات، وسير خطة الحملة لحظيًا.
          </p>
        </Link>
        <Link href="/dashboard/heads" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">متابعة رؤساء الفرق</h3>
          <p className="mt-2 text-sm text-white/70">
            مراجعة خطط الرؤساء، إضافة قادة، وتوفير الدعم المطلوب للميدان.
          </p>
        </Link>
        <Link href="/dashboard/duplicates" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">حل حالات التكرار</h3>
          <p className="mt-2 text-sm text-white/70">
            تعاون مع المشرف الأعلى لضمان دقة قاعدة البيانات وتوزيع الأعضاء.
          </p>
        </Link>
        <Link href="/dashboard/election-day" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h3 className="text-xl font-heading text-white">وضع يوم الانتخاب</h3>
          <p className="mt-2 text-sm text-white/70">
            جهّز الفرق لقوائم الحضور، المتابعة الميدانية، وسرعة الاستجابة في اليوم الحاسم.
          </p>
        </Link>
      </div>
    </section>
  );
}



