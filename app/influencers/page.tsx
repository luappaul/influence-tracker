'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Instagram, Plus, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  formatNumber,
  formatCurrency,
} from '@/lib/utils';
import Link from 'next/link';
import { useUserCampaigns, useUserInfluencers, SavedInfluencer } from '@/lib/hooks/use-user-data';

// Type pour les influenceurs agrégés (avec historique campagnes)
interface AggregatedInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  addedAt: string;
  campaigns: { id: string; name: string; budget: number; date: string }[];
  totalBudget: number;
}

type SortField = 'budget' | 'campaigns' | 'followers';
type SortDirection = 'asc' | 'desc';

export default function InfluencersPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('campaigns');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [view, setView] = useState<'grid' | 'table'>('table');
  const { campaigns } = useUserCampaigns();
  const { influencers: savedInfluencers, deleteInfluencer } = useUserInfluencers();

  // Agréger les influenceurs sauvegardés avec leur historique de campagnes
  const influencersWithHistory = useMemo(() => {
    // Créer un map des campagnes par influenceur
    const campaignsByInfluencer = new Map<string, { id: string; name: string; budget: number; date: string }[]>();
    const budgetByInfluencer = new Map<string, number>();

    campaigns.forEach(campaign => {
      campaign.influencers?.forEach((inf: any) => {
        const existing = campaignsByInfluencer.get(inf.username) || [];
        existing.push({
          id: campaign.id,
          name: campaign.name,
          budget: inf.budget || 0,
          date: campaign.createdAt,
        });
        campaignsByInfluencer.set(inf.username, existing);

        const currentBudget = budgetByInfluencer.get(inf.username) || 0;
        budgetByInfluencer.set(inf.username, currentBudget + (inf.budget || 0));
      });
    });

    // Enrichir les influenceurs sauvegardés avec leur historique
    return savedInfluencers.map(inf => ({
      id: inf.id,
      username: inf.username,
      fullName: inf.fullName,
      profilePicUrl: inf.profilePicUrl,
      followersCount: inf.followersCount,
      addedAt: inf.addedAt,
      campaigns: campaignsByInfluencer.get(inf.username) || [],
      totalBudget: budgetByInfluencer.get(inf.username) || 0,
    }));
  }, [savedInfluencers, campaigns]);

  const filteredInfluencers = influencersWithHistory.filter(
    inf =>
      inf.username.toLowerCase().includes(search.toLowerCase()) ||
      inf.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const sortedInfluencers = [...filteredInfluencers].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case 'budget':
        aVal = a.totalBudget;
        bVal = b.totalBudget;
        break;
      case 'campaigns':
        aVal = a.campaigns.length;
        bVal = b.campaigns.length;
        break;
      case 'followers':
        aVal = a.followersCount;
        bVal = b.followersCount;
        break;
    }

    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Statistiques globales
  const totalBudget = influencersWithHistory.reduce((sum, i) => sum + i.totalBudget, 0);
  const totalCampaigns = campaigns.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Header
          title="Mes Influenceurs"
          description="Influenceurs avec qui vous avez déjà travaillé"
        />
        <Link href="/influencers/search">
          <Button>
            <Instagram className="w-4 h-4 mr-2" />
            Trouver de nouveaux influenceurs
          </Button>
        </Link>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">Influenceurs</p>
          <p className="text-2xl font-semibold text-foreground">{influencersWithHistory.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">Campagnes</p>
          <p className="text-2xl font-semibold text-foreground">{totalCampaigns}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">Budget total investi</p>
          <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalBudget)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <Input
            placeholder="Rechercher un influenceur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="table" className="ml-auto">
          <TabsList>
            <TabsTrigger value="table" onClick={() => setView('table')}>
              Tableau
            </TabsTrigger>
            <TabsTrigger value="grid" onClick={() => setView('grid')}>
              Grille
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vue tableau */}
      {view === 'table' && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influenceur</TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'followers' ? sortDirection : false}
                  onClick={() => handleSort('followers')}
                >
                  Followers
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'campaigns' ? sortDirection : false}
                  onClick={() => handleSort('campaigns')}
                >
                  Campagnes
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'budget' ? sortDirection : false}
                  onClick={() => handleSort('budget')}
                >
                  Budget total
                </TableHead>
                <TableHead>Dernière campagne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInfluencers.map(influencer => {
                const lastCampaign = influencer.campaigns[influencer.campaigns.length - 1];

                return (
                  <TableRow key={influencer.username}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {influencer.profilePicUrl ? (
                            <img
                              src={`/api/proxy-image?url=${encodeURIComponent(influencer.profilePicUrl)}`}
                              alt={influencer.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-accent">
                              {influencer.username.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {influencer.fullName || influencer.username}
                          </p>
                          <a
                            href={`https://instagram.com/${influencer.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-accent hover:underline"
                          >
                            @{influencer.username}
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(influencer.followersCount)}</TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {influencer.campaigns.length} campagne{influencer.campaigns.length > 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(influencer.totalBudget)}
                    </TableCell>
                    <TableCell>
                      {lastCampaign && (
                        <div className="text-sm">
                          <Link
                            href={`/campaigns/${lastCampaign.id}`}
                            className="text-foreground hover:text-accent truncate max-w-[150px] block"
                          >
                            {lastCampaign.name}
                          </Link>
                          <p className="text-foreground-secondary text-xs">
                            {new Date(lastCampaign.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Vue grille */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedInfluencers.map(influencer => (
            <Card key={influencer.username} hover className="h-full">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {influencer.profilePicUrl ? (
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(influencer.profilePicUrl)}`}
                      alt={influencer.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-accent">
                      {influencer.username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {influencer.fullName || influencer.username}
                  </h3>
                  <a
                    href={`https://instagram.com/${influencer.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    @{influencer.username}
                  </a>
                  <p className="text-xs text-foreground-secondary">{formatNumber(influencer.followersCount)} followers</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-foreground-secondary">Campagnes</p>
                  <p className="font-semibold text-foreground">{influencer.campaigns.length}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-secondary">Budget total</p>
                  <p className="font-semibold text-foreground">{formatCurrency(influencer.totalBudget)}</p>
                </div>
              </div>

              {/* Liste des campagnes */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-foreground-secondary mb-2">Campagnes :</p>
                <div className="space-y-1">
                  {influencer.campaigns.slice(0, 3).map(camp => (
                    <Link
                      key={camp.id}
                      href={`/campaigns/${camp.id}`}
                      className="block text-sm text-foreground hover:text-accent truncate"
                    >
                      {camp.name}
                    </Link>
                  ))}
                  {influencer.campaigns.length > 3 && (
                    <p className="text-xs text-foreground-secondary">
                      +{influencer.campaigns.length - 3} autres
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* État vide */}
      {filteredInfluencers.length === 0 && search && (
        <div className="text-center py-16">
          <p className="text-foreground-secondary">
            Aucun influenceur trouvé pour "{search}"
          </p>
        </div>
      )}

      {influencersWithHistory.length === 0 && !search && (
        <Card className="text-center py-16">
          <Instagram className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
          <p className="text-foreground-secondary mb-2">
            Aucun influenceur enregistré
          </p>
          <p className="text-sm text-foreground-secondary mb-4">
            Ajoutez des influenceurs lors de la création d'une campagne
          </p>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer une campagne
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
