'use client';

import Link from 'next/link';
import { Users, TrendingUp, ExternalLink } from 'lucide-react';
import { Influencer } from '@/lib/types';
import { InfluencerWithHistory } from '@/lib/mock-data';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency, getPerformanceBadge } from '@/lib/utils';
import { getInfluencerROAS } from '@/lib/mock-data';
import { LiftBadge } from '@/components/charts/lift-indicator';

interface InfluencerCardProps {
  influencer: InfluencerWithHistory;
  showPerformance?: boolean;
}

export function InfluencerCard({ influencer, showPerformance = true }: InfluencerCardProps) {
  const roas = getInfluencerROAS(influencer);
  const performanceBadge = getPerformanceBadge(roas);

  return (
    <Link href={`/influencers/${influencer.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start gap-3 mb-4">
          <Avatar
            src={influencer.avatarUrl}
            alt={influencer.displayName}
            fallback={influencer.username}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {influencer.displayName}
              </h3>
              <span className="text-lg">{performanceBadge.emoji}</span>
            </div>
            <p className="text-sm text-foreground-secondary">@{influencer.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-foreground-secondary mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{formatNumber(influencer.followers)}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>{influencer.avgEngagement}%</span>
          </div>
        </div>

        {showPerformance && (
          <div className="pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-foreground-secondary mb-1">CA attribué</p>
                <p className="font-semibold text-foreground">
                  {formatCurrency(influencer.attribution.revenueAttributed)}
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground-secondary mb-1">Lift</p>
                <LiftBadge value={influencer.attribution.liftPercentage} size="sm" />
              </div>
            </div>

            <div className="mt-3">
              <Badge className={performanceBadge.color}>
                ROAS {roas.toFixed(1)}x
              </Badge>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}

// Version ligne pour les tableaux
interface InfluencerRowProps {
  influencer: InfluencerWithHistory;
  rank?: number;
}

export function InfluencerRow({ influencer, rank }: InfluencerRowProps) {
  const roas = getInfluencerROAS(influencer);
  const performanceBadge = getPerformanceBadge(roas);

  return (
    <Link
      href={`/influencers/${influencer.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-background-secondary transition-colors"
    >
      {rank !== undefined && (
        <span className="w-6 text-center text-foreground-secondary font-medium">
          {rank}
        </span>
      )}

      <Avatar
        src={influencer.avatarUrl}
        alt={influencer.displayName}
        fallback={influencer.username}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            @{influencer.username}
          </span>
          <span>{performanceBadge.emoji}</span>
        </div>
        <span className="text-sm text-foreground-secondary">
          {formatNumber(influencer.followers)} followers
        </span>
      </div>

      <div className="text-right">
        <p className="font-medium text-foreground">
          {formatCurrency(influencer.attribution.revenueAttributed)}
        </p>
        <LiftBadge value={influencer.attribution.liftPercentage} size="sm" />
      </div>
    </Link>
  );
}
