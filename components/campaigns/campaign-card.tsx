'use client';

import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import { Campaign } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate, getDaysSinceStart, getDaysRemaining } from '@/lib/utils';
import { influencers } from '@/lib/mock-data';

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const daysSinceStart = getDaysSinceStart(campaign.startDate);
  const daysRemaining = getDaysRemaining(campaign.endDate);
  const campaignInfluencers = influencers.filter(i =>
    campaign.influencers.includes(i.id)
  );

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">{campaign.name}</h3>
            <p className="text-sm text-foreground-secondary">{campaign.product}</p>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground-secondary">
            <Users className="w-4 h-4" />
            <span>{campaignInfluencers.length} influenceurs</span>
          </div>

          {campaign.status === 'active' && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">J+{daysSinceStart}</span>
                <span className="text-foreground-secondary">
                  {daysRemaining > 0 ? `${daysRemaining}j restants` : 'Termine bientôt'}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{
                    width: `${Math.min(
                      (daysSinceStart / (daysSinceStart + daysRemaining)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// Version compacte pour le header du dashboard
interface ActiveCampaignBannerProps {
  campaign: Campaign;
}

export function ActiveCampaignBanner({ campaign }: ActiveCampaignBannerProps) {
  const daysSinceStart = getDaysSinceStart(campaign.startDate);
  const campaignInfluencers = influencers.filter(i =>
    campaign.influencers.includes(i.id)
  );

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="block bg-card border border-border/50 rounded-xl p-4 hover:border-border transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <div>
            <span className="text-sm text-foreground-secondary">Campagne active</span>
            <h3 className="font-medium text-foreground">{campaign.name}</h3>
          </div>
        </div>
        <div className="text-right text-sm text-foreground-secondary">
          <span>{campaignInfluencers.length} influenceuses</span>
          <span className="mx-2">·</span>
          <span>J+{daysSinceStart}</span>
        </div>
      </div>
    </Link>
  );
}
