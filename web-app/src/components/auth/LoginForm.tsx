'use client';

import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

type LoginFormProps = {
  onSuccess?: () => void;
};

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('تعذر تسجيل الدخول، يرجى التحقق من البيانات.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">البريد الإلكتروني</span>
        <input
          dir="ltr"
          type="email"
          required
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
          placeholder="team@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">كلمة المرور</span>
        <input
          type="password"
          required
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-[var(--color-brand-gold)] focus:outline-none"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-full bg-[var(--color-brand-gold)] px-4 py-3 text-lg font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
        disabled={loading}
      >
        {loading ? 'جاري التحقق...' : 'دخول'}
      </button>
    </form>
  );
}



