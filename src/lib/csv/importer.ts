import { supabase } from '@/lib/supabase/client';
import type { ParsedStore, ParsedMetric } from './parser';

export interface ImportResult {
  agenciesCreated: number;
  companiesCreated: number;
  storesUpserted: number;
  metricsUpserted: number;
  errors: string[];
}

export async function importToSupabase(
  stores: ParsedStore[],
  metrics: ParsedMetric[],
  onProgress?: (step: string, current: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = {
    agenciesCreated: 0,
    companiesCreated: 0,
    storesUpserted: 0,
    metricsUpserted: 0,
    errors: [],
  };

  // 1. Upsert agencies
  const agencyNames = [...new Set(stores.map(s => s.agencyName).filter(Boolean))];
  onProgress?.('代理店を登録中...', 0, agencyNames.length);

  // Fetch existing agencies
  const { data: existingAgencies } = await supabase.from('agencies').select('id, name');
  const agencyMap = new Map((existingAgencies || []).map(a => [a.name, a.id]));

  let nextAgencyNum = (existingAgencies || []).length + 1;
  for (const name of agencyNames) {
    if (!agencyMap.has(name)) {
      const id = `ag-${String(nextAgencyNum++).padStart(3, '0')}`;
      const { error } = await supabase.from('agencies').upsert({ id, name }, { onConflict: 'name' });
      if (error) {
        result.errors.push(`代理店「${name}」: ${error.message}`);
      } else {
        agencyMap.set(name, id);
        result.agenciesCreated++;
      }
    }
  }

  // 2. Upsert companies
  const companyNames = [...new Set(stores.map(s => s.companyName).filter(Boolean))];
  onProgress?.('企業を登録中...', 0, companyNames.length);

  const { data: existingCompanies } = await supabase.from('companies').select('id, name');
  const companyMap = new Map((existingCompanies || []).map(c => [c.name, c.id]));

  let nextCompanyNum = (existingCompanies || []).length + 1;
  for (const name of companyNames) {
    if (!companyMap.has(name)) {
      const store = stores.find(s => s.companyName === name);
      const id = `co-${String(nextCompanyNum++).padStart(4, '0')}`;
      const { error } = await supabase.from('companies').upsert({
        id,
        name,
        agency_id: store ? agencyMap.get(store.agencyName) || null : null,
      }, { onConflict: 'id' });
      if (error) {
        result.errors.push(`企業「${name}」: ${error.message}`);
      } else {
        companyMap.set(name, id);
        result.companiesCreated++;
      }
    }
  }

  // 3. Upsert stores
  onProgress?.('店舗を登録中...', 0, stores.length);

  // Fetch existing stores to get IDs
  const { data: existingStores } = await supabase.from('stores').select('id, code');
  const storeCodeToId = new Map((existingStores || []).map(s => [s.code, s.id]));
  let nextStoreNum = (existingStores || []).length + 1;

  const storeRows = stores.map(s => {
    let id = storeCodeToId.get(s.code);
    if (!id) {
      id = `st-${String(nextStoreNum++).padStart(5, '0')}`;
      storeCodeToId.set(s.code, id);
    }
    return {
      id,
      code: s.code,
      name: s.name,
      agency_id: agencyMap.get(s.agencyName) || null,
      agency_name: s.agencyName,
      company_id: companyMap.get(s.companyName) || null,
      company_name: s.companyName,
      unit: s.unit || null,
      rank: s.rank || null,
      company_flag: s.companyFlag || null,
      is_ng: s.isNg,
      ng_reason: s.ngReason || null,
      ng_month: s.ngMonth || null,
      is_priority: s.isPriority,
      is_priority_q3: s.isPriorityQ3,
    };
  });

  for (let i = 0; i < storeRows.length; i += 500) {
    const chunk = storeRows.slice(i, i + 500);
    onProgress?.('店舗を登録中...', i, storeRows.length);
    const { error } = await supabase.from('stores').upsert(chunk, { onConflict: 'code' });
    if (error) {
      result.errors.push(`店舗バッチ${i}: ${error.message}`);
    } else {
      result.storesUpserted += chunk.length;
    }
  }

  // 4. Upsert metrics
  onProgress?.('メトリクスを登録中...', 0, metrics.length);

  const metricRows = metrics.map(m => ({
    store_id: storeCodeToId.get(m.storeCode) || '',
    year_month: m.yearMonth,
    referrals: m.referrals,
    brokerage: m.brokerage,
    referral_rate: m.referralRate,
    target_referrals: m.targetReferrals,
  })).filter(m => m.store_id);

  for (let i = 0; i < metricRows.length; i += 500) {
    const chunk = metricRows.slice(i, i + 500);
    onProgress?.('メトリクスを登録中...', i, metricRows.length);
    const { error } = await supabase.from('monthly_metrics').upsert(chunk, {
      onConflict: 'store_id,year_month',
    });
    if (error) {
      result.errors.push(`メトリクスバッチ${i}: ${error.message}`);
    } else {
      result.metricsUpserted += chunk.length;
    }
  }

  onProgress?.('完了', 1, 1);
  return result;
}
