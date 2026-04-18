import { redirect } from 'next/navigation';
import { TopNav } from '@/components/layout/top-nav';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isCurrentUserAdmin } from '@/lib/data/repository';
import { ChatFloatButton } from '@/components/chat/chat-float-button';

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
    <>
      <TopNav userEmail={user.email ?? ''} isAdmin={isAdmin} />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      <ChatFloatButton />
    </>
  );
}
