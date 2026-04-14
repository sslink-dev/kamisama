const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixZeroCodes() {
  console.log('Fetching stores with code="0"...');

  // Fetch all bad stores (paginated)
  const bad = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, number, code')
      .eq('code', '0')
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    bad.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Found ${bad.length} stores with code="0"`);

  // Update each with NUM-{number}
  let ok = 0, fail = 0;
  for (let i = 0; i < bad.length; i++) {
    const s = bad[i];
    const newCode = `NUM-${s.number}`;
    const { error } = await supabase
      .from('stores')
      .update({ code: newCode })
      .eq('id', s.id);
    if (error) {
      console.error(`Error on ${s.id}:`, error.message);
      fail++;
    } else {
      ok++;
    }
    if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1}/${bad.length}\r`);
  }

  console.log(`\nDone. OK: ${ok}, Failed: ${fail}`);
}

fixZeroCodes().catch(console.error);
