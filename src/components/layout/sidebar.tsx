'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Building2,
  AlertTriangle,
  Target,
  Upload,
  LogOut,
  User,
  ShieldCheck,
  Handshake,
  Zap,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/referrals', label: '取次', icon: Handshake },
  { href: '/connections', label: '通電', icon: Zap },
  { href: '/brokerage', label: '成約', icon: CheckCircle2 },
  { href: '/stores', label: '店舗一覧', icon: Store },
  { href: '/agencies', label: '代理店分析', icon: Building2 },
  { href: '/ng', label: 'NG店舗管理', icon: AlertTriangle },
  { href: '/targets', label: '目標管理', icon: Target },
  { href: '/import', label: 'データ管理', icon: Upload },
];

const adminNavItems = [
  { href: '/admin/users', label: 'ユーザー管理', icon: ShieldCheck },
];

interface SidebarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

export function Sidebar({ userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ページ遷移時にモバイル用ドロワーを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // モバイルでドロワーが開いている間は背面スクロールを止める
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* モバイル用ハンバーガー (lg 未満で表示) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-gray-700 shadow-sm hover:bg-gray-50 lg:hidden"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* モバイル用バックドロップ */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-white transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <h1 className="text-xl font-bold text-gray-900">神様CRM</h1>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            {APP_VERSION}
          </span>
          {/* モバイル用クローズボタン */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="メニューを閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-3 border-t" />
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                管理
              </div>
              {adminNavItems.map(item => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {userEmail && (
          <div className="border-t p-4">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs text-gray-500">
              <User className="h-3.5 w-3.5" />
              <span className="truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
