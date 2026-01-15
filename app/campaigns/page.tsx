'use client';

import { useState, useEffect } from 'react';
import { Plus, BarChart3, Users, Euro, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface CampaignInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  posts?: number;
  roi?: number | null;
  revenue?: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  influencers: CampaignInfluencer[];
  totalBudget: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    // Charger les campagnes depuis localStorage
    const stored = localStorage.getItem('campaigns');
    if (stored) {
      setCampaigns(JSON.parse(stored));
    }
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed');

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-8">
      <Header
        title="Campagnes"
        description="Gérez et suivez vos campagnes d'influence"
        action={
          <Link href="/campaigns/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne
            </Button>
          </Link>
        }
      />

      {/* Campagnes actives */}
      {activeCampaigns.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Campagnes actives ({activeCampaigns.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Campagnes terminées */}
      {completedCampaigns.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Campagnes terminées ({completedCampaigns.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* État vide */}
      {campaigns.length === 0 && (
        <Card className="text-center py-16">
          <BarChart3 className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
          <p className="text-foreground-secondary mb-4">
            Vous n'avez pas encore de campagne
          </p>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer votre première campagne
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const totalFollowers = campaign.influencers.reduce(
    (sum, i) => sum + i.followersCount,
    0
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const statusColors = {
    active: 'bg-success/10 text-success',
    completed: 'bg-foreground-secondary/10 text-foreground-secondary',
    draft: 'bg-warning/10 text-warning',
  };

  const statusLabels = {
    active: 'Active',
    completed: 'Terminée',
    draft: 'Brouillon',
  };

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">{campaign.name}</h3>
            <p className="text-sm text-foreground-secondary">
              {new Date(campaign.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <Badge className={statusColors[campaign.status]}>
            {statusLabels[campaign.status]}
          </Badge>
        </div>

        {/* Avatars des influenceurs */}
        <div className="flex items-center mb-4">
          <div className="flex -space-x-2">
            {campaign.influencers.slice(0, 4).map((influencer, index) => (
              <div
                key={influencer.username}
                className="w-8 h-8 rounded-full border-2 border-card bg-accent/10 flex items-center justify-center overflow-hidden"
                style={{ zIndex: 4 - index }}
              >
                {influencer.profilePicUrl ? (
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(influencer.profilePicUrl)}`}
                    alt={influencer.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-accent">
                    {influencer.username.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {campaign.influencers.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-card bg-background-secondary flex items-center justify-center text-xs font-medium text-foreground-secondary">
                +{campaign.influencers.length - 4}
              </div>
            )}
          </div>
          <span className="ml-3 text-sm text-foreground-secondary">
            {campaign.influencers.length} influenceur{campaign.influencers.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-foreground-secondary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatNumber(totalFollowers)}
              </p>
              <p className="text-xs text-foreground-secondary">Reach total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Euro className="w-4 h-4 text-foreground-secondary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {campaign.totalBudget.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-foreground-secondary">Budget</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
