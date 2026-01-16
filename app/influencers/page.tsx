'use client';

import { useState } from 'react';
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
import { getInfluencersWithHistory, InfluencerWithHistory } from '@/lib/mock-data';
import {
  formatNumber,
  formatCurrency,
} from '@/lib/utils';
import Link from 'next/link';

type SortField = 'roi' | 'revenue' | 'campaigns' | 'followers';
type SortDirection = 'asc' | 'desc';

export default function InfluencersPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('roi');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [view, setView] = useState<'grid' | 'table'>('table');

  // Récupérer uniquement les influenceurs avec historique de campagnes
  const influencersWithHistory = getInfluencersWithHistory();

  const filteredInfluencers = influencersWithHistory.filter(
    inf =>
      inf.username.toLowerCase().includes(search.toLowerCase()) ||
      inf.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const sortedInfluencers = [...filteredInfluencers].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case 'roi':
        aVal = a.averageRoi;
        bVal = b.averageRoi;
        break;
      case 'revenue':
        aVal = a.totalRevenue;
        bVal = b.totalRevenue;
        break;
      case 'campaigns':
        aVal = a.campaignHistory.length;
        bVal = b.campaignHistory.length;
        break;
      case 'followers':
        aVal = a.followers;
        bVal = b.followers;
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
  const totalRevenue = influencersWithHistory.reduce((sum, i) => sum + i.totalRevenue, 0);
  const avgRoi = influencersWithHistory.length > 0
    ? influencersWithHistory.reduce((sum, i) => sum + i.averageRoi, 0) / influencersWithHistory.length
    : 0;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">Influenceurs</p>
          <p className="text-2xl font-semibold text-foreground">{influencersWithHistory.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">Budget total investi</p>
          <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalBudget)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">CA total généré</p>
          <p className="text-2xl font-semibold text-success">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground-secondary">ROI moyen</p>
          <p className={`text-2xl font-semibold ${avgRoi >= 0 ? 'text-success' : 'text-danger'}`}>
            {avgRoi >= 0 ? '+' : ''}{avgRoi.toFixed(0)}%
          </p>
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
                <TableHead>Budget total</TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'revenue' ? sortDirection : false}
                  onClick={() => handleSort('revenue')}
                >
                  CA généré
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'roi' ? sortDirection : false}
                  onClick={() => handleSort('roi')}
                >
                  ROI moyen
                </TableHead>
                <TableHead>Dernière campagne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInfluencers.map(influencer => {
                const lastCampaign = influencer.campaignHistory[influencer.campaignHistory.length - 1];

                return (
                  <TableRow key={influencer.id}>
                    <TableCell>
                      <Link
                        href={`/influencers/${influencer.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <Avatar
                          src={influencer.avatarUrl}
                          alt={influencer.displayName}
                          fallback={influencer.username}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-foreground">
                            {influencer.displayName}
                          </p>
                          <p className="text-sm text-foreground-secondary">
                            @{influencer.username}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{formatNumber(influencer.followers)}</TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {influencer.campaignHistory.length} campagne{influencer.campaignHistory.length > 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(influencer.totalBudget)}</TableCell>
                    <TableCell className="font-medium text-success">
                      {formatCurrency(influencer.totalRevenue)}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1 font-semibold ${
                        influencer.averageRoi >= 100 ? 'text-success' :
                        influencer.averageRoi >= 0 ? 'text-warning' : 'text-danger'
                      }`}>
                        {influencer.averageRoi >= 100 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : influencer.averageRoi >= 0 ? (
                          <Minus className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {influencer.averageRoi >= 0 ? '+' : ''}{influencer.averageRoi.toFixed(0)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {lastCampaign && (
                        <div className="text-sm">
                          <p className="text-foreground truncate max-w-[150px]">{lastCampaign.campaignName}</p>
                          <p className="text-foreground-secondary">{lastCampaign.date}</p>
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
            <Link key={influencer.id} href={`/influencers/${influencer.id}`}>
              <Card hover className="h-full">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar
                    src={influencer.avatarUrl}
                    alt={influencer.displayName}
                    fallback={influencer.username}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {influencer.displayName}
                    </h3>
                    <p className="text-sm text-foreground-secondary">@{influencer.username}</p>
                    <p className="text-xs text-foreground-secondary">{formatNumber(influencer.followers)} followers</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-foreground-secondary">Campagnes</p>
                    <p className="font-semibold text-foreground">{influencer.campaignHistory.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-secondary">ROI moyen</p>
                    <p className={`font-semibold ${influencer.averageRoi >= 0 ? 'text-success' : 'text-danger'}`}>
                      {influencer.averageRoi >= 0 ? '+' : ''}{influencer.averageRoi.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-secondary">Budget total</p>
                    <p className="font-semibold text-foreground">{formatCurrency(influencer.totalBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-secondary">CA généré</p>
                    <p className="font-semibold text-success">{formatCurrency(influencer.totalRevenue)}</p>
                  </div>
                </div>
              </Card>
            </Link>
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
          <BarChart3 className="w-12 h-12 text-foreground-secondary mx-auto mb-4" />
          <p className="text-foreground-secondary mb-2">
            Vous n'avez pas encore travaillé avec des influenceurs
          </p>
          <p className="text-sm text-foreground-secondary mb-4">
            Créez votre première campagne pour commencer à tracker les performances
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
