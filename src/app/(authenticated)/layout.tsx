import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isCurrentUserAdmin } from '@/lib/data/repository';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-screen bg-[#EFF3F8]">
      <AppSidebar />
      <div className="ml-[88px] flex min-h-screen flex-col">
        <AppHeader userEmail={user.email ?? ''} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
