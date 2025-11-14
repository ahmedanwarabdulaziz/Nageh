type LeaderDetailPageProps = {
  params: Promise<{
    leaderId: string;
  }>;
};

export default async function LeaderDetailPage({ params }: LeaderDetailPageProps) {
  const { leaderId } = await params;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">تفاصيل القائد الميداني</h2>
        <p className="text-sm text-white/60">
          معرف القائد: <span className="font-mono text-white">{leaderId}</span>
        </p>
      </header>
      <article className="glass-panel rounded-3xl p-6">
        <h3 className="mb-4 text-xl font-heading text-white">الأعضاء المسجلون</h3>
        <p className="text-white/60">قائمة الأعضاء والمسارات ستمتد هنا مع إمكانيات التصفية والبحث.</p>
      </article>
      <article className="glass-panel rounded-3xl p-6">
        <h3 className="mb-4 text-xl font-heading text-white">ملاحظات الفريق</h3>
        <p className="text-white/60">سيُعرض هنا سجل الملاحظات والتذكيرات المضافة من القائد.</p>
      </article>
    </div>
  );
}


