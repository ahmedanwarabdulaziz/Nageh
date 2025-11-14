import Link from 'next/link';

const mockHeads = [
  { id: 'head-1', name: 'أحمد رئيس الفريق', leaders: 5, members: 180 },
  { id: 'head-2', name: 'ليلى رئيسة الفريق', leaders: 4, members: 140 },
];

export default function HeadsDirectoryPage() {
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">رؤساء الفرق</h2>
          <p className="text-sm text-white/60">نظرة عامة على رؤساء الفرق وصلاحياتهم.</p>
        </div>
        <Link
          href="/dashboard/heads/create"
          className="rounded-full bg-[var(--color-brand-gold)] px-6 py-2 text-sm font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
        >
          إضافة رئيس فريق
        </Link>
      </header>
      <div className="grid gap-4">
        {mockHeads.map((head) => (
          <Link
            key={head.id}
            href={`/dashboard/heads/${head.id}`}
            className="glass-panel flex items-center justify-between rounded-3xl p-6 transition hover:bg-white/5"
          >
            <div>
              <p className="text-lg font-semibold text-white">{head.name}</p>
              <p className="text-sm text-white/60">قادة: {head.leaders} | أعضاء: {head.members}</p>
            </div>
            <span className="text-sm text-[var(--color-brand-gold)]">عرض التفاصيل</span>
          </Link>
        ))}
      </div>
    </section>
  );
}


