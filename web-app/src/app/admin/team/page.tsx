'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';

type LeaderRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  userId: string;
  mustChangePassword: boolean;
  createdAt: string | null;
};

type HeaderRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  userId: string;
  createdAt: string | null;
  leaders: LeaderRow[];
};

type StructureResponse = {
  headers: HeaderRow[];
};

function useTeamStructure() {
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await fetchWithAuth('/api/admin/team/structure')) as StructureResponse;
      setHeaders(data.headers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { headers, loading, error, reload: load };
}

type CreateHeadFormProps = {
  onCreated: () => Promise<void> | void;
};

function CreateHeadForm({ onCreated }: CreateHeadFormProps) {
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
      await fetchWithAuth('/api/admin/team/headers', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, phone }),
      });
      setDisplayName('');
      setEmail('');
      setPhone('');
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء رئيس الفريق');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
      <h3 className="text-lg font-heading text-white">إضافة رئيس فريق جديد</h3>
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
            placeholder="head@example.com"
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
        {submitting ? 'جاري الإضافة...' : 'حفظ رئيس الفريق'}
      </button>
    </form>
  );
}

type CreateLeaderFormProps = {
  headId: string;
  headName: string;
  onCreated: () => Promise<void> | void;
};

function CreateLeaderForm({ headId, headName, onCreated }: CreateLeaderFormProps) {
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
      await fetchWithAuth('/api/admin/team/leaders', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, phone, headId }),
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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <h4 className="text-sm font-semibold text-white">
        إضافة قائد تحت <span className="text-[var(--color-brand-gold)]">{headName}</span>
      </h4>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs text-white/70">
          الاسم الكامل
          <input
            type="text"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="الاسم"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-white/70">
          البريد الإلكتروني
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="leader@example.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-white/70">
          الهاتف (اختياري)
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
            placeholder="01000000000"
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-[var(--color-brand-gold)] px-4 py-1.5 text-xs font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
          disabled={submitting}
        >
          {submitting ? 'جاري الإضافة...' : 'حفظ القائد'}
        </button>
      </div>
    </form>
  );
}

export default function TeamManagementPage() {
  const { headers, loading, error, reload } = useTeamStructure();

  const totalLeaders = useMemo(() => headers.reduce((count, head) => count + head.leaders.length, 0), [headers]);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-3xl font-heading text-[var(--color-brand-gold)]">إدارة الرؤساء والقادة</h2>
        <p className="text-sm text-white/70">
          أنشئ رؤساء الفرق وقادتهم، وتابع حساباتهم. جميع الحسابات الجديدة تبدأ بكلمة المرور الافتراضية{' '}
          <span className="font-mono text-white">123456</span> وسيتم إجبارهم على تغييرها عند أول تسجيل دخول.
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70 sm:text-sm">
          <p>
            عدد الرؤساء: <span className="font-semibold text-white">{headers.length}</span>، عدد القادة:{' '}
            <span className="font-semibold text-white">{totalLeaders}</span>.
          </p>
        </div>
      </header>

      <CreateHeadForm onCreated={reload} />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-white/80">جاري تحميل البيانات...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : headers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 p-10 text-center text-white/70">
          لم يتم إضافة أي رؤساء بعد. ابدأ بإضافة أول رئيس فريق.
        </div>
      ) : (
        <div className="space-y-6">
          {headers.map((head) => (
            <article key={head.id} className="glass-panel space-y-4 rounded-3xl p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-heading text-white">{head.displayName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-white/70">
                    <span dir="ltr" className="font-mono text-white">
                      {head.email}
                    </span>
                    {head.phone ? <span>{head.phone}</span> : null}
                    <span>عدد القادة: {head.leaders.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-black/30 p-4">
                <h4 className="text-sm font-semibold text-white/80">القادة المرتبطون</h4>
                {head.leaders.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/20 p-4 text-sm text-white/60">
                    لا يوجد قادة حتى الآن لهذا الرئيس.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {head.leaders.map((leader) => (
                      <li
                        key={leader.id}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-white">{leader.displayName}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-white/70">
                            <span dir="ltr" className="font-mono text-white">
                              {leader.email}
                            </span>
                            {leader.phone ? <span>{leader.phone}</span> : null}
                            <span>
                              حالة كلمة المرور:{' '}
                              <span className={leader.mustChangePassword ? 'text-amber-300' : 'text-emerald-300'}>
                                {leader.mustChangePassword ? 'بانتظار التغيير' : 'تم التغيير'}
                              </span>
                            </span>
                            {leader.createdAt ? <span>أضيف في {new Date(leader.createdAt).toLocaleDateString('ar-EG')}</span> : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <CreateLeaderForm headId={head.id} headName={head.displayName} onCreated={reload} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


