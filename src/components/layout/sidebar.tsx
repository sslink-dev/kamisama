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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/stores', label: '店舗一覧', icon: Store },
  { href: '/agencies', label: '代理店分析', icon: Building2 },
  { href: '/ng', label: 'NG店舗管理', icon: AlertTriangle },
  { href: '/targets', label: '目標管理', icon: Target },
  { href: '/import', label: 'データ取込', icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-gray-900">
          神様CRM
        </h1>
      </div>
      <nav className="space-y-1 p-4">
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
      </nav>
    </aside>
  );
}
