'use client';

import { Users, Heart, MessageCircle, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Influencer } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface InfluencerMetricsProps {
  influencer: Influencer;
}

export function InfluencerMetrics({ influencer }: InfluencerMetricsProps) {
  const totalLikes = influencer.posts.reduce((sum, p) => sum + p.likes, 0);
  const totalComments = influencer.posts.reduce((sum, p) => sum + p.comments, 0);
  const totalViews = influencer.posts.reduce((sum, p) => sum + (p.views || 0), 0);

  const metrics = [
    {
      label: 'Followers',
      value: formatNumber(influencer.followers),
      icon: Users,
    },
    {
      label: 'Likes totaux',
      value: formatNumber(totalLikes),
      icon: Heart,
    },
    {
      label: 'Commentaires',
      value: formatNumber(totalComments),
      icon: MessageCircle,
    },
    {
      label: 'Vues (Reels)',
      value: formatNumber(totalViews),
      icon: Eye,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center">
              <metric.icon className="w-5 h-5 text-foreground-secondary" />
            </div>
            <div>
              <p className="text-sm text-foreground-secondary">{metric.label}</p>
              <p className="text-lg font-semibold text-foreground">{metric.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Stats d'engagement
interface EngagementStatsProps {
  influencer: Influencer;
}

export function EngagementStats({ influencer }: EngagementStatsProps) {
  return (
    <Card>
      <h3 className="font-semibold text-foreground mb-4">Engagement</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-foreground-secondary">Taux d'engagement</span>
            <span className="font-medium text-foreground">{influencer.avgEngagement}%</span>
          </div>
          <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.min(influencer.avgEngagement * 10, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-sm text-foreground-secondary">Posts de la campagne</p>
            <p className="text-2xl font-semibold text-foreground">{influencer.posts.length}</p>
          </div>
          <div>
            <p className="text-sm text-foreground-secondary">Ventes attribuées</p>
            <p className="text-2xl font-semibold text-foreground">
              {influencer.attribution.ordersAttributed}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
