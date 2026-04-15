import { FunnelMetricPage } from '@/components/funnel/funnel-metric-page';

export const dynamic = 'force-dynamic';

export default function BrokeragePage() {
  return (
    <FunnelMetricPage
      metric="brokerage"
      title="成約"
      color="emerald"
      description="通電後、最終的に契約が成立した件数。ファネル最終段の売上直結指標。"
    />
  );
}
