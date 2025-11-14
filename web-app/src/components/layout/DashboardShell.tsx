'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Route } from 'next';
import {
  Gauge,
  UsersFour,
  UserList,
  MapTrifold,
  IdentificationBadge,
  ListMagnifyingGlass,
  PhoneCall,
  Stack,
  List,
  X,
} from '@phosphor-icons/react/dist/ssr';
import { APP_ROLES, AppRole, getRoleHomePath } from '@/lib/auth/roles';
import { useAuth } from '@/components/providers/AuthProvider';
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal';

type NavLink = { href: Route; label: string; icon: React.ReactNode };

const NAV_ITEMS: Record<AppRole, NavLink[]> = {
  superAdmin: [
    { href: '/admin', label: 'لوحة المشرف الأعلى', icon: <Gauge size={22} weight="duotone" /> },
    { href: '/admin/members', label: 'قاعدة الأعضاء', icon: <UserList size={22} weight="duotone" /> },
    { href: '/admin/team', label: 'الرؤساء والقادة', icon: <UsersFour size={22} weight="duotone" /> },
    { href: '/dashboard/overview', label: 'نظرة عامة', icon: <Stack size={22} weight="duotone" /> },
    { href: '/dashboard/heads', label: 'رؤساء الفرق', icon: <UsersFour size={22} weight="duotone" /> },
    { href: '/dashboard/leaders', label: 'قادة الفرق', icon: <IdentificationBadge size={22} weight="duotone" /> },
    { href: '/dashboard/groups', label: 'المجموعات', icon: <MapTrifold size={22} weight="duotone" /> },
    { href: '/dashboard/duplicates', label: 'إدارة التكرارات', icon: <ListMagnifyingGlass size={22} weight="duotone" /> },
    { href: '/dashboard/election-day', label: 'يوم الانتخاب', icon: <PhoneCall size={22} weight="duotone" /> },
  ],
  admin: [
    { href: '/dashboard/admin', label: 'لوحة المشرف', icon: <Gauge size={22} weight="duotone" /> },
    { href: '/dashboard/overview', label: 'نظرة عامة', icon: <Stack size={22} weight="duotone" /> },
    { href: '/admin/team', label: 'الرؤساء والقادة', icon: <UsersFour size={22} weight="duotone" /> },
    { href: '/dashboard/leaders', label: 'قادة الفرق', icon: <IdentificationBadge size={22} weight="duotone" /> },
    { href: '/dashboard/members', label: 'قاعدة الأعضاء', icon: <UserList size={22} weight="duotone" /> },
    { href: '/dashboard/groups', label: 'المجموعات', icon: <MapTrifold size={22} weight="duotone" /> },
    { href: '/dashboard/duplicates', label: 'إدارة التكرارات', icon: <ListMagnifyingGlass size={22} weight="duotone" /> },
    { href: '/dashboard/election-day', label: 'يوم الانتخاب', icon: <PhoneCall size={22} weight="duotone" /> },
  ],
  teamHead: [
    { href: '/headers/dashboard', label: 'لوحة رئيس الفريق', icon: <Gauge size={22} weight="duotone" /> },
    { href: '/headers/leaders', label: 'قادة الفريق', icon: <IdentificationBadge size={22} weight="duotone" /> },
    { href: '/headers/members', label: 'قاعدة الأعضاء', icon: <UserList size={22} weight="duotone" /> },
    { href: '/headers/my-members', label: 'أعضاءي', icon: <List size={22} weight="duotone" /> },
    { href: '/dashboard/groups', label: 'المجموعات', icon: <MapTrifold size={22} weight="duotone" /> },
    { href: '/dashboard/election-day', label: 'يوم الانتخاب', icon: <PhoneCall size={22} weight="duotone" /> },
  ],
  teamLeader: [
    { href: '/leaders/members', label: 'كشف الأعضاء', icon: <UserList size={22} weight="duotone" /> },
    { href: '/leaders/my-members', label: 'أعضاءي', icon: <List size={22} weight="duotone" /> },
  ],
  viewer: [
    { href: '/dashboard/viewer', label: 'لوحة المشاهد', icon: <Gauge size={22} weight="duotone" /> },
    { href: '/dashboard/overview', label: 'نظرة عامة', icon: <Stack size={22} weight="duotone" /> },
    { href: '/dashboard/members', label: 'كشف الأعضاء', icon: <UserList size={22} weight="duotone" /> },
  ],
};

type DashboardShellProps = {
  children: ReactNode;
};

type NavVariant = 'sidebar' | 'inline';

function linkClasses(isActive: boolean, variant: NavVariant) {
  if (variant === 'inline') {
    return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
      isActive ? 'bg-white/10 text-[var(--color-brand-gold)]' : 'text-white hover:text-[var(--color-brand-gold)]'
    }`;
  }

  const base = 'flex items-center justify-between rounded-2xl px-4 py-3 transition';
  return `${base} ${
    isActive
      ? 'bg-white/15 text-[var(--color-brand-gold)]'
      : 'text-white hover:bg-white/10'
  }`;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { role } = useAuth();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = APP_ROLES.includes(role as AppRole)
    ? NAV_ITEMS[role as AppRole]
    : NAV_ITEMS.superAdmin;

  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileNav();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMobileNav, isMobileNavOpen]);

  const roleLabel =
    role === 'superAdmin'
      ? 'مشرف أعلى'
      : role === 'admin'
        ? 'مشرف'
        : role === 'teamHead'
          ? 'رئيس فريق'
          : role === 'teamLeader'
            ? 'قائد فريق'
            : role === 'viewer'
              ? 'مشاهد'
              : 'عضو';

  const renderNavLinks = (variant: NavVariant, onNavigate?: () => void) =>
    navItems.map((item) => {
      const isActive = pathname?.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={linkClasses(isActive ?? false, variant)}
        >
          <span>{item.label}</span>
          {variant !== 'inline' ? item.icon : null}
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen bg-[var(--color-brand-black)] text-white">
      <aside className="hidden w-full max-w-xs flex-col gap-6 border-l border-white/10 bg-black/40 px-6 py-10 backdrop-blur lg:flex lg:max-w-sm">
        <Link
          href={getRoleHomePath((role as AppRole) ?? 'superAdmin')}
          className="flex items-center justify-between text-2xl font-heading text-[var(--color-brand-gold)]"
        >
          الحملة
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">نسخة تجريبية</span>
        </Link>
        <nav className="flex flex-col gap-2 text-lg">{renderNavLinks('sidebar')}</nav>
      </aside>
      <section className="flex w-full flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href={getRoleHomePath((role as AppRole) ?? 'superAdmin')}
              className="flex items-center gap-2 text-xl font-heading text-[var(--color-brand-gold)] sm:text-2xl"
            >
              <span>الحملة</span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">نسخة تجريبية</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-white/60 sm:inline">{roleLabel}</span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 lg:hidden"
                aria-label="فتح القائمة"
              aria-expanded={isMobileNavOpen}
              >
                <List size={20} weight="bold" />
              </button>
            </div>
          </div>
          <nav className="hidden items-center gap-3 px-4 pb-3 text-sm text-white/80 md:flex lg:hidden">
            {renderNavLinks('inline')}
          </nav>
          <nav className="hidden items-center gap-2 px-6 pb-4 text-sm text-white/80 lg:flex">
            {renderNavLinks('inline')}
          </nav>
        </header>
        <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </section>

      <MobileNavDrawer
        open={isMobileNavOpen}
        onClose={closeMobileNav}
        navItems={navItems}
        pathname={pathname ?? ''}
        roleLabel={roleLabel}
        homeHref={getRoleHomePath((role as AppRole) ?? 'superAdmin')}
      />
      <ForcePasswordChangeModal />
    </div>
  );
}

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  navItems: NavLink[];
  pathname: string;
  roleLabel: string;
  homeHref: Route;
};

function MobileNavDrawer({ open, onClose, navItems, pathname, roleLabel, homeHref }: MobileNavDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      } transition-opacity duration-200`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 right-0 flex flex-col">
        <div className="mx-auto mt-6 w-[92%] max-w-md flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-black/90 to-black/70 shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Link href={homeHref} className="text-lg font-heading text-[var(--color-brand-gold)]" onClick={onClose}>
              لوحة {roleLabel}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white/40"
              aria-label="إغلاق القائمة"
            >
              <X size={20} weight="bold" />
            </button>
          </header>
          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-6">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base transition ${
                    isActive
                      ? 'bg-white/15 text-[var(--color-brand-gold)]'
                      : 'text-white hover:bg-white/10 hover:text-[var(--color-brand-gold)]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-white/60">{item.icon}</span>
                </Link>
              );
            })}
          </nav>
          <footer className="border-t border-white/10 px-5 py-4 text-xs text-white/60">
            اختر الصفحة التي ترغب في إدارتها. يمكنك إغلاق القائمة بالسحب لأسفل أو الضغط على زر الإغلاق.
          </footer>
        </div>
      </div>
    </div>
  );
}


