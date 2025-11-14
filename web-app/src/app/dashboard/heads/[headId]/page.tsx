type HeadDetailPageProps = {
  params: Promise<{
    headId: string;
  }>;
};

export default async function HeadDetailPage({ params }: HeadDetailPageProps) {
  const { headId } = await params;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">
          تفاصيل رئيس الفريق
        </h2>
        <p className="text-sm text-white/60">
          معرف الرئيس: <span className="font-mono text-white">{headId}</span>
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-heading text-white">قادة الفريق</h3>
          <p className="text-white/60">سيظهر هنا جدول تفصيلي بقادة الفريق والأعضاء المرتبطين.</p>
        </article>
        <article className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-heading text-white">نظرة على الأداء</h3>
          <p className="text-white/60">مؤشرات تفاعلية للأصوات المؤكدة والاتصالات الجارية.</p>
        </article>
      </div>
    </div>
  );
}


