'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
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

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <h1 className="text-xl font-bold text-gray-900">神様CRM</h1>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
          {APP_VERSION}
        </span>
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
  );
}
