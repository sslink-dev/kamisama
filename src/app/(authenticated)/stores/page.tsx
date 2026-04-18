import { Suspense } from 'react';
import { StoreTable } from '@/components/stores/store-table';
import { StoreClientFilters } from '@/components/stores/store-filters';
import { ActiveFilterChips } from '@/components/stores/active-filter-chips';
import {
  getStoresWithLatestMetrics,
  getAvailableMonths,
  getAgencies,
  getUnits,
  getRanks,
  getCompanyFlags,
  getNgReasons,
  getCompanies,
} from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{
    agency?: string;
    unit?: string;
    rank?: string;
    ng?: string;
    flag?: string;
    reason?: string;
    priority?: string;
    priorityQ3?: string;
    company?: string;
  }>;
}) {
  const params = await searchParams;
  const filters = {
    ...(params.agency ? { agencyId: params.agency } : {}),
    ...(params.unit ? { unit: params.unit } : {}),
    ...(params.rank ? { rank: params.rank } : {}),
    ...(params.ng === 'ng' ? { isNg: true } : params.ng === 'active' ? { isNg: false } : {}),
    ...(params.flag ? { companyFlag: params.flag } : {}),
    ...(params.reason ? { ngReason: params.reason } : {}),
    ...(params.priority === '1' ? { isPriority: true } : {}),
    ...(params.priorityQ3 === '1' ? { isPriorityQ3: true } : {}),
    ...(params.company ? { companyId: params.company } : {}),
  };

  const [stores, agencies, units, ranks, flags, reasons, companies] = await Promise.all([
    getAvailableMonths().then(ms => ms[ms.length - 1]).then(latest =>
      getStoresWithLatestMetrics(
        Object.keys(filters).length > 0 ? filters : undefined,
        latest
      )
    ),
    getAgencies(),
    getUnits(),
    getRanks(),
    getCompanyFlags(),
    getNgReasons(),
    getCompanies(),
  ]);

  return (
    <div className="space-y-4 px-8 py-6">
      <Suspense fallback={null}>
        <StoreClientFilters
          agencies={agencies}
          units={units}
          ranks={ranks}
          flags={flags}
          reasons={reasons}
          companies={companies}
        />
        <ActiveFilterChips
          agencies={agencies}
          companies={companies}
        />
      </Suspense>
      <StoreTable stores={stores} />
    </div>
  );
}
