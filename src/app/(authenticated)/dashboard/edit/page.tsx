import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { DashboardEditor } from '@/components/dashboard/editor/dashboard-editor';
import {
  getDashboardLayout,
  getAvailableMonths,
  getAgencies,
  getUnits,
  isCurrentUserAdmin,
} from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export default async function DashboardEditPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect('/dashboard');
  }

  const [widgets, months, agencies, units] = await Promise.all([
    getDashboardLayout(),
    getAvailableMonths(),
    getAgencies(),
    getUnits(),
  ]);
  const historicalMonths = months;

  return (
    <>
      <Header title="ダッシュボード編集" />
      <div className="p-6">
        <DashboardEditor
          initialWidgets={widgets}
          agencies={agencies}
          units={units}
          historicalMonths={historicalMonths}
        />
      </div>
    </>
  );
}
