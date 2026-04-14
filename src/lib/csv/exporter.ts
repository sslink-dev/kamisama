import Papa from 'papaparse';
import { supabase } from '@/lib/supabase/client';
import { CSV_HEADERS } from './constants';

export function generateEmptyTemplate(): string {
  return Papa.unparse({ fields: [...CSV_HEADERS], data: [] });
}

export async function exportAllData(): Promise<string> {
  // Fetch all stores
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('number');

  if (!stores || stores.length === 0) return generateEmptyTemplate();

  // Fetch all metrics
  const allMetrics: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from('monthly_metrics')
      .select('store_id, year_month, referrals, brokerage, referral_rate, target_referrals')
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    allMetrics.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Group metrics by store_id
  const metricsByStore = new Map<string, Record<string, unknown>[]>();
  allMetrics.forEach(m => {
    const storeId = m.store_id as string;
    const arr = metricsByStore.get(storeId) || [];
    arr.push(m);
    metricsByStore.set(storeId, arr);
  });

  // Build CSV rows
  const rows: string[][] = [];
  for (const store of stores) {
    const storeMetrics = metricsByStore.get(store.id) || [];

    if (storeMetrics.length === 0) {
      // Store with no metrics - still include one row
      rows.push([
        store.code,
        store.name,
        store.agency_name || '',
        store.company_name || '',
        store.unit || '',
        store.rank || '',
        store.company_flag || '',
        store.is_ng ? '1' : '0',
        store.ng_reason || '',
        store.ng_month || '',
        store.is_priority ? '1' : '0',
        store.is_priority_q3 ? '1' : '0',
        '', '', '', '', '',
      ]);
    } else {
      for (const m of storeMetrics) {
        rows.push([
          store.code,
          store.name,
          store.agency_name || '',
          store.company_name || '',
          store.unit || '',
          store.rank || '',
          store.company_flag || '',
          store.is_ng ? '1' : '0',
          store.ng_reason || '',
          store.ng_month || '',
          store.is_priority ? '1' : '0',
          store.is_priority_q3 ? '1' : '0',
          (m.year_month as string) || '',
          String(m.referrals ?? ''),
          String(m.brokerage ?? ''),
          m.referral_rate != null ? String(m.referral_rate) : '',
          String(m.target_referrals ?? ''),
        ]);
      }
    }
  }

  return Papa.unparse({ fields: [...CSV_HEADERS], data: rows });
}

export function downloadCsv(csvString: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
