import { FunnelMetricPage } from '@/components/funnel/funnel-metric-page';

export const dynamic = 'force-dynamic';

export default function ConnectionsPage() {
  return (
    <FunnelMetricPage
      metric="connections"
      title="通電"
      color="amber"
      description="取次後、実際に顧客と接続（通電）が取れた件数。取次からの連絡率を測る中間指標。"
    />
  );
}
