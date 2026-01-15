'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Influencer } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface AttributionBarProps {
  influencers: Influencer[];
  metric?: 'revenue' | 'orders' | 'lift';
}

export function AttributionBar({ influencers, metric = 'revenue' }: AttributionBarProps) {
  const data = influencers
    .map(inf => ({
      id: inf.id,
      name: `@${inf.username}`,
      displayName: inf.displayName,
      revenue: inf.attribution.revenueAttributed,
      orders: inf.attribution.ordersAttributed,
      lift: inf.attribution.liftPercentage,
      followers: inf.followers,
    }))
    .sort((a, b) => b[metric] - a[metric]);

  const maxValue = Math.max(...data.map(d => d[metric]));

  const getBarColor = (value: number, index: number) => {
    // Top 3 en accent, les autres en gris
    if (index === 0) return '#D97706';
    if (index === 1) return '#F59E0B';
    if (index === 2) return '#FBBF24';
    return '#E5E5E5';
  };

  const formatValue = (value: number) => {
    switch (metric) {
      case 'revenue':
        return formatCurrency(value);
      case 'orders':
        return `${value} ventes`;
      case 'lift':
        return `+${value}%`;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0]?.payload;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{item.displayName}</p>
        <p className="text-sm text-foreground-secondary">{item.name}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>CA attribué: <span className="font-medium">{formatCurrency(item.revenue)}</span></p>
          <p>Ventes: <span className="font-medium">{item.orders}</span></p>
          <p>Lift: <span className="font-medium">+{item.lift}%</span></p>
          <p>Followers: <span className="font-medium">{formatNumber(item.followers)}</span></p>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />

        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: '#6b6b6b' }}
          axisLine={{ stroke: '#e5e5e5' }}
          tickLine={false}
          tickFormatter={(value) => metric === 'revenue' ? `${value / 1000}k€` : value.toString()}
        />

        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#6b6b6b' }}
          axisLine={false}
          tickLine={false}
          width={120}
        />

        <Tooltip content={<CustomTooltip />} />

        <Bar dataKey={metric} radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry[metric], index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
