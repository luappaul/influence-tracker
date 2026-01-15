'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HourlyMetric, Influencer } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { PostTypeBadge } from '@/components/ui/badge';
import { posts, influencers } from '@/lib/mock-data';

interface SalesTimelineProps {
  data: HourlyMetric[];
  showBaseline?: boolean;
  highlightInfluencer?: string;
}

export function SalesTimeline({ data, showBaseline = true, highlightInfluencer }: SalesTimelineProps) {
  const [activePost, setActivePost] = useState<string | null>(null);

  // Agrégation par périodes de 4 heures pour lisibilité
  const chartData = useMemo(() => {
    const aggregated: { date: Date; orders: number; revenue: number; baseline: number; posts: typeof posts }[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const chunk = data.slice(i, i + 4);
      const orders = chunk.reduce((sum, m) => sum + m.orders, 0);
      const revenue = chunk.reduce((sum, m) => sum + m.revenue, 0);
      const baseline = chunk.reduce((sum, m) => sum + m.baseline, 0);
      const chunkPosts = chunk
        .filter(m => m.postEvent)
        .map(m => posts.find(p => p.id === m.postEvent?.postId))
        .filter(Boolean);

      aggregated.push({
        date: chunk[0].hour,
        orders,
        revenue,
        baseline,
        posts: chunkPosts as typeof posts,
      });
    }

    return aggregated;
  }, [data]);

  // Posts avec leurs positions
  const postMarkers = useMemo(() => {
    return data
      .filter(m => m.postEvent)
      .map(m => {
        const post = posts.find(p => p.id === m.postEvent?.postId);
        const influencer = influencers.find(i => i.id === m.postEvent?.influencerId);
        return {
          ...m,
          post,
          influencer,
          x: m.hour.getTime(),
          y: m.orders,
        };
      });
  }, [data]);

  const influencerColors: Record<string, string> = {
    'inf-1': '#D97706', // Emma - accent
    'inf-2': '#059669', // Julie - success
    'inf-3': '#7C3AED', // Marie - purple
    'inf-4': '#EC4899', // Louise - pink
    'inf-5': '#6B7280', // Sophie - gray
    'inf-6': '#8B5CF6', // Chloe - violet
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-sm font-medium text-foreground mb-1">
          {format(new Date(label), 'EEEE d MMM, HH:mm', { locale: fr })}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-foreground-secondary">
            <span className="font-medium text-foreground">{payload[0]?.value}</span> commandes
          </p>
          {showBaseline && dataPoint?.baseline && (
            <p className="text-xs text-foreground-secondary">
              Baseline: {Math.round(dataPoint.baseline)}
            </p>
          )}
        </div>
        {dataPoint?.posts?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-foreground-secondary mb-1">Posts publiés:</p>
            {dataPoint.posts.map((post: any) => {
              const inf = influencers.find(i => i.id === post.influencerId);
              return (
                <div key={post.id} className="flex items-center gap-2 mt-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: influencerColors[post.influencerId] }}
                  />
                  <span className="text-xs">@{inf?.username}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Légende des influenceurs */}
      <div className="flex flex-wrap gap-4 mb-4">
        {influencers.map(inf => (
          <button
            key={inf.id}
            onClick={() => setActivePost(activePost === inf.id ? null : inf.id)}
            className={`flex items-center gap-2 text-sm transition-opacity ${
              activePost && activePost !== inf.id ? 'opacity-40' : ''
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: influencerColors[inf.id] }}
            />
            <span className="text-foreground-secondary">@{inf.username}</span>
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'd MMM', { locale: fr })}
            tick={{ fontSize: 12, fill: '#6b6b6b' }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 12, fill: '#6b6b6b' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Baseline */}
          {showBaseline && (
            <Area
              type="monotone"
              dataKey="baseline"
              stroke="#e5e5e5"
              strokeDasharray="5 5"
              fill="none"
              strokeWidth={1}
            />
          )}

          {/* Courbe principale */}
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#D97706"
            strokeWidth={2}
            fill="url(#colorOrders)"
          />

          {/* Marqueurs de posts */}
          {postMarkers.map((marker, index) => {
            if (activePost && marker.influencer?.id !== activePost) return null;

            return (
              <ReferenceDot
                key={index}
                x={marker.x}
                y={marker.y + 2}
                r={6}
                fill={influencerColors[marker.influencer?.id || 'inf-1']}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
