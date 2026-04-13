const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.resolve(__dirname, '../../神様の神.xlsx');
const DATA_DIR = path.resolve(__dirname, '../data');

console.log('Reading Excel file...');
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets['新神'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const headers = rows[0];
const dataRows = rows.slice(1).filter(r => r[0] !== '' && r[0] !== undefined);

console.log(`Found ${dataRows.length} rows`);

// --- Extract agencies ---
const agencyNames = [...new Set(dataRows.map(r => r[2]).filter(Boolean))];
const agencies = agencyNames.map((name, i) => ({
  id: `ag-${String(i + 1).padStart(3, '0')}`,
  name,
}));
const agencyMap = Object.fromEntries(agencies.map(a => [a.name, a.id]));

// --- Extract companies ---
const companySet = new Map();
dataRows.forEach(r => {
  const name = r[3];
  const agency = r[2];
  if (name && !companySet.has(name)) {
    companySet.set(name, { agencyId: agencyMap[agency] || null });
  }
});
const companies = [...companySet.entries()].map(([name, info], i) => ({
  id: `co-${String(i + 1).padStart(4, '0')}`,
  name,
  agencyId: info.agencyId,
}));
const companyMap = Object.fromEntries(companies.map(c => [c.name, c.id]));

// --- Extract stores + metrics ---
const stores = [];
const metrics = [];

// Month columns for historical data (2404-2503): groups of 3 (取次数, 混合仲介数, 取次率)
const historicalMonths = [
  { ym: '2404', refCol: 18, brkCol: 19, rateCol: 20 },
  { ym: '2405', refCol: 21, brkCol: 22, rateCol: 23 },
  { ym: '2406', refCol: 24, brkCol: 25, rateCol: 26 },
  { ym: '2407', refCol: 27, brkCol: 28, rateCol: 29 },
  { ym: '2408', refCol: 30, brkCol: 31, rateCol: 32 },
  { ym: '2409', refCol: 33, brkCol: 34, rateCol: 35 },
  { ym: '2410', refCol: 36, brkCol: 37, rateCol: 38 },
  { ym: '2411', refCol: 39, brkCol: 40, rateCol: 41 },
  { ym: '2412', refCol: 42, brkCol: 43, rateCol: 44 },
  { ym: '2501', refCol: 45, brkCol: 46, rateCol: 47 },
  { ym: '2502', refCol: 48, brkCol: 49, rateCol: 50 },
  { ym: '2503', refCol: 51, brkCol: 52, rateCol: 53 },
];

// Future months (2504-2603): only 取次数 (cols 55-66) + 目標取次数 (cols 69-80)
const futureMonths = [
  { ym: '2504', refCol: 55, targetCol: 69 },
  { ym: '2505', refCol: 56, targetCol: 70 },
  { ym: '2506', refCol: 57, targetCol: 71 },
  { ym: '2507', refCol: 58, targetCol: 72 },
  { ym: '2508', refCol: 59, targetCol: 73 },
  { ym: '2509', refCol: 60, targetCol: 74 },
  { ym: '2510', refCol: 61, targetCol: 75 },
  { ym: '2511', refCol: 62, targetCol: 76 },
  { ym: '2512', refCol: 63, targetCol: 77 },
  { ym: '2601', refCol: 64, targetCol: 78 },
  { ym: '2602', refCol: 65, targetCol: 79 },
  { ym: '2603', refCol: 66, targetCol: 80 },
];

function toNum(v) {
  if (v === '' || v === undefined || v === null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toRate(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return Math.round(n * 10000) / 10000;
}

dataRows.forEach((r, i) => {
  const storeId = `st-${String(i + 1).padStart(5, '0')}`;
  const isNg = r[5] === 'NG';
  const rankRaw = r[16] || r[15] || r[14] || '';

  stores.push({
    id: storeId,
    number: toNum(r[0]),
    code: String(r[1]),
    agencyId: agencyMap[r[2]] || null,
    agencyName: r[2] || '',
    companyId: companyMap[r[3]] || null,
    companyName: r[3] || '',
    name: r[4] || '',
    isNg,
    ngMonth: r[6] || null,
    ngReason: r[7] || null,
    isPriority: r[8] === true || r[8] === 'TRUE',
    isPriorityQ3: r[9] === true || r[9] === 'TRUE',
    addedMonth: r[10] || null,
    roundRestart: r[11] || null,
    companyFlag: r[12] || null,
    unit: r[13] || null,
    rank: rankRaw || null,
  });

  // Historical months (have 取次数, 混合仲介数, 取次率)
  for (const m of historicalMonths) {
    const ref = toNum(r[m.refCol]);
    const brk = toNum(r[m.brkCol]);
    const rate = toRate(r[m.rateCol]);
    if (ref === 0 && brk === 0 && rate === null) continue;
    metrics.push({
      storeId,
      yearMonth: m.ym,
      referrals: ref,
      brokerage: brk,
      referralRate: rate,
      targetReferrals: 0,
    });
  }

  // Future months (取次数 + 目標取次数)
  for (const m of futureMonths) {
    const ref = toNum(r[m.refCol]);
    const target = toNum(r[m.targetCol]);
    if (ref === 0 && target === 0) continue;
    // Check if we already have this month from historical
    const existing = metrics.find(x => x.storeId === storeId && x.yearMonth === m.ym);
    if (existing) {
      existing.targetReferrals = target;
    } else {
      metrics.push({
        storeId,
        yearMonth: m.ym,
        referrals: ref,
        brokerage: 0,
        referralRate: null,
        targetReferrals: target,
      });
    }
  }
});

// --- Write JSON files ---
fs.writeFileSync(path.join(DATA_DIR, 'agencies.json'), JSON.stringify(agencies, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'companies.json'), JSON.stringify(companies, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'stores.json'), JSON.stringify(stores));
fs.writeFileSync(path.join(DATA_DIR, 'metrics.json'), JSON.stringify(metrics));

console.log(`agencies: ${agencies.length}`);
console.log(`companies: ${companies.length}`);
console.log(`stores: ${stores.length}`);
console.log(`metrics: ${metrics.length}`);
console.log('Done! Files written to data/');
