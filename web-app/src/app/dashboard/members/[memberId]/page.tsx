type MemberDetailPageProps = {
  params: Promise<{
    memberId: string;
  }>;
};

export default async function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { memberId } = await params;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">ملف العضو</h2>
        <p className="text-sm text-white/60">
          رقم العضوية: <span className="font-mono text-white">{memberId}</span>
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-heading text-white">معلومات الاتصال</h3>
          <ul className="space-y-2 text-white/70">
            <li>رقم الهاتف المحمول: —</li>
            <li>الهاتف الأرضي: —</li>
            <li>العنوان: —</li>
          </ul>
        </article>
        <article className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-heading text-white">التسلسل التنظيمي</h3>
          <p className="text-white/70">سيظهر هنا اسم رئيس الفريق والقائد المسؤول والمجموعات المقيد بها العضو.</p>
        </article>
      </div>
      <article className="glass-panel rounded-3xl p-6">
        <h3 className="mb-4 text-xl font-heading text-white">سجل الحالات والملاحظات</h3>
        <p className="text-white/60">
          سيتم عرض الجدول الزمني للحالات: فرصة، تم التواصل، التزام، صوت مؤكد، غير مهتم، صوّت مع التوقيت والمستخدم.
        </p>
      </article>
    </div>
  );
}


