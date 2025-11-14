export default function AnalyticsSnapshot() {
  const metrics = [
    { label: 'إجمالي الأعضاء', value: '1,250', trend: '+12%', tone: 'positive' },
    { label: 'أصوات مؤكدة', value: '640', trend: '+6%', tone: 'positive' },
    { label: 'يتطلب متابعة', value: '210', trend: '-3%', tone: 'neutral' },
    { label: 'حالات مكررة', value: '18', trend: '+2', tone: 'warning' },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.label} className="glass-panel rounded-3xl p-6">
          <p className="text-sm text-white/60">{metric.label}</p>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-3xl font-heading text-[var(--color-brand-gold)]">{metric.value}</span>
            <span
              className={
                metric.tone === 'warning'
                  ? 'text-sm text-orange-400'
                  : metric.tone === 'positive'
                    ? 'text-sm text-emerald-300'
                    : 'text-sm text-blue-300'
              }
            >
              {metric.trend}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}


