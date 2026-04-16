import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
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
      <Sidebar userEmail={user.email ?? ''} isAdmin={isAdmin} />
      <main className="min-h-full lg:ml-64">{children}</main>
      <ChatFloatButton />
    </>
  );
}
