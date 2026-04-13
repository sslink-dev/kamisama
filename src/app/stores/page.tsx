import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { StoreTable } from '@/components/stores/store-table';
import { StoreClientFilters } from '@/components/stores/store-filters';
import {
  getStoresWithLatestMetrics,
  getAgencies,
  getUnits,
  getRanks,
} from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ agency?: string; unit?: string; rank?: string; ng?: string }>;
}) {
  const params = await searchParams;
  const filters = {
    ...(params.agency ? { agencyId: params.agency } : {}),
    ...(params.unit ? { unit: params.unit } : {}),
    ...(params.rank ? { rank: params.rank } : {}),
    ...(params.ng === 'ng' ? { isNg: true } : params.ng === 'active' ? { isNg: false } : {}),
  };

  const [stores, agencies, units, ranks] = await Promise.all([
    getStoresWithLatestMetrics(
      Object.keys(filters).length > 0 ? filters : undefined,
      '2503'
    ),
    getAgencies(),
    getUnits(),
    getRanks(),
  ]);

  return (
    <>
      <Header title="店舗一覧" />
      <div className="space-y-4 p-6">
        <Suspense fallback={null}>
          <StoreClientFilters
            agencies={agencies}
            units={units}
            ranks={ranks}
          />
        </Suspense>
        <StoreTable stores={stores} />
      </div>
    </>
  );
}
