'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, UsersThree, Sparkle, ShieldCheck } from '@phosphor-icons/react/dist/ssr';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/components/providers/AuthProvider';
import { APP_ROLES, AppRole, UNKNOWN_ROLE, getRoleHomePath } from '@/lib/auth/roles';

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (role === UNKNOWN_ROLE) return;

    if (APP_ROLES.includes(role as AppRole)) {
      setIsLoginOpen(false);
      router.replace(getRoleHomePath(role as AppRole));
    }
  }, [loading, role, router]);

  return (
    <main className="rtl-container">
      <section className="relative overflow-hidden bg-[var(--color-brand-black)]">
        <div className="absolute inset-0 opacity-60 gold-gradient" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center">
          <span className="mb-4 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-bold tracking-wide text-[var(--color-brand-gold)] shadow-lg backdrop-blur">
            منصة انتخابية احترافية
            <Sparkle size={20} weight="fill" />
          </span>
          <h1 className="mb-6 max-w-3xl font-heading text-4xl leading-tight text-white md:text-5xl lg:text-6xl">
            نُعزز فريق الحملة الانتخابية للوصول إلى كل عضو بثقة وشفافية
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-white/85 md:text-xl">
            إدارة تفاعلية لفرق الحملة، متابعة الأصوات، تنظيم فرق العمل، وتجهيز يوم
            الانتخاب بخطة واضحة وسهلة الاستخدام على الأجهزة الذكية.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-lg">
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-2 rounded-full bg-[var(--color-brand-gold)] px-8 py-3 font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
            >
              تسجيل الدخول للفريق
              <ArrowRight size={20} weight="bold" />
            </button>
            <Link
              href="#features"
              className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-3 font-semibold text-white transition hover:border-white/40 hover:text-[var(--color-brand-gold)]"
            >
              تعرف على الإمكانات
            </Link>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-24 text-white md:grid md:grid-cols-3"
      >
        <FeatureCard
          icon={<UsersThree size={32} weight="duotone" />}
          title="إدارة مرنة للفرق"
          description="إنشاء رؤساء الفرق والقيادات الميدانية، وتوزيع الأعضاء ضمن مجموعات للوصول السريع والمتابعة الدقيقة."
        />
        <FeatureCard
          icon={<ShieldCheck size={32} weight="duotone" />}
          title="صلاحيات واضحة وآمنة"
          description="أدوار متعددة تشمل المشرف الأعلى والمشرف العام والرؤساء والقيادات والمشاهد، مع صلاحيات متدرجة لضمان الأمان."
        />
        <FeatureCard
          icon={<Sparkle size={32} weight="duotone" />}
          title="متابعة آنية يوم الانتخاب"
          description="لوحة تحكم مباشرة تبين حالة التصويت، الأعضاء المتأخرين، وحالات التواصل لضمان تحقيق الأهداف."
        />
      </section>

      <section className="bg-white text-[var(--color-brand-black)]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="mb-16 text-center font-heading text-4xl text-[var(--color-brand-black)]">
            قيمنا في الحملة
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: 'الموثوقية',
                description:
                  'سجلات محدثة وتدقيق كامل على البيانات والملاحظات مع تتبع لكل تغيير يتم في المنصة.',
              },
              {
                title: 'السرعة',
                description:
                  'إدارة تفاعلية تحدث في الوقت الحقيقي عبر Firebase Firestore لتسهيل الاستجابة السريعة.',
              },
              {
                title: 'الاحترافية',
                description:
                  'تصميم عربي أنيق بألوان الأسود والذهبي والأبيض يضمن تجربة استخدام سلسة لأعضاء الفريق.',
              },
            ].map((value) => (
              <article key={value.title} className="rounded-3xl border border-black/10 p-8 shadow-lg">
                <h3 className="mb-4 font-heading text-2xl text-[var(--color-brand-gold)]">
                  {value.title}
                </h3>
                <p className="text-base text-black/70">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--color-brand-black)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center text-white">
          <h2 className="font-heading text-4xl">
            جاهزون ليوم الانتخاب بثقة ورؤية واضحة
          </h2>
          <p className="max-w-2xl text-lg text-white/80">
            راقب الأداء لحظة بلحظة، نسّق بين الفرق، وحدد أولويات التواصل مع الأعضاء، كل ذلك من منصة واحدة.
          </p>
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--color-brand-gold)] px-10 py-3 text-lg font-semibold text-[var(--color-brand-black)] transition hover:bg-[#e3c874]"
          >
            تسجيل الدخول للفريق
            <ArrowRight size={20} weight="bold" />
          </button>
        </div>
      </section>

      {isLoginOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsLoginOpen(false)}
        >
          <div
            className="glass-panel relative w-full max-w-lg rounded-3xl p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="absolute left-6 top-6 text-sm text-white/50 transition hover:text-white"
              aria-label="إغلاق"
            >
              إغلاق ×
            </button>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">تسجيل دخول الفريق</h2>
              <p className="mt-3 text-sm text-white/70">
                يرجى إدخال بيانات الوصول الممنوحة لك من المشرف الأعلى.
              </p>
            </div>
            <LoginForm onSuccess={() => setIsLoginOpen(false)} />
            <p className="mt-6 text-center text-xs text-white/50">
              بحاجة إلى حساب؟ تواصل مع المشرف الأعلى على المنصة لتفعيل حسابك.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="glass-panel flex flex-col gap-4 rounded-3xl p-8 shadow-xl">
      <div className="flex items-center justify-between text-[var(--color-brand-gold)]">
        <span className="text-sm font-semibold text-white/60">مزايا ميدانية</span>
        {icon}
      </div>
      <h3 className="font-heading text-2xl text-white">{title}</h3>
      <p className="text-white/80">{description}</p>
    </article>
  );
}


