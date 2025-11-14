import Link from 'next/link';

function AdminDashboardContent() {
  return (
    <div className="px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-heading text-[var(--color-brand-gold)]">لوحة المشرف الأعلى</h1>
        <p className="mt-3 text-sm text-white/70">
          سيتم تجهيز لوحة التحكم التفصيلية لاحقًا. في الوقت الحالي يمكنك الانتقال إلى أقسام الإدارة المتاحة.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/members" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h2 className="text-xl font-heading text-white">قاعدة بيانات الأعضاء</h2>
          <p className="mt-2 text-sm text-white/70">
            استعرض بيانات الأعضاء مع أدوات البحث المتقدمة ومتابعة الحالة اللحظية.
          </p>
        </Link>
        <Link href="/dashboard/overview" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h2 className="text-xl font-heading text-white">نظرة عامة</h2>
          <p className="mt-2 text-sm text-white/70">
            الاطلاع على المؤشرات الأساسية لمتابعة تقدم الحملة.
          </p>
        </Link>
        <Link href="/dashboard/heads" className="glass-panel rounded-3xl p-6 transition hover:bg-white/10">
          <h2 className="text-xl font-heading text-white">إدارة رؤساء الفرق</h2>
          <p className="mt-2 text-sm text-white/70">
            إدارة الرؤساء وتوزيع الصلاحيات على فرقهم.
          </p>
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminDashboardContent />
  );
}


