/**
 * Seed Supabase with data from JSON files.
 *
 * Usage:
 *   node scripts/seed-supabase.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * to be set (reads from .env.local automatically).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Read env from .env.local
const envContent = readFileSync(resolve(root, '.env.local'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load JSON data
const agencies = JSON.parse(readFileSync(resolve(root, 'data/agencies.json'), 'utf-8'));
const companies = JSON.parse(readFileSync(resolve(root, 'data/companies.json'), 'utf-8'));
const stores = JSON.parse(readFileSync(resolve(root, 'data/stores.json'), 'utf-8'));
const metrics = JSON.parse(readFileSync(resolve(root, 'data/metrics.json'), 'utf-8'));

async function insertBatch(table, rows, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting into ${table} (batch ${i}):`, error.message);
      throw error;
    }
    inserted += batch.length;
    console.log(`  ${table}: ${inserted}/${rows.length}`);
  }
}

async function insertMetricsBatch(rows, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('metrics').upsert(batch, { onConflict: 'store_id,year_month' });
    if (error) {
      console.error(`Error inserting metrics (batch ${i}):`, error.message);
      throw error;
    }
    inserted += batch.length;
    if (inserted % 5000 === 0 || inserted === rows.length) {
      console.log(`  metrics: ${inserted}/${rows.length}`);
    }
  }
}

async function main() {
  console.log('Seeding Supabase...');
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Agencies: ${agencies.length}`);
  console.log(`  Companies: ${companies.length}`);
  console.log(`  Stores: ${stores.length}`);
  console.log(`  Metrics: ${metrics.length}`);
  console.log('');

  // 1. Agencies
  console.log('Inserting agencies...');
  await insertBatch('agencies', agencies);

  // 2. Companies (convert camelCase to snake_case)
  console.log('Inserting companies...');
  const companiesRows = companies.map(c => ({
    id: c.id,
    name: c.name,
    agency_id: c.agencyId,
  }));
  await insertBatch('companies', companiesRows);

  // 3. Stores (convert camelCase to snake_case)
  console.log('Inserting stores...');
  const storesRows = stores.map(s => ({
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
  await insertBatch('stores', storesRows);

  // 4. Metrics (convert camelCase to snake_case, no 'id' field - auto-generated)
  console.log('Inserting metrics...');
  const metricsRows = metrics.map(m => ({
    store_id: m.storeId,
    year_month: m.yearMonth,
    referrals: m.referrals,
    brokerage: m.brokerage,
    referral_rate: m.referralRate,
    target_referrals: m.targetReferrals,
  }));
  await insertMetricsBatch(metricsRows);

  console.log('\nDone! All data seeded successfully.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
