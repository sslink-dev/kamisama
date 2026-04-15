import { FunnelMetricPage } from '@/components/funnel/funnel-metric-page';

export const dynamic = 'force-dynamic';

export default function ReferralsPage() {
  return (
    <FunnelMetricPage
      metric="referrals"
      title="取次"
      color="blue"
      description="顧客から代理店・店舗に連絡が入り、回線契約の意向を取り次いだ件数。ファネル最上位の入口指標。"
    />
  );
}
