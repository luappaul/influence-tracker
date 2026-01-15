'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, subHours, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { ConfidenceIndicator } from '@/components/ui/progress';
import { LiftIndicator } from '@/components/charts/lift-indicator';
import { Influencer, Post, HourlyMetric } from '@/lib/types';
import { hourlyMetrics } from '@/lib/mock-data';

interface CorrelationDetailProps {
  influencer: Influencer;
  post: Post;
}

export function CorrelationDetail({ influencer, post }: CorrelationDetailProps) {
  // Obtenir les données autour du post
  const chartData = useMemo(() => {
    const postTime = new Date(post.timestamp);
    const startTime = subHours(postTime, 12);
    const endTime = addHours(postTime, 48);

    return hourlyMetrics
      .filter(m => {
        const hour = new Date(m.hour);
        return hour >= startTime && hour <= endTime;
      })
      .map(m => ({
        hour: m.hour,
        orders: m.orders,
        baseline: m.baseline,
        isPostTime: Math.abs(new Date(m.hour).getTime() - postTime.getTime()) < 3600000,
      }));
  }, [post]);

  const postTimeValue = new Date(post.timestamp).getTime();

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Analyse de corrélation</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            Impact du post du {format(post.timestamp, 'd MMMM à HH:mm', { locale: fr })}
          </p>
        </div>
        <LiftIndicator
          value={influencer.attribution.liftPercentage}
          confidence={influencer.attribution.confidence}
          size="sm"
        />
      </div>

      {/* Graphique */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOrdersCorr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />

            <XAxis
              dataKey="hour"
              tickFormatter={(hour) => format(new Date(hour), 'HH:mm', { locale: fr })}
              tick={{ fontSize: 11, fill: '#6b6b6b' }}
              axisLine={{ stroke: '#e5e5e5' }}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#6b6b6b' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-lg p-2 shadow-sm">
                    <p className="text-xs text-foreground-secondary">
                      {format(new Date(data.hour), 'HH:mm', { locale: fr })}
                    </p>
                    <p className="text-sm font-medium">{data.orders} commandes</p>
                  </div>
                );
              }}
            />

            {/* Baseline */}
            <Area
              type="monotone"
              dataKey="baseline"
              stroke="#e5e5e5"
              strokeDasharray="4 4"
              fill="none"
              strokeWidth={1}
            />

            {/* Commandes */}
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#D97706"
              strokeWidth={2}
              fill="url(#colorOrdersCorr)"
            />

            {/* Ligne du post */}
            <ReferenceLine
              x={postTimeValue}
              stroke="#D97706"
              strokeDasharray="4 4"
              label={{
                value: 'Post',
                position: 'top',
                fill: '#D97706',
                fontSize: 11,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center justify-center gap-6 mt-2 text-xs text-foreground-secondary">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-accent" />
            <span>Commandes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-border border-dashed" />
            <span>Baseline</span>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-xs text-foreground-secondary">Fenêtre d'attribution</p>
          <p className="font-semibold text-foreground">{influencer.attribution.conversionWindow}h</p>
        </div>
        <div>
          <p className="text-xs text-foreground-secondary">Commandes attribuées</p>
          <p className="font-semibold text-foreground">{influencer.attribution.ordersAttributed}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-secondary">Confiance</p>
          <ConfidenceIndicator level={influencer.attribution.confidence} />
        </div>
      </div>
    </Card>
  );
}
