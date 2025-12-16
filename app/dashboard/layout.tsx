import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session?.userId) {
    redirect('/login');
  }

  return <>{children}</>;
}
