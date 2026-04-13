const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DATA_DIR = path.resolve(__dirname, '../data');

async function importData() {
  console.log('Starting Supabase import...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Import agencies
  const agencies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'agencies.json'), 'utf8'));
  console.log(`\nImporting ${agencies.length} agencies...`);
  const { error: agErr } = await supabase.from('agencies').upsert(agencies, { onConflict: 'id' });
  if (agErr) { console.error('Agency error:', agErr); return; }
  console.log('Agencies done.');

  // 2. Import companies
  const companies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'companies.json'), 'utf8'));
  console.log(`Importing ${companies.length} companies...`);
  const companyRows = companies.map(c => ({
    id: c.id,
    name: c.name,
    agency_id: c.agencyId,
  }));
  // Batch in chunks of 500
  for (let i = 0; i < companyRows.length; i += 500) {
    const chunk = companyRows.slice(i, i + 500);
    const { error } = await supabase.from('companies').upsert(chunk, { onConflict: 'id' });
    if (error) { console.error('Company error at', i, ':', error); return; }
    process.stdout.write(`  ${Math.min(i + 500, companyRows.length)}/${companyRows.length}\r`);
  }
  console.log('Companies done.         ');

  // 3. Import stores
  const stores = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'stores.json'), 'utf8'));
  console.log(`Importing ${stores.length} stores...`);
  const storeRows = stores.map(s => ({
    id: s.id,
    number: s.number,
    code: s.code,
    agency_id: s.agencyId,
    agency_name: s.agencyName,
    company_id: s.companyId,
    company_name: s.companyName,
    name: s.name,
    is_ng: s.isNg,
    ng_month: s.ngMonth,
    ng_reason: s.ngReason,
    is_priority: s.isPriority,
    is_priority_q3: s.isPriorityQ3,
    added_month: s.addedMonth,
    round_restart: s.roundRestart,
    company_flag: s.companyFlag,
    unit: s.unit,
    rank: s.rank,
  }));
  for (let i = 0; i < storeRows.length; i += 500) {
    const chunk = storeRows.slice(i, i + 500);
    const { error } = await supabase.from('stores').upsert(chunk, { onConflict: 'id' });
    if (error) { console.error('Store error at', i, ':', error); return; }
    process.stdout.write(`  ${Math.min(i + 500, storeRows.length)}/${storeRows.length}\r`);
  }
  console.log('Stores done.            ');

  // 4. Import metrics
  const metrics = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'metrics.json'), 'utf8'));
  console.log(`Importing ${metrics.length} metrics...`);
  const metricRows = metrics.map(m => ({
    store_id: m.storeId,
    year_month: m.yearMonth,
    referrals: Math.round(Number(m.referrals) || 0),
    brokerage: Math.round(Number(m.brokerage) || 0),
    referral_rate: m.referralRate,
    target_referrals: Math.round(Number(m.targetReferrals) || 0),
  }));
  for (let i = 0; i < metricRows.length; i += 500) {
    const chunk = metricRows.slice(i, i + 500);
    const { error } = await supabase.from('monthly_metrics').upsert(chunk, {
      onConflict: 'store_id,year_month',
    });
    if (error) { console.error('Metrics error at', i, ':', error); return; }
    process.stdout.write(`  ${Math.min(i + 500, metricRows.length)}/${metricRows.length}\r`);
  }
  console.log('Metrics done.           ');

  console.log('\nImport complete!');
}

importData().catch(console.error);
