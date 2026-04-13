'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import { formatNumber, formatPercent } from '@/lib/utils/year-month';

interface KpiCardsProps {
  totalReferrals: number;
  referralRate: number;
  targetAchievementRate: number;
  activeStoreCount: number;
  totalTargetReferrals: number;
  totalBrokerage: number;
}

export function KpiCards({
  totalReferrals,
  referralRate,
  targetAchievementRate,
  activeStoreCount,
  totalTargetReferrals,
  totalBrokerage,
}: KpiCardsProps) {
  const cards = [
    {
      title: '取次数',
      value: formatNumber(totalReferrals),
      sub: `仲介数: ${formatNumber(totalBrokerage)}`,
      icon: BarChart3,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: '取次率',
      value: formatPercent(referralRate),
      sub: '全店舗平均',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: '目標達成率',
      value: formatPercent(targetAchievementRate),
      sub: `目標: ${formatNumber(totalTargetReferrals)}`,
      icon: Target,
      color: targetAchievementRate >= 1 ? 'text-green-600' : targetAchievementRate >= 0.8 ? 'text-yellow-600' : 'text-red-600',
      bg: targetAchievementRate >= 1 ? 'bg-green-50' : targetAchievementRate >= 0.8 ? 'bg-yellow-50' : 'bg-red-50',
    },
    {
      title: 'アクティブ店舗数',
      value: formatNumber(activeStoreCount),
      sub: 'NG除外',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
