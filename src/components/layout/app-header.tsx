'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User, ShieldCheck, X } from 'lucide-react';

const settingsItems = [
  { href: '/admin/users', label: 'ユーザー管理' },
  { href: '/ng', label: 'NG店舗管理' },
  { href: '/targets', label: '目標管理' },
  { href: '/referrals', label: '取次' },
  { href: '/connections', label: '通電' },
  { href: '/brokerage', label: '成約' },
  { href: '/dashboard/edit', label: 'ダッシュボード編集' },
];

interface AppHeaderProps {
  userEmail?: string;
  isAdmin?: boolean;
}

export function AppHeader({ userEmail, isAdmin }: AppHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-6 shadow-sm">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center">
        <span className="text-2xl font-extrabold text-[#F76FAB] tracking-tight">KamisamaCRM</span>
      </Link>

      {/* Right: user pill + hamburger */}
      <div className="flex items-center gap-3">
        {userEmail && (
          <div className="flex items-center gap-2 rounded-full bg-gray-50 py-1 pl-1 pr-3 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-500">
              <User className="h-4 w-4" />
            </span>
            <span className="text-xs text-gray-600">{userEmail}</span>
            {isAdmin && (
              <span className="rounded-full bg-[#F76FAB] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
                admin
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#F76FAB] hover:bg-pink-50"
          aria-label="設定メニュー"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Settings dropdown */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed right-4 top-14 z-50 w-56 overflow-hidden rounded-lg border border-pink-100 bg-white py-1 shadow-xl">
            <div className="flex items-center gap-1.5 border-b border-pink-100 px-3 py-2 text-xs font-medium text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#F76FAB]" />
              管理コンソール
            </div>
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
    </header>
  );
}
