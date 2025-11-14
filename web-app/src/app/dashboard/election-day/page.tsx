const mockAttendance = [
  { id: 'member-10', name: 'أحمد عبد الله', status: 'voted', time: '09:15', contact: '0100000000' },
  { id: 'member-11', name: 'ريم علي', status: 'committed', time: '—', contact: '0101234567' },
  { id: 'member-12', name: 'طارق سالم', status: 'contacted', time: '—', contact: '0107654321' },
];

const statusColors: Record<string, string> = {
  voted: 'bg-emerald-500/20 text-emerald-200',
  voteSecured: 'bg-sky-500/20 text-sky-200',
  committed: 'bg-amber-500/20 text-amber-200',
  contacted: 'bg-purple-500/20 text-purple-200',
  chance: 'bg-white/10 text-white',
  no: 'bg-rose-500/20 text-rose-200',
};

const statusLabels: Record<string, string> = {
  voted: 'صوّت',
  voteSecured: 'صوت مؤكد',
  committed: 'التزام',
  contacted: 'تم التواصل',
  chance: 'فرصة',
  no: 'غير مهتم',
};

export default function ElectionDayPage() {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">متابعة يوم الانتخاب</h2>
          <p className="text-sm text-white/60">
            عرض فوري للأعضاء الذين حضروا أو ما زالوا بحاجة إلى تذكير، مع أولوية حسب المجموعات والقادة.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:border-white/40"
          >
            تصفية حسب الحالة
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white transition hover:border-white/40"
          >
            تصفية حسب الفريق
          </button>
        </div>
      </header>
      <div className="glass-panel rounded-3xl p-0">
        <table className="w-full divide-y divide-white/10 text-right text-white">
          <thead className="bg-white/5 text-sm">
            <tr>
              <th className="px-6 py-4 font-semibold">اسم العضو</th>
              <th className="px-6 py-4 font-semibold">الحالة الحالية</th>
              <th className="px-6 py-4 font-semibold">وقت الحضور</th>
              <th className="px-6 py-4 font-semibold">الاتصال</th>
              <th className="px-6 py-4 font-semibold">إجراء سريع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-sm">
            {mockAttendance.map((record) => (
              <tr key={record.id} className="hover:bg-white/5">
                <td className="px-6 py-4">{record.name}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[record.status]}`}>
                    {statusLabels[record.status]}
                  </span>
                </td>
                <td className="px-6 py-4">{record.time}</td>
                <td className="px-6 py-4">
                  <a href={`tel:${record.contact}`} className="text-[var(--color-brand-gold)] underline">
                    {record.contact}
                  </a>
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    className="rounded-full bg-[var(--color-brand-gold)] px-4 py-1 text-xs font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
                  >
                    تسجيل حضور
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


