const mockDuplicates = [
  {
    id: 'dup-1',
    memberName: 'إيمان محمود',
    reportedBy: 'سارة القائدة',
    currentAssignee: 'يوسف',
    createdAt: '2025-11-10 18:20',
  },
  {
    id: 'dup-2',
    memberName: 'مصطفى عمر',
    reportedBy: 'أحمد رئيس الفريق',
    currentAssignee: '—',
    createdAt: '2025-11-11 09:45',
  },
];

export default function DuplicatesQueuePage() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">سجل الحالات المكررة</h2>
        <p className="text-sm text-white/60">
          إشعارات تظهر عندما يتم تسجيل عضو أكثر من مرة، مع إمكانية تعيين المالك النهائي.
        </p>
      </header>
      <div className="grid gap-4">
        {mockDuplicates.map((duplicate) => (
          <article key={duplicate.id} className="glass-panel rounded-3xl p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-white">{duplicate.memberName}</p>
                <p className="text-sm text-white/60">
                  تم الإبلاغ بواسطة: {duplicate.reportedBy} • الوقت: {duplicate.createdAt}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70">
                  المالك الحالي: <span className="font-semibold text-white">{duplicate.currentAssignee}</span>
                </span>
                <button
                  type="button"
                  className="rounded-full bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
                >
                  معالجة
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


