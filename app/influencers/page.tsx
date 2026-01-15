'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Instagram, Plus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InfluencerCard } from '@/components/influencers/influencer-card';
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
import { LiftBadge } from '@/components/charts/lift-indicator';
import { ConfidenceIndicator } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { influencers, getInfluencerROAS } from '@/lib/mock-data';
import {
  formatNumber,
  formatCurrency,
  getPerformanceBadge,
} from '@/lib/utils';
import Link from 'next/link';

type SortField = 'revenue' | 'orders' | 'lift' | 'followers';
type SortDirection = 'asc' | 'desc';

export default function InfluencersPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const filteredInfluencers = influencers.filter(
    inf =>
      inf.username.toLowerCase().includes(search.toLowerCase()) ||
      inf.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const sortedInfluencers = [...filteredInfluencers].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case 'revenue':
        aVal = a.attribution.revenueAttributed;
        bVal = b.attribution.revenueAttributed;
        break;
      case 'orders':
        aVal = a.attribution.ordersAttributed;
        bVal = b.attribution.ordersAttributed;
        break;
      case 'lift':
        aVal = a.attribution.liftPercentage;
        bVal = b.attribution.liftPercentage;
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Header
          title="Influenceurs"
          description="Analysez les performances de vos influenceurs"
        />
        <Link href="/influencers/search">
          <Button>
            <Instagram className="w-4 h-4 mr-2" />
            Rechercher sur Instagram
          </Button>
        </Link>
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

        <Tabs defaultValue="grid" className="ml-auto">
          <TabsList>
            <TabsTrigger value="grid" onClick={() => setView('grid')}>
              Grille
            </TabsTrigger>
            <TabsTrigger value="table" onClick={() => setView('table')}>
              Tableau
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vue grille */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedInfluencers.map(influencer => (
            <InfluencerCard key={influencer.id} influencer={influencer} />
          ))}
        </div>
      )}

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
                  sorted={sortField === 'revenue' ? sortDirection : false}
                  onClick={() => handleSort('revenue')}
                >
                  CA attribué
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'orders' ? sortDirection : false}
                  onClick={() => handleSort('orders')}
                >
                  Ventes
                </TableHead>
                <TableHead
                  sortable
                  sorted={sortField === 'lift' ? sortDirection : false}
                  onClick={() => handleSort('lift')}
                >
                  Lift
                </TableHead>
                <TableHead>Confiance</TableHead>
                <TableHead>ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInfluencers.map(influencer => {
                const roas = getInfluencerROAS(influencer);
                const performanceBadge = getPerformanceBadge(roas);

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
                    <TableCell className="font-medium">
                      {formatCurrency(influencer.attribution.revenueAttributed)}
                    </TableCell>
                    <TableCell>{influencer.attribution.ordersAttributed}</TableCell>
                    <TableCell>
                      <LiftBadge value={influencer.attribution.liftPercentage} size="sm" />
                    </TableCell>
                    <TableCell>
                      <ConfidenceIndicator
                        level={influencer.attribution.confidence}
                        showLabel={false}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={performanceBadge.color}>
                        {roas.toFixed(1)}x
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* État vide */}
      {filteredInfluencers.length === 0 && (
        <div className="text-center py-16">
          <p className="text-foreground-secondary">
            Aucun influenceur trouvé pour "{search}"
          </p>
        </div>
      )}
    </div>
  );
}
