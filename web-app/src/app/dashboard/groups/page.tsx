const mockGroups = [
  { id: 'group-1', name: 'أصدقاء النادي', owner: 'سارة', members: 24 },
  { id: 'group-2', name: 'سكان الحي الغربي', owner: 'يوسف', members: 31 },
];

export default function GroupsPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">مجموعات المتابعة</h2>
          <p className="text-sm text-white/60">تنظيم الأعضاء ضمن مجموعات لتسهيل التواصل والتذكير.</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-[var(--color-brand-gold)] px-6 py-2 text-sm font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
        >
          إنشاء مجموعة جديدة
        </button>
      </header>
      <div className="grid gap-4">
        {mockGroups.map((group) => (
          <article key={group.id} className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">{group.name}</p>
                <p className="text-sm text-white/60">
                  المسؤول: {group.owner} • عدد الأعضاء: {group.members}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40"
              >
                عرض الأعضاء
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


