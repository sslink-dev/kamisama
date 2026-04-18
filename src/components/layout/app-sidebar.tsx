'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Store,
  Upload,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';
import { ChatDrawer } from '@/components/chat/chat-drawer';

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
  const [chatOpen, setChatOpen] = useState(false);

  const renderItem = (item: { href: string; label: string; icon: typeof LayoutDashboard }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="group flex flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-bold text-white"
      >
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            isActive
              ? 'bg-white text-[#F76FAB] shadow-sm'
              : 'text-white group-hover:bg-white/15'
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="leading-tight">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col bg-[#F76FAB] py-4">
        {/* Top spacer to align under header logo */}
        <div className="h-12" />

        {/* Main nav */}
        <nav className="flex flex-col gap-1 px-2">
          {mainItems.map(renderItem)}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-3 h-px bg-white/40" />

        {/* Data */}
        <nav className="flex flex-col gap-1 px-2">
          {dataItems.map(renderItem)}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-3 h-px bg-white/40" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI chat trigger - integrated into sidebar */}
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="group flex w-full flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-bold text-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#F76FAB] shadow-md ring-2 ring-pink-200 transition-transform group-hover:scale-105 group-active:scale-95">
              <Sparkles className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="leading-tight">AIチャット</span>
          </button>
        </div>

        {/* Logout */}
        <div className="px-2">
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="group flex w-full flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-bold text-white"
              title="ログアウト"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white group-hover:bg-white/15">
                <LogOut className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <span className="leading-tight">ログアウト</span>
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] font-semibold text-white/85">
            {APP_VERSION}
          </div>
        </div>
      </aside>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
