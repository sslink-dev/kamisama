import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  return (
    <>
      <Sidebar userEmail={user.email ?? ''} />
      <main className="ml-64 min-h-full">{children}</main>
    </>
  );
}
