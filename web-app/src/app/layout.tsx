import './globals.css';
import type { Metadata } from 'next';
import { Tajawal, El_Messiri } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';

const headingFont = El_Messiri({
  subsets: ['arabic', 'latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const bodyFont = Tajawal({
  subsets: ['arabic', 'latin'],
  variable: '--font-body',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'منصة الحملة الانتخابية',
  description: 'إدارة فريق الحملة الانتخابية للنادي بكل احترافية وسرعة.',
  manifest: '/manifest.json',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ar" dir="rtl" className={`${headingFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-[var(--color-brand-black)] text-[var(--color-brand-white)]">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}


