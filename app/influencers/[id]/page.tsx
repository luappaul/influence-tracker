'use client';

import { use } from 'react';
import Link from 'next/link';
import { ExternalLink, Instagram } from 'lucide-react';
import { Header, Breadcrumb } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge, PostTypeBadge } from '@/components/ui/badge';
import { InfluencerMetrics, EngagementStats } from '@/components/influencers/influencer-metrics';
import { CorrelationDetail } from '@/components/influencers/correlation-detail';
import { LiftIndicator } from '@/components/charts/lift-indicator';
import { getInfluencerById, getInfluencerROAS } from '@/lib/mock-data';
import {
  formatNumber,
  formatCurrency,
  formatDateTime,
  getPerformanceBadge,
} from '@/lib/utils';

interface InfluencerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InfluencerDetailPage({ params }: InfluencerDetailPageProps) {
  const { id } = use(params);
  const influencer = getInfluencerById(id);

  if (!influencer) {
    return (
      <div className="text-center py-16">
        <p className="text-foreground-secondary">Influenceur non trouvé</p>
        <Link href="/influencers" className="text-accent hover:underline mt-2 inline-block">
          Retour aux influenceurs
        </Link>
      </div>
    );
  }

  const roas = getInfluencerROAS(influencer);
  const performanceBadge = getPerformanceBadge(roas);
  const latestPost = influencer.posts.length > 0
    ? influencer.posts.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    : null;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Influenceurs', href: '/influencers' },
          { label: `@${influencer.username}` },
        ]}
      />

      {/* Header avec profil */}
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-6">
          <Avatar
            src={influencer.avatarUrl}
            alt={influencer.displayName}
            fallback={influencer.username}
            size="xl"
          />

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">
                {influencer.displayName}
              </h1>
              <span className="text-2xl">{performanceBadge.emoji}</span>
            </div>
            <p className="text-foreground-secondary">@{influencer.username}</p>
            <div className="flex items-center gap-4 mt-3">
              <Badge variant="default">{influencer.category}</Badge>
              <span className="text-sm text-foreground-secondary">
                {formatNumber(influencer.followers)} followers
              </span>
              <span className="text-sm text-foreground-secondary">
                {influencer.avgEngagement}% engagement
              </span>
            </div>
          </div>

          <Button variant="secondary">
            <Instagram className="w-4 h-4 mr-2" />
            Voir sur Instagram
          </Button>
        </div>
      </div>

      {/* Métriques d'engagement */}
      <InfluencerMetrics influencer={influencer} />

      {/* Performance et corrélation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance */}
        <Card>
          <CardTitle className="mb-6">Performance campagne</CardTitle>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-foreground-secondary mb-1">CA attribué</p>
              <p className="text-3xl font-semibold text-foreground">
                {formatCurrency(influencer.attribution.revenueAttributed)}
              </p>
            </div>
            <div>
              <p className="text-sm text-foreground-secondary mb-1">Ventes</p>
              <p className="text-3xl font-semibold text-foreground">
                {influencer.attribution.ordersAttributed}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border/50">
            <LiftIndicator
              value={influencer.attribution.liftPercentage}
              confidence={influencer.attribution.confidence}
              size="md"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-secondary">ROAS estimé</p>
              <p className="text-2xl font-semibold text-foreground">{roas.toFixed(2)}x</p>
            </div>
            <Badge className={performanceBadge.color}>{performanceBadge.label}</Badge>
          </div>
        </Card>

        {/* Corrélation */}
        {latestPost && (
          <CorrelationDetail influencer={influencer} post={latestPost} />
        )}
      </div>

      {/* Posts de la campagne */}
      <Card>
        <CardTitle className="mb-4">Posts de la campagne</CardTitle>

        {influencer.posts.length === 0 ? (
          <p className="text-foreground-secondary text-center py-8">
            Aucun post détecté pour cette campagne
          </p>
        ) : (
          <div className="space-y-4">
            {influencer.posts
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map(post => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-background-secondary/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PostTypeBadge type={post.type} />
                      <span className="text-sm text-foreground-secondary">
                        {formatDateTime(post.timestamp)}
                      </span>
                    </div>
                    <p className="text-foreground line-clamp-2">{post.caption}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-foreground-secondary">
                      <span>{formatNumber(post.likes)} likes</span>
                      <span>{formatNumber(post.comments)} commentaires</span>
                      {post.views && <span>{formatNumber(post.views)} vues</span>}
                    </div>
                  </div>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-foreground-secondary" />
                  </a>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
