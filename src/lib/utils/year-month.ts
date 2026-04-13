export function formatYearMonth(ym: string): string {
  const year = '20' + ym.slice(0, 2);
  const month = ym.slice(2);
  return `${year}/${month}`;
}

export function formatYearMonthShort(ym: string): string {
  const month = parseInt(ym.slice(2));
  return `${month}月`;
}

export function formatYearMonthLong(ym: string): string {
  const year = '20' + ym.slice(0, 2);
  const month = parseInt(ym.slice(2));
  return `${year}年${month}月`;
}

export function getLatestMonth(months: string[]): string {
  return months.sort().reverse()[0] || '2503';
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return '-';
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('ja-JP');
}
