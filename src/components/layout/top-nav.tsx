'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Store,
  Upload,
  Menu,
  LogOut,
  User,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/agencies', label: '代理店', icon: Building2 },
  { href: '/stores', label: '店舗', icon: Store },
  { href: '/import', label: 'データ読込', icon: Upload },
];

const settingsItems = [
  { href: '/admin/users', label: 'ユーザー管理', icon: ShieldCheck },
  { href: '/ng', label: 'NG店舗管理', icon: Store },
  { href: '/targets', label: '目標管理', icon: Store },
  { href: '/referrals', label: '取次', icon: Store },
  { href: '/connections', label: '通電', icon: Store },
  { href: '/brokerage', label: '成約', icon: Store },
];

interface TopNavProps {
  userEmail?: string;
  isAdmin?: boolean;
}

export function TopNav({ userEmail, isAdmin }: TopNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ページ遷移時にメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  // ESC で閉じる
  useEffect(() => {
    if (!menuOpen && !mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setMobileNavOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, mobileNavOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-6">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="ナビゲーション"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#F76FAB]">KamisamaCRM</span>
            <span className="hidden rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-medium text-pink-400 sm:inline">
              {APP_VERSION}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-pink-50 text-[#F76FAB]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: User + Settings */}
        <div className="flex items-center gap-2">
          {userEmail && (
            <div className="hidden items-center gap-1.5 text-xs text-gray-500 md:flex">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">{userEmail}</span>
            </div>
          )}

          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </form>

          {/* Settings hamburger (right) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
              aria-label="設定メニュー"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </nav>

      {/* Settings dropdown (right hamburger) */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed right-4 top-14 z-50 w-56 rounded-lg border bg-white py-1 shadow-lg">
            <div className="border-b px-3 py-2 text-xs font-medium text-gray-400">管理コンソール</div>
            {settingsItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-[#F76FAB]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="fixed left-0 right-0 top-14 z-50 border-b bg-white py-2 shadow-lg lg:hidden">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium',
                    isActive ? 'bg-pink-50 text-[#F76FAB]' : 'text-gray-700'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
