export default function CreateHeadPage() {
  return (
    <section className="max-w-2xl space-y-6">
      <header>
        <h2 className="text-2xl font-heading text-[var(--color-brand-gold)]">إضافة رئيس فريق جديد</h2>
        <p className="text-sm text-white/60">
          أدخل بيانات الرئيس الجديد، وسيتم إنشاء حسابه بصلاحيات رئيس فريق. (النموذج سيكتمل لاحقاً)
        </p>
      </header>
      <div className="glass-panel rounded-3xl p-6 text-white/60">
        سيتم بناء نموذج إنشاء رئيس الفريق هنا مع إدخال البريد الإلكتروني، رقم الجوال، الصلاحيات، والتعيين لفريق محدد.
      </div>
    </section>
  );
}


