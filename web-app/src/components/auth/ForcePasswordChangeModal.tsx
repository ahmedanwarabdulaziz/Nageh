'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';
import { firebaseAuth } from '@/lib/firebase/client';

export function ForcePasswordChangeModal() {
  const { role, profile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const mustChange =
    (role === 'teamHead' || role === 'teamLeader') && Boolean(profile?.mustChangePassword);
  const shouldShow = mustChange && !dismissed;

  useEffect(() => {
    if (!mustChange) {
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
      setSubmitting(false);
      setDismissed(false);
    }
  }, [mustChange]);

  useEffect(() => {
    if (mustChange) {
      setDismissed(false);
    }
  }, [mustChange]);

  if (!shouldShow) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: password }),
      });
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      await firebaseAuth.currentUser?.getIdToken(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg space-y-6 rounded-3xl bg-[#0f1016] p-8 text-white shadow-2xl">
        <header className="space-y-3">
          <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">تغيير كلمة المرور</h2>
          <p className="text-sm text-white/70">
            هذه أول مرة تسجّل فيها الدخول. يجب عليك تعيين كلمة مرور جديدة قبل متابعة العمل على
            النظام.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-white/80">
            كلمة المرور الجديدة
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
              placeholder="••••••••"
            />
          </label>
          <label className="block text-sm text-white/80">
            تأكيد كلمة المرور
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {success ? (
            <div className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <p>تم تحديث كلمة المرور بنجاح.</p>
              <button
                type="button"
                className="w-full rounded-full border border-emerald-400/40 bg-transparent px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/10"
                onClick={() => setDismissed(true)}
              >
                متابعة إلى لوحة التحكم
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--color-brand-gold)] px-4 py-3 text-lg font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
              disabled={submitting}
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ ومتابعة'}
            </button>
          )}
        </form>

        <footer className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
          <p>تذكر اختيار كلمة مرور قوية تتكون من أحرف وأرقام ورموز لحماية حسابك.</p>
        </footer>
      </div>
    </div>
  );
}


