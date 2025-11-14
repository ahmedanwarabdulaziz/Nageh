'use client';

import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-brand-black)]">
      <div className="glass-panel w-full max-w-md rounded-3xl p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-heading text-[var(--color-brand-gold)]">تسجيل دخول الفريق</h1>
          <p className="mt-3 text-sm text-white/70">
            الوصول مسموح للمشرف الأعلى، المشرف، رؤساء الفرق، القادة والمشاهدين.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-white/50">
          بحاجة إلى حساب؟ تواصل مع المشرف الأعلى على المنصة لتفعيل حسابك.
        </p>
        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-[var(--color-brand-gold)] underline">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

