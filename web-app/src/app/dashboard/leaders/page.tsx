'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import { useAuth } from '@/components/providers/AuthProvider';

type LeaderRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  mustChangePassword: boolean;
  createdAt: string | null;
};

type LeadersResponse = {
  leaders: LeaderRow[];
};

function CreateLeaderForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth('/api/team-head/leaders', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, phone }),
      });
      setDisplayName('');
      setEmail('');
      setPhone('');
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء القائد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
      <h3 className="text-lg font-heading text-white">إضافة قائد جديد</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-white/80">
          الاسم الكامل
          <input
            type="text"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="الاسم"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          البريد الإلكتروني
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="leader@example.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          الهاتف (اختياري)
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="01000000000"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        className="rounded-full bg-[var(--color-brand-gold)] px-6 py-2 text-sm font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
        disabled={submitting}
      >
        {submitting ? 'جاري الإضافة...' : 'حفظ القائد'}
      </button>
    </form>
  );
}

export default function LeadersDirectoryPage() {
  const { role, profile } = useAuth();
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await fetchWithAuth('/api/team-head/leaders')) as LeadersResponse;
      setLeaders(data.leaders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل القادة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'teamHead') {
      void loadLeaders();
    }
  }, [loadLeaders, role]);

  const leadersCount = leaders.length;

  if (role !== 'teamHead') {
    return (
      <section className="space-y-6">
        <header>
          <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">قادة الفرق</h2>
        </header>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-white/70">
          هذه الصفحة مخصصة لرؤساء الفرق لإدارة القادة التابعين لهم. يرجى مراجعة صلاحياتك أو التواصل مع
          الإدارة.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">قادة فريقي</h2>
        <p className="text-sm text-white/70">
          يا {profile?.displayName ?? 'قائد'}, إليك القادة التابعون لك مباشرة.
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 sm:text-sm">
          <p>
            عدد القادة الحاليين:{' '}
            <span className="font-semibold text-white">
              {leadersCount.toLocaleString('ar-EG')}
            </span>
          </p>
          <p className="mt-1">
            يبدأ كل قائد جديد بكلمة المرور الافتراضية{' '}
            <span className="font-mono text-white">123456</span> وسيُطلب منه تغييرها عند أول تسجيل دخول.
          </p>
        </div>
      </header>

      <CreateLeaderForm onCreated={loadLeaders} />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-white/80">
          جاري تحميل القادة...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : leaders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 p-10 text-center text-white/70">
          لم تقم بإضافة أي قائد بعد. ابدأ بإضافة أول قائد تابع لك.
        </div>
      ) : (
        <div className="grid gap-4">
          {leaders.map((leader) => (
            <article key={leader.id} className="glass-panel rounded-3xl p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{leader.displayName}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/70">
                    <span dir="ltr" className="font-mono text-white">
                      {leader.email}
                    </span>
                    {leader.phone ? <span>{leader.phone}</span> : null}
                    {leader.createdAt ? (
                      <span>
                        أضيف في{' '}
                        {new Date(leader.createdAt).toLocaleString('ar-EG', {
                          dateStyle: 'medium',
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-1 text-xs text-white/70">
                  حالة كلمة المرور:{' '}
                  <span className={leader.mustChangePassword ? 'text-amber-300' : 'text-emerald-300'}>
                    {leader.mustChangePassword ? 'بانتظار التغيير' : 'تم التغيير'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}



