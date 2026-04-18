'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Store,
  Upload,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';

const mainItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/agencies', label: '代理店', icon: Building2 },
  { href: '/stores', label: '店舗', icon: Store },
];

const dataItems = [
  { href: '/import', label: 'データ読込', icon: Upload },
];

export function AppSidebar() {
  const pathname = usePathname();

  const renderItem = (item: { href: string; label: string; icon: typeof LayoutDashboard }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors',
          isActive
            ? 'bg-white text-[#F76FAB] shadow-sm'
            : 'text-white/95 hover:bg-white/15'
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="leading-tight">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col bg-[#F76FAB] py-4">
      {/* Top spacer to align under header logo */}
      <div className="h-12" />

      {/* Main nav */}
      <nav className="flex flex-col gap-2 px-2">
        {mainItems.map(renderItem)}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-4 h-px bg-white/40" />

      {/* Data */}
      <nav className="flex flex-col gap-2 px-2">
        {dataItems.map(renderItem)}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-4 h-px bg-white/40" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout + version */}
      <div className="px-2">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium text-white/95 transition-colors hover:bg-white/15"
            title="ログアウト"
          >
            <LogOut className="h-5 w-5" />
            <span className="leading-tight">ログアウト</span>
          </button>
        </form>
        <div className="mt-2 text-center text-[10px] text-white/80">{APP_VERSION}</div>
      </div>
    </aside>
  );
}
