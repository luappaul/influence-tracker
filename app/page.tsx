'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useShopifyData } from '@/lib/hooks/use-shopify-data';
import { useUserCampaigns } from '@/lib/hooks/use-user-data';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import {
  calculateIntelligentAttribution,
  calculateSeasonalBaseline,
  AttributionResult,
} from '@/lib/attribution';
import {
  Loader2,
  ShoppingBag,
  Package,
  TrendingUp,
  Users,
  Calendar,
  ChevronDown,
  ArrowRight,
  BarChart3,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  UserPlus,
  Tag,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ComposedChart,
  Area,
  Scatter,
  Cell,
} from 'recharts';

type DateRange = 'this_month' | 'last_month' | 'this_year' | 'last_30_days' | 'last_7_days';
type ChartMetric = 'sales' | 'followers' | 'visitors';

// Couleurs par métrique
const metricColors: Record<ChartMetric, { main: string; light: string; negative: string }> = {
  sales: { main: '#10B981', light: '#10B98133', negative: '#EF444433' },      // emerald-500
  followers: { main: '#3B82F6', light: '#3B82F633', negative: '#EF444433' },  // blue-500
  visitors: { main: '#8B5CF6', light: '#8B5CF633', negative: '#EF444433' },   // purple-500
};

interface PostCommenter {
  username: string;
  fullName: string;
  profilePicUrl: string;
  comment: string;
  matchedWithBuyer?: boolean;
  matchedOrderId?: string;
}

interface ScrapedPost {
  id: string;
  shortCode: string;
  caption: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  type: string;
  displayUrl: string;
  videoUrl?: string;
  mentionsProduct?: boolean | null;
  commenters?: PostCommenter[];
  commentersScrapedAt?: string;
}

interface ScrapedStory {
  id: string;
  pk: string;
  code: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  videoUrl?: string;
  timestamp: string;
  expiresAt: string;
  username: string;
  mentions: string[];
  hashtags: string[];
  linkUrl?: string;
  mentionsProduct?: boolean | null;
}

// Mention reçue via webhook Instagram
interface StoryMention {
  id: string;
  media_id: string;
  media_type: string;
  media_url: string;
  mentioned_by_username: string | null;
  mentioned_by_user_id: string | null;
  received_at: string;
  expires_at: string | null;
  campaign_id: string | null;
  influencer_username: string | null;
  mentions_product: boolean | null;
  processed: boolean;
}

// Convertit une story en format post pour uniformiser le traitement
function storyToPost(story: ScrapedStory, influencerUsername: string): ScrapedPost {
  return {
    id: story.id,
    shortCode: story.code,
    caption: '', // Les stories n'ont pas de caption
    url: `https://instagram.com/stories/${influencerUsername}/${story.id}`,
    commentsCount: 0,
    likesCount: 0,
    timestamp: story.timestamp,
    type: story.mediaType === 'video' ? 'Video' : 'Image',
    displayUrl: story.imageUrl,
    videoUrl: story.videoUrl,
    mentionsProduct: story.mentionsProduct,
  };
}

// Convertit une mention webhook en format post pour uniformiser le traitement
function mentionToPost(mention: StoryMention): ScrapedPost {
  return {
    id: mention.id,
    shortCode: mention.media_id,
    caption: '', // Les story mentions n'ont pas de caption
    url: mention.media_url || '',
    commentsCount: 0,
    likesCount: 0,
    timestamp: mention.received_at,
    type: mention.media_type === 'video' ? 'Video' : 'Image',
    displayUrl: mention.media_url || '',
    mentionsProduct: mention.mentions_product,
  };
}

interface CampaignInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  campaignStartDate?: string;
  campaignDays?: number;
  scrapedPosts?: ScrapedPost[];
  scrapedStories?: ScrapedStory[];
  lastScrapedAt?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'draft';
  influencers: CampaignInfluencer[];
  totalBudget: number;
  createdAt: string;
}

interface InfluencerStats {
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  productPosts: number;
  totalPosts: number;
  impressions: number;
  likes: number;
  comments: number;
  attributedSales: number;
  attributedRevenue: number;
  attributedFollowers: number;
  attributedVisitors: number;
  roi: number;
  // Signaux d'attribution intelligents
  signals: {
    temporal: number;      // Revenue attribué par corrélation temporelle
    newCustomer: number;   // Revenue de nouveaux clients
    productMatch: number;  // Revenue avec correspondance produit
    anomaly: number;       // Revenue pendant pics détectés
    baseline: number;      // Revenue baseline résiduel
  };
  confidence: number;      // Score de confiance 0-1
}

const dateRangeLabels: Record<DateRange, string> = {
  this_month: 'Ce mois',
  last_month: 'Mois dernier',
  this_year: 'Cette année',
  last_30_days: '30 derniers jours',
  last_7_days: '7 derniers jours',
};

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (range) {
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 30);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 7);
      break;
  }

  return { start, end };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { orders, dailyMetrics, isLoading } = useShopifyData();
  const { campaigns } = useUserCampaigns();
  const [dateRange, setDateRange] = useState<DateRange>('last_30_days');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('line');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showCampaignMenu, setShowCampaignMenu] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('sales');
  const [mentions, setMentions] = useState<StoryMention[]>([]);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Récupérer les mentions depuis l'API (seulement si authentifié)
  useEffect(() => {
    if (!user) return;

    const fetchMentions = async () => {
      try {
        const response = await fetch('/api/instagram/mentions');
        if (response.ok) {
          const data = await response.json();
          console.log('[Dashboard] Mentions fetched:', data.mentions?.length || 0);
          setMentions(data.mentions || []);
        } else {
          console.log('[Dashboard] Mentions fetch failed:', response.status);
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching mentions:', error);
      }
    };
    fetchMentions();
  }, [user]);

  // Calculer les dates de la campagne sélectionnée
  const campaignPeriod = useMemo(() => {
    if (!selectedCampaign) return null;

    // Trouver la date de début la plus ancienne et la date de fin la plus tardive
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;

    selectedCampaign.influencers.forEach((inf: any) => {
      if (inf.campaignStartDate && inf.campaignDays) {
        const start = new Date(inf.campaignStartDate);
        const end = new Date(start);
        end.setDate(end.getDate() + inf.campaignDays);

        if (!earliestStart || start < earliestStart) earliestStart = start;
        if (!latestEnd || end > latestEnd) latestEnd = end;
      }
    });

    if (!earliestStart || !latestEnd) return null;

    const start = earliestStart as Date;
    const end = latestEnd as Date;

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
  }, [selectedCampaign]);

  // Filtrer les commandes par date
  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, dateRange]);

  // Calculer les stats globales
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_price || '0'),
      0
    );
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Quantité totale d'articles vendus
    let totalItemsSold = 0;
    filteredOrders.forEach((order) => {
      order.line_items?.forEach((item) => {
        totalItemsSold += item.quantity || 1;
      });
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalItemsSold,
    };
  }, [filteredOrders]);

  // Calculer la baseline (moyenne journalière des 30 jours avant la campagne)
  const baselineData = useMemo(() => {
    if (!campaignPeriod) return null;

    const { start } = campaignPeriod;
    const BASELINE_DAYS = 30;

    // 30 jours avant le début de la campagne
    const baselineStart = new Date(start);
    baselineStart.setDate(baselineStart.getDate() - BASELINE_DAYS);
    const baselineStartStr = baselineStart.toISOString().split('T')[0];
    const startStr = start.toISOString().split('T')[0];

    const baselineOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= baselineStart && orderDate < start;
    });

    const baselineRevenue = baselineOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_price || '0'),
      0
    );

    // Baseline followers et visitors
    const baselineMetrics = dailyMetrics.filter(m => m.date >= baselineStartStr && m.date < startStr);
    const baselineFollowers = baselineMetrics.reduce((sum, m) => sum + m.followers, 0);
    const baselineVisitors = baselineMetrics.reduce((sum, m) => sum + m.visitors, 0);
    const baselineMetricsDays = baselineMetrics.length || BASELINE_DAYS;

    // Moyenne journalière
    const dailyBaseline = baselineRevenue / BASELINE_DAYS;
    const dailyFollowersBaseline = baselineFollowers / baselineMetricsDays;
    const dailyVisitorsBaseline = baselineVisitors / baselineMetricsDays;

    return {
      totalRevenue: baselineRevenue,
      dailyAverage: dailyBaseline,
      dailyFollowers: dailyFollowersBaseline,
      dailyVisitors: dailyVisitorsBaseline,
      days: BASELINE_DAYS,
      ordersCount: baselineOrders.length,
    };
  }, [campaignPeriod, orders, dailyMetrics]);

  // Calculer les stats pendant la campagne avec baseline
  const campaignStats = useMemo(() => {
    if (!campaignPeriod || !baselineData) return null;

    const { start, end } = campaignPeriod;
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Revenue pendant la campagne
    const campaignOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= start && orderDate <= end;
    });
    const campaignRevenue = campaignOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_price || '0'),
      0
    );

    // Followers et visitors pendant la campagne
    const campaignMetrics = dailyMetrics.filter(m => m.date >= startStr && m.date <= endStr);
    const campaignFollowers = campaignMetrics.reduce((sum, m) => sum + m.followers, 0);
    const campaignVisitors = campaignMetrics.reduce((sum, m) => sum + m.visitors, 0);

    // Nombre de jours de campagne
    const campaignDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Revenue attendu sans campagne (baseline × jours)
    const expectedRevenue = baselineData.dailyAverage * campaignDays;
    const expectedFollowers = baselineData.dailyFollowers * campaignDays;
    const expectedVisitors = baselineData.dailyVisitors * campaignDays;

    // Impact incrémental de la campagne
    const incrementalRevenue = Math.max(0, campaignRevenue - expectedRevenue);
    const incrementalFollowers = Math.max(0, campaignFollowers - expectedFollowers);
    const incrementalVisitors = Math.max(0, campaignVisitors - expectedVisitors);

    // Variation vs baseline
    const variation = expectedRevenue > 0
      ? ((campaignRevenue - expectedRevenue) / expectedRevenue) * 100
      : campaignRevenue > 0 ? 100 : 0;
    const followersVariation = expectedFollowers > 0
      ? ((campaignFollowers - expectedFollowers) / expectedFollowers) * 100
      : campaignFollowers > 0 ? 100 : 0;
    const visitorsVariation = expectedVisitors > 0
      ? ((campaignVisitors - expectedVisitors) / expectedVisitors) * 100
      : campaignVisitors > 0 ? 100 : 0;

    return {
      campaignRevenue,
      campaignOrders: campaignOrders.length,
      campaignFollowers,
      campaignVisitors,
      expectedRevenue,
      expectedFollowers,
      expectedVisitors,
      incrementalRevenue,
      incrementalFollowers,
      incrementalVisitors,
      campaignDays,
      variation,
      followersVariation,
      visitorsVariation,
    };
  }, [campaignPeriod, orders, dailyMetrics, baselineData]);

  // Attribution intelligente
  const attributionResult = useMemo((): AttributionResult | null => {
    if (!selectedCampaign || !campaignPeriod) return null;

    return calculateIntelligentAttribution(
      orders,
      selectedCampaign.influencers,
      campaignPeriod.start,
      campaignPeriod.end
    );
  }, [selectedCampaign, campaignPeriod, orders]);

  // Helper: combine posts + stories + mentions webhook pour un influenceur
  const getAllContent = (influencer: CampaignInfluencer): ScrapedPost[] => {
    const posts = influencer.scrapedPosts || [];
    const storiesAsPosts = (influencer.scrapedStories || []).map(s => storyToPost(s, influencer.username));

    // Inclure les mentions webhook qui correspondent à cet influenceur
    const influencerMentions = mentions.filter(m =>
      m.influencer_username?.toLowerCase() === influencer.username.toLowerCase() ||
      m.mentioned_by_username?.toLowerCase() === influencer.username.toLowerCase()
    );
    const mentionsAsPosts = influencerMentions.map(m => mentionToPost(m));

    return [...posts, ...storiesAsPosts, ...mentionsAsPosts];
  };

  // Calculer les stats par influenceur (CRM) avec attribution intelligente
  const influencerStats = useMemo((): InfluencerStats[] => {
    if (!selectedCampaign || !attributionResult) return [];

    // Calculer l'engagement total de tous les influenceurs pour l'attribution proportionnelle
    let totalEngagement = 0;
    selectedCampaign.influencers.forEach((inf: CampaignInfluencer) => {
      const allContent = getAllContent(inf);
      const productPosts = allContent.filter((p: ScrapedPost) => p.mentionsProduct === true);
      const engagement = productPosts.reduce((sum: number, p: ScrapedPost) => sum + p.likesCount + p.commentsCount, 0);
      totalEngagement += engagement;
    });

    // Impact followers et visiteurs incrémental (si disponible)
    const incrementalFollowers = campaignStats?.incrementalFollowers || 0;
    const incrementalVisitors = campaignStats?.incrementalVisitors || 0;

    return selectedCampaign.influencers.map((influencer: CampaignInfluencer) => {
      const allContent = getAllContent(influencer);
      const productPosts = allContent.filter((p: ScrapedPost) => p.mentionsProduct === true);
      const allPosts = allContent;

      // Impressions = followers × nombre de posts/stories produit
      const impressions = productPosts.length * influencer.followersCount;

      // Likes et comments des posts produit (stories ont 0)
      const likes = productPosts.reduce((sum: number, p: ScrapedPost) => sum + p.likesCount, 0);
      const comments = productPosts.reduce((sum: number, p: ScrapedPost) => sum + p.commentsCount, 0);

      // Récupérer l'attribution intelligente pour cet influenceur
      const attribution = attributionResult.influencers.find(i => i.username === influencer.username);

      const attributedRevenue = attribution?.totalAttributedRevenue || 0;
      const attributedSales = Math.round(attribution?.totalAttributedOrders || 0);

      // Attribution proportionnelle des followers et visiteurs basée sur l'engagement
      const engagementRatio = totalEngagement > 0 ? (likes + comments) / totalEngagement : 0;
      const attributedFollowers = Math.round(incrementalFollowers * engagementRatio);
      const attributedVisitors = Math.round(incrementalVisitors * engagementRatio);

      // Signaux d'attribution
      const signals = attribution?.signals || {
        temporal: 0,
        newCustomer: 0,
        productMatch: 0,
        anomaly: 0,
        baseline: 0,
      };

      // Score de confiance
      const confidence = attributedRevenue > 0
        ? (signals.temporal + signals.newCustomer + signals.productMatch) / attributedRevenue
        : 0;

      // ROI = (Revenue attribué - Budget) / Budget × 100
      const roi = influencer.budget > 0
        ? ((attributedRevenue - influencer.budget) / influencer.budget) * 100
        : 0;

      return {
        username: influencer.username,
        fullName: influencer.fullName,
        profilePicUrl: influencer.profilePicUrl,
        followersCount: influencer.followersCount,
        budget: influencer.budget,
        productPosts: productPosts.length,
        totalPosts: allPosts.length,
        impressions,
        likes,
        comments,
        attributedSales,
        attributedRevenue,
        attributedFollowers,
        attributedVisitors,
        roi,
        signals,
        confidence,
      };
    });
  }, [selectedCampaign, attributionResult, mentions, campaignStats]);

  // Totaux pour le tableau CRM
  const influencerTotals = useMemo(() => {
    return influencerStats.reduce(
      (acc, inf) => ({
        impressions: acc.impressions + inf.impressions,
        likes: acc.likes + inf.likes,
        comments: acc.comments + inf.comments,
        attributedSales: acc.attributedSales + inf.attributedSales,
        attributedRevenue: acc.attributedRevenue + inf.attributedRevenue,
        attributedFollowers: acc.attributedFollowers + inf.attributedFollowers,
        attributedVisitors: acc.attributedVisitors + inf.attributedVisitors,
        budget: acc.budget + inf.budget,
        signals: {
          temporal: acc.signals.temporal + inf.signals.temporal,
          newCustomer: acc.signals.newCustomer + inf.signals.newCustomer,
          productMatch: acc.signals.productMatch + inf.signals.productMatch,
          anomaly: acc.signals.anomaly + inf.signals.anomaly,
          baseline: acc.signals.baseline + inf.signals.baseline,
        },
      }),
      {
        impressions: 0,
        likes: 0,
        comments: 0,
        attributedSales: 0,
        attributedRevenue: 0,
        attributedFollowers: 0,
        attributedVisitors: 0,
        budget: 0,
        signals: { temporal: 0, newCustomer: 0, productMatch: 0, anomaly: 0, baseline: 0 },
      }
    );
  }, [influencerStats]);

  // Données pour le graphique (revenue + likes des posts produit + baseline + markers influenceurs + followers + visitors)
  const chartData = useMemo(() => {
    const grouped: Record<string, {
      date: string;
      revenue: number;
      orders: number;
      likes: number;
      followers: number;
      visitors: number;
      inCampaign: boolean;
      baseline: number | null;
      influencerMarker?: {
        username: string;
        profilePicUrl: string;
        likes: number;
      };
    }> = {};

    // D'abord les commandes
    filteredOrders.forEach((order) => {
      const date = order.created_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, revenue: 0, orders: 0, likes: 0, followers: 0, visitors: 0, inCampaign: false, baseline: null };
      }
      grouped[date].revenue += parseFloat(order.total_price || '0');
      grouped[date].orders += 1;

      // Marquer si dans la période de campagne
      if (campaignPeriod) {
        const orderDate = new Date(date);
        if (orderDate >= campaignPeriod.start && orderDate <= campaignPeriod.end) {
          grouped[date].inCampaign = true;
        }
      }
    });

    // Ajouter les métriques quotidiennes (followers et visitors)
    dailyMetrics.forEach((metric) => {
      if (!grouped[metric.date]) {
        grouped[metric.date] = { date: metric.date, revenue: 0, orders: 0, likes: 0, followers: 0, visitors: 0, inCampaign: false, baseline: null };
      }
      grouped[metric.date].followers = metric.followers;
      grouped[metric.date].visitors = metric.visitors;

      // Marquer si dans la période de campagne
      if (campaignPeriod) {
        const d = new Date(metric.date);
        if (d >= campaignPeriod.start && d <= campaignPeriod.end) {
          grouped[metric.date].inCampaign = true;
        }
      }
    });

    // Ajouter les likes des posts/stories produit si une campagne est sélectionnée
    if (selectedCampaign) {
      selectedCampaign.influencers.forEach((influencer: CampaignInfluencer) => {
        const allContent = getAllContent(influencer);
        allContent.forEach((post: ScrapedPost) => {
          if (post.mentionsProduct === true) {
            const postDate = new Date(post.timestamp).toISOString().split('T')[0];
            if (!grouped[postDate]) {
              grouped[postDate] = { date: postDate, revenue: 0, orders: 0, likes: 0, followers: 0, visitors: 0, inCampaign: true, baseline: null };
            }
            grouped[postDate].likes += post.likesCount;

            // Ajouter le marker influenceur (on garde le dernier si plusieurs posts le même jour)
            grouped[postDate].influencerMarker = {
              username: influencer.username,
              profilePicUrl: influencer.profilePicUrl,
              likes: post.likesCount,
            };
          }
        });
      });
    }

    // Ajouter la baseline pour chaque jour de la campagne
    if (baselineData && campaignPeriod) {
      Object.keys(grouped).forEach(date => {
        const d = new Date(date);
        if (d >= campaignPeriod.start && d <= campaignPeriod.end) {
          grouped[date].baseline = baselineData.dailyAverage;
        }
      });
    }

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => {
        // Calculer les valeurs au-dessus et en-dessous de la baseline
        const salesBaseline = item.baseline || baselineData?.dailyAverage || 0;
        const followersBaseline = baselineData?.dailyFollowers || 0;
        const visitorsBaseline = baselineData?.dailyVisitors || 0;

        return {
          ...item,
          dateLabel: new Date(item.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          }),
          // Valeurs pour les zones au-dessus/en-dessous de la baseline
          salesAbove: item.inCampaign && item.revenue > salesBaseline ? item.revenue : salesBaseline,
          salesBelow: item.inCampaign && item.revenue < salesBaseline ? item.revenue : salesBaseline,
          followersAbove: item.inCampaign && item.followers > followersBaseline ? item.followers : followersBaseline,
          followersBelow: item.inCampaign && item.followers < followersBaseline ? item.followers : followersBaseline,
          visitorsAbove: item.inCampaign && item.visitors > visitorsBaseline ? item.visitors : visitorsBaseline,
          visitorsBelow: item.inCampaign && item.visitors < visitorsBaseline ? item.visitors : visitorsBaseline,
          // Baselines pour le remplissage
          salesBaseline: item.inCampaign ? salesBaseline : null,
          followersBaseline: item.inCampaign ? followersBaseline : null,
          visitorsBaseline: item.inCampaign ? visitorsBaseline : null,
        };
      });
  }, [filteredOrders, dailyMetrics, campaignPeriod, selectedCampaign, baselineData, mentions]);

  // Trouver les index de début et fin de campagne pour le graphique
  const campaignChartRange = useMemo(() => {
    if (!campaignPeriod || chartData.length === 0) return null;

    const startIndex = chartData.findIndex(d => d.date >= campaignPeriod.startStr);
    const endIndex = chartData.findIndex(d => d.date > campaignPeriod.endStr);

    if (startIndex === -1) return null;

    return {
      startLabel: chartData[startIndex]?.dateLabel,
      endLabel: chartData[endIndex === -1 ? chartData.length - 1 : endIndex - 1]?.dateLabel,
    };
  }, [chartData, campaignPeriod]);

  // Données des posts influenceurs pour les markers sur le graphique
  const influencerPostMarkers = useMemo(() => {
    if (!selectedCampaign) return [];

    const markers: Array<{
      date: string;
      dateLabel: string;
      username: string;
      profilePicUrl: string;
      postCount: number;
      totalLikes: number;
    }> = [];

    // Grouper les posts/stories par date et influenceur
    const postsByDateAndInfluencer: Record<string, Record<string, { count: number; likes: number; profilePicUrl: string }>> = {};

    selectedCampaign.influencers.forEach((influencer: CampaignInfluencer) => {
      const allContent = getAllContent(influencer);
      allContent.forEach((post: ScrapedPost) => {
        if (post.mentionsProduct === true) {
          const postDate = new Date(post.timestamp).toISOString().split('T')[0];

          if (!postsByDateAndInfluencer[postDate]) {
            postsByDateAndInfluencer[postDate] = {};
          }
          if (!postsByDateAndInfluencer[postDate][influencer.username]) {
            postsByDateAndInfluencer[postDate][influencer.username] = {
              count: 0,
              likes: 0,
              profilePicUrl: influencer.profilePicUrl,
            };
          }
          postsByDateAndInfluencer[postDate][influencer.username].count += 1;
          postsByDateAndInfluencer[postDate][influencer.username].likes += post.likesCount;
        }
      });
    });

    // Convertir en array de markers
    Object.entries(postsByDateAndInfluencer).forEach(([date, influencers]) => {
      Object.entries(influencers).forEach(([username, data]) => {
        markers.push({
          date,
          dateLabel: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          username,
          profilePicUrl: data.profilePicUrl,
          postCount: data.count,
          totalLikes: data.likes,
        });
      });
    });

    return markers.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedCampaign, mentions]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            Bonjour{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-sm sm:text-base text-foreground-secondary">
            Aperçu de vos ventes
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Campaign selector */}
          <div className="relative">
            <Button
              variant={selectedCampaign ? 'primary' : 'secondary'}
              onClick={() => setShowCampaignMenu(!showCampaignMenu)}
              className="w-full sm:min-w-[180px] justify-between"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              {selectedCampaign ? selectedCampaign.name : 'Sélectionner campagne'}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>

            {showCampaignMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCampaignMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => {
                      setSelectedCampaignId(null);
                      setShowCampaignMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-background-secondary transition-colors ${
                      !selectedCampaignId ? 'text-accent font-medium' : 'text-foreground'
                    }`}
                  >
                    Aucune campagne
                  </button>
                  {campaigns.length > 0 && (
                    <div className="border-t border-border my-1" />
                  )}
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setShowCampaignMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-background-secondary transition-colors ${
                        selectedCampaignId === campaign.id ? 'text-accent font-medium' : 'text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{campaign.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          campaign.status === 'active'
                            ? 'bg-success/10 text-success'
                            : 'bg-foreground-secondary/10 text-foreground-secondary'
                        }`}>
                          {campaign.status === 'active' ? 'Active' : 'Terminée'}
                        </span>
                      </div>
                    </button>
                  ))}
                  {campaigns.length === 0 && (
                    <p className="px-4 py-2 text-sm text-foreground-secondary">
                      Aucune campagne créée
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Date range selector */}
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="w-full sm:min-w-[160px] justify-between"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {dateRangeLabels[dateRange]}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>

            {showDateMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDateMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
                  {(Object.keys(dateRangeLabels) as DateRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setShowDateMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-background-secondary transition-colors ${
                        dateRange === range ? 'text-accent font-medium' : 'text-foreground'
                      }`}
                    >
                      {dateRangeLabels[range]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats de la campagne sélectionnée */}
      {selectedCampaign && campaignStats && baselineData && (
        <Card className="bg-accent/5 border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-foreground">
                Impact de la campagne : {selectedCampaign.name}
              </h3>
            </div>
            {attributionResult && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground-secondary">Confiance:</span>
                <span className={`font-semibold ${
                  attributionResult.confidenceScore > 0.7 ? 'text-success' :
                  attributionResult.confidenceScore > 0.4 ? 'text-warning' : 'text-danger'
                }`}>
                  {(attributionResult.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {/* Valeur réelle */}
            <div>
              <p className="text-sm text-foreground-secondary">
                {chartMetric === 'sales' ? 'CA réel' : chartMetric === 'followers' ? 'Followers gagnés' : 'Visiteurs'}
              </p>
              <p className="text-xl font-semibold text-foreground">
                {chartMetric === 'sales'
                  ? formatCurrency(campaignStats.campaignRevenue)
                  : chartMetric === 'followers'
                  ? `+${formatNumber(campaignStats.campaignFollowers)}`
                  : formatNumber(campaignStats.campaignVisitors)
                }
              </p>
              <p className="text-xs text-foreground-secondary">
                {chartMetric === 'sales'
                  ? `${campaignStats.campaignOrders} commandes`
                  : `sur ${campaignStats.campaignDays} jours`
                }
              </p>
            </div>
            {/* Baseline attendu */}
            <div>
              <p className="text-sm text-foreground-secondary">
                {chartMetric === 'sales' ? 'CA attendu' : chartMetric === 'followers' ? 'Followers attendus' : 'Visiteurs attendus'} (baseline)
              </p>
              <p className="text-xl font-semibold text-foreground-secondary">
                {chartMetric === 'sales'
                  ? formatCurrency(campaignStats.expectedRevenue)
                  : chartMetric === 'followers'
                  ? `+${formatNumber(Math.round(campaignStats.expectedFollowers))}`
                  : formatNumber(Math.round(campaignStats.expectedVisitors))
                }
              </p>
              <p className="text-xs text-foreground-secondary">
                {chartMetric === 'sales'
                  ? `${formatCurrency(baselineData.dailyAverage)}/jour`
                  : chartMetric === 'followers'
                  ? `${Math.round(baselineData.dailyFollowers)}/jour`
                  : `${Math.round(baselineData.dailyVisitors)}/jour`
                } × {campaignStats.campaignDays}j
              </p>
            </div>
            {/* Impact attribué */}
            <div>
              <p className="text-sm text-foreground-secondary">Impact campagne</p>
              {(() => {
                const attributedRevenue = attributionResult?.totalAttributedRevenue || 0;
                return (
                  <p className={`text-xl font-semibold ${
                    (chartMetric === 'sales' ? attributedRevenue : chartMetric === 'followers' ? campaignStats.incrementalFollowers : campaignStats.incrementalVisitors) > 0
                      ? 'text-success'
                      : 'text-foreground-secondary'
                  }`}>
                    +{chartMetric === 'sales'
                      ? formatCurrency(attributedRevenue)
                      : formatNumber(Math.round(chartMetric === 'followers' ? campaignStats.incrementalFollowers : campaignStats.incrementalVisitors))
                    }
                  </p>
                );
              })()}
              <p className="text-xs text-foreground-secondary">
                {chartMetric === 'sales' ? 'CA attribué' : chartMetric === 'followers' ? 'Followers additionnels' : 'Visiteurs additionnels'}
              </p>
            </div>
            {/* Variation vs baseline */}
            <div>
              <p className="text-sm text-foreground-secondary">Variation vs baseline</p>
              {(() => {
                const variation = chartMetric === 'sales'
                  ? campaignStats.variation
                  : chartMetric === 'followers'
                  ? campaignStats.followersVariation
                  : campaignStats.visitorsVariation;
                return (
                  <p className={`text-xl font-semibold flex items-center gap-1 ${
                    variation >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {variation >= 0 ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                    {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                  </p>
                );
              })()}
            </div>
            {/* ROI basé sur l'attribution */}
            <div>
              <p className="text-sm text-foreground-secondary">ROI</p>
              {(() => {
                const attributedRevenue = attributionResult?.totalAttributedRevenue || 0;
                const budget = selectedCampaign.totalBudget || 0;
                const roi = budget > 0 ? ((attributedRevenue - budget) / budget) * 100 : 0;
                return (
                  <>
                    <p className={`text-xl font-semibold ${roi >= 0 ? 'text-success' : 'text-danger'}`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      Budget: {formatCurrency(budget)}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Signaux d'attribution */}
          {attributionResult && attributionResult.totalAttributedRevenue > 0 && (
            <div className="mt-4 pt-4 border-t border-accent/20">
              <p className="text-xs font-medium text-foreground-secondary mb-2">
                Signaux d'attribution détectés:
              </p>
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const totals = attributionResult.influencers.reduce(
                    (acc, inf) => ({
                      temporal: acc.temporal + inf.signals.temporal,
                      newCustomer: acc.newCustomer + inf.signals.newCustomer,
                      productMatch: acc.productMatch + inf.signals.productMatch,
                      anomaly: acc.anomaly + inf.signals.anomaly,
                      baseline: acc.baseline + inf.signals.baseline,
                    }),
                    { temporal: 0, newCustomer: 0, productMatch: 0, anomaly: 0, baseline: 0 }
                  );
                  return (
                    <>
                      {totals.temporal > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-info/10 text-info text-xs">
                          <Clock className="w-3 h-3" />
                          <span>Temporel: {formatCurrency(totals.temporal)}</span>
                        </div>
                      )}
                      {totals.newCustomer > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-xs">
                          <UserPlus className="w-3 h-3" />
                          <span>Nouveaux clients: {formatCurrency(totals.newCustomer)}</span>
                        </div>
                      )}
                      {totals.productMatch > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs">
                          <Tag className="w-3 h-3" />
                          <span>Produit mentionné: {formatCurrency(totals.productMatch)}</span>
                        </div>
                      )}
                      {totals.anomaly > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs">
                          <Zap className="w-3 h-3" />
                          <span>Pics détectés: {formatCurrency(totals.anomaly)}</span>
                        </div>
                      )}
                      {totals.baseline > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground-secondary/10 text-foreground-secondary text-xs">
                          <BarChart3 className="w-3 h-3" />
                          <span>Baseline: {formatCurrency(totals.baseline)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* KPIs - masqués quand une campagne est sélectionnée */}
      {!selectedCampaign && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Chiffre d'affaires</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Commandes</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalOrders}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Panier moyen</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Articles vendus</p>
                <p className="text-2xl font-semibold text-foreground">{stats.totalItemsSold}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Graphique */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            {/* Onglets de sélection de métrique avec couleurs distinctes */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <button
                onClick={() => setChartMetric('sales')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  chartMetric === 'sales'
                    ? 'bg-emerald-500 text-white'
                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-emerald-600'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                Ventes
              </button>
              <button
                onClick={() => setChartMetric('followers')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  chartMetric === 'followers'
                    ? 'bg-blue-500 text-white'
                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-blue-600'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                Followers
              </button>
              <button
                onClick={() => setChartMetric('visitors')}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  chartMetric === 'visitors'
                    ? 'bg-purple-500 text-white'
                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-purple-600'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                Visiteurs
              </button>
            </div>
            {selectedCampaign && campaignPeriod && (
              <p className="text-xs sm:text-sm text-foreground-secondary hidden sm:block">
                Zone colorée = au-dessus de la baseline, zone rouge = en-dessous
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'bar' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="text-xs sm:text-sm"
            >
              Barres
            </Button>
            <Button
              variant={chartType === 'line' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setChartType('line')}
              className="text-xs sm:text-sm"
            >
              Ligne
            </Button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-[280px] sm:h-[320px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  width={45}
                  tickFormatter={(v) =>
                    chartMetric === 'sales' ? `${v}€` : formatNumber(v)
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground mb-2">{label}</p>
                        {chartMetric === 'sales' && (
                          <>
                            <p className="text-sm text-foreground">
                              CA: <span className="font-semibold">{formatCurrency(data?.revenue || 0)}</span>
                            </p>
                            {data?.baseline && (
                              <p className="text-sm text-foreground-secondary">
                                Baseline: {formatCurrency(data.baseline)}
                              </p>
                            )}
                          </>
                        )}
                        {chartMetric === 'followers' && (
                          <p className="text-sm text-foreground">
                            Followers gagnés: <span className="font-semibold">+{formatNumber(data?.followers || 0)}</span>
                          </p>
                        )}
                        {chartMetric === 'visitors' && (
                          <p className="text-sm text-foreground">
                            Visiteurs: <span className="font-semibold">{formatNumber(data?.visitors || 0)}</span>
                          </p>
                        )}
                        {data?.influencerMarker && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs text-accent">
                              📸 Post de @{data.influencerMarker.username}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Zone de campagne */}
                {campaignChartRange && (
                  <ReferenceArea
                    x1={campaignChartRange.startLabel}
                    x2={campaignChartRange.endLabel}
                    fill="#D97706"
                    fillOpacity={0.1}
                    stroke="#D97706"
                    strokeOpacity={0.3}
                    yAxisId="left"
                  />
                )}

                {/* Ligne baseline (pointillée) */}
                {baselineData && selectedCampaign && (
                  <ReferenceLine
                    yAxisId="left"
                    y={
                      chartMetric === 'sales'
                        ? baselineData.dailyAverage
                        : chartMetric === 'followers'
                        ? baselineData.dailyFollowers
                        : baselineData.dailyVisitors
                    }
                    stroke="#6B7280"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Baseline: ${
                        chartMetric === 'sales'
                          ? formatCurrency(baselineData.dailyAverage)
                          : Math.round(chartMetric === 'followers' ? baselineData.dailyFollowers : baselineData.dailyVisitors)
                      }/jour`,
                      position: 'insideTopLeft',
                      fill: '#6B7280',
                      fontSize: 11,
                    }}
                  />
                )}

                {/* Areas pour visualiser au-dessus et en-dessous de la baseline */}
                {selectedCampaign && chartType === 'line' && (
                  <>
                    {/* Zone au-dessus de la baseline (couleur positive) */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={
                        chartMetric === 'sales' ? 'salesAbove' :
                        chartMetric === 'followers' ? 'followersAbove' : 'visitorsAbove'
                      }
                      fill={metricColors[chartMetric].light}
                      stroke="none"
                      baseValue={
                        chartMetric === 'sales' ? baselineData?.dailyAverage || 0 :
                        chartMetric === 'followers' ? baselineData?.dailyFollowers || 0 :
                        baselineData?.dailyVisitors || 0
                      }
                    />
                    {/* Zone en-dessous de la baseline (couleur négative) */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey={
                        chartMetric === 'sales' ? 'salesBelow' :
                        chartMetric === 'followers' ? 'followersBelow' : 'visitorsBelow'
                      }
                      fill={metricColors[chartMetric].negative}
                      stroke="none"
                      baseValue={
                        chartMetric === 'sales' ? baselineData?.dailyAverage || 0 :
                        chartMetric === 'followers' ? baselineData?.dailyFollowers || 0 :
                        baselineData?.dailyVisitors || 0
                      }
                    />
                  </>
                )}

                {/* Barres ou Ligne pour la métrique sélectionnée */}
                {chartType === 'bar' ? (
                  <Bar
                    yAxisId="left"
                    dataKey={chartMetric === 'sales' ? 'revenue' : chartMetric === 'followers' ? 'followers' : 'visitors'}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, index) => {
                      // Déterminer la couleur en fonction de la baseline
                      const baseline = chartMetric === 'sales' ? baselineData?.dailyAverage || 0 :
                        chartMetric === 'followers' ? baselineData?.dailyFollowers || 0 :
                        baselineData?.dailyVisitors || 0;
                      const value = chartMetric === 'sales' ? entry.revenue :
                        chartMetric === 'followers' ? entry.followers : entry.visitors;
                      const isAboveBaseline = value >= baseline;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.inCampaign
                            ? (isAboveBaseline ? metricColors[chartMetric].main : '#EF4444')
                            : '#9CA3AF'}
                        />
                      );
                    })}
                  </Bar>
                ) : (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={chartMetric === 'sales' ? 'revenue' : chartMetric === 'followers' ? 'followers' : 'visitors'}
                    stroke={metricColors[chartMetric].main}
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      if (payload?.influencerMarker) {
                        // Afficher la photo de l'influenceur
                        return (
                          <g key={`marker-${payload.date}`}>
                            <circle cx={cx} cy={cy} r={16} fill="white" stroke={metricColors[chartMetric].main} strokeWidth={2} />
                            <clipPath id={`clip-${payload.date}`}>
                              <circle cx={cx} cy={cy} r={14} />
                            </clipPath>
                            <image
                              x={cx - 14}
                              y={cy - 14}
                              width={28}
                              height={28}
                              href={payload.influencerMarker.profilePicUrl
                                ? `/api/proxy-image?url=${encodeURIComponent(payload.influencerMarker.profilePicUrl)}`
                                : ''
                              }
                              clipPath={`url(#clip-${payload.date})`}
                              style={{ borderRadius: '50%' }}
                            />
                          </g>
                        );
                      }

                      // Couleur du point selon baseline
                      const baseline = chartMetric === 'sales' ? baselineData?.dailyAverage || 0 :
                        chartMetric === 'followers' ? baselineData?.dailyFollowers || 0 :
                        baselineData?.dailyVisitors || 0;
                      const value = chartMetric === 'sales' ? payload?.revenue :
                        chartMetric === 'followers' ? payload?.followers : payload?.visitors;
                      const isAboveBaseline = value >= baseline;

                      return (
                        <circle
                          key={`dot-${payload?.date || index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload?.inCampaign
                            ? (isAboveBaseline ? metricColors[chartMetric].main : '#EF4444')
                            : '#9CA3AF'}
                        />
                      );
                    }}
                  />
                )}

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-foreground-secondary">
            Aucune donnée pour cette période
          </div>
        )}

        {/* Légende */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 text-xs sm:text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: metricColors[chartMetric].main }} />
            <span className="text-foreground-secondary">
              <span className="hidden sm:inline">{chartMetric === 'sales' ? 'CA' : chartMetric === 'followers' ? 'Followers' : 'Visiteurs'} </span>
              <span className="sm:hidden">+</span>Baseline
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#EF4444]" />
            <span className="text-foreground-secondary">
              <span className="hidden sm:inline">{chartMetric === 'sales' ? 'CA' : chartMetric === 'followers' ? 'Followers' : 'Visiteurs'} </span>
              <span className="sm:hidden">-</span>Baseline
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#9CA3AF]" />
            <span className="text-foreground-secondary">Hors campagne</span>
          </div>
          {selectedCampaign && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border-2 bg-white" style={{ borderColor: metricColors[chartMetric].main }} />
              <span className="text-foreground-secondary">Post</span>
            </div>
          )}
        </div>
      </Card>

      {/* Tableau CRM des influenceurs quand une campagne est sélectionnée */}
      {selectedCampaign && influencerStats.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <CardTitle className="text-base sm:text-lg">Performance par influenceur</CardTitle>
              <p className="text-xs sm:text-sm text-foreground-secondary mt-1 hidden sm:block">
                Attribution intelligente basée sur l'analyse des signaux
              </p>
            </div>
            <Link href={`/campaigns/${selectedCampaign.id}`}>
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Voir détails
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {influencerStats.map((inf) => (
              <div key={inf.username} className="border border-border/50 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {inf.profilePicUrl ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(inf.profilePicUrl)}`}
                        alt={inf.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-accent">
                        {inf.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {inf.fullName || inf.username}
                    </p>
                    <p className="text-xs text-foreground-secondary">@{inf.username}</p>
                  </div>
                  <div className={`text-right ${inf.roi > 0 ? 'text-success' : inf.roi < 0 ? 'text-danger' : 'text-foreground-secondary'}`}>
                    <p className="text-sm font-semibold flex items-center justify-end gap-0.5">
                      {inf.roi > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : inf.roi < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                      {inf.roi > 0 ? '+' : ''}{inf.roi.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-foreground-secondary">ROI</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className={`text-sm font-semibold ${inf.attributedRevenue > 0 ? 'text-success' : 'text-foreground'}`}>
                      {formatCurrency(inf.attributedRevenue)}
                    </p>
                    <p className="text-[10px] text-foreground-secondary">CA attribué</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inf.attributedSales}</p>
                    <p className="text-[10px] text-foreground-secondary">Ventes</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatNumber(inf.likes + inf.comments)}</p>
                    <p className="text-[10px] text-foreground-secondary">Engagement</p>
                  </div>
                </div>
              </div>
            ))}
            {/* Total mobile */}
            <div className="bg-background-secondary/50 rounded-lg p-3">
              <p className="font-medium text-foreground text-sm mb-2">Total</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-semibold text-success">{formatCurrency(influencerTotals.attributedRevenue)}</p>
                  <p className="text-[10px] text-foreground-secondary">CA</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-success">{influencerTotals.attributedSales}</p>
                  <p className="text-[10px] text-foreground-secondary">Ventes</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${influencerTotals.attributedRevenue > influencerTotals.budget ? 'text-success' : 'text-danger'}`}>
                    {influencerTotals.budget > 0 ? `${((influencerTotals.attributedRevenue - influencerTotals.budget) / influencerTotals.budget * 100).toFixed(0)}%` : '-'}
                  </p>
                  <p className="text-[10px] text-foreground-secondary">ROI</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-sm text-foreground-secondary">
                  <th className="text-left py-3 px-2 font-medium">Influenceur</th>
                  <th className="text-center py-3 px-2 font-medium">Posts</th>
                  <th className="text-center py-3 px-2 font-medium">Engagement</th>
                  <th className="text-center py-3 px-2 font-medium">Ventes</th>
                  <th className="text-center py-3 px-2 font-medium">CA attribué</th>
                  <th className="text-center py-3 px-2 font-medium">Followers</th>
                  <th className="text-center py-3 px-2 font-medium">Visiteurs</th>
                  <th className="text-center py-3 px-2 font-medium">Budget</th>
                  <th className="text-center py-3 px-2 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {influencerStats.map((inf) => (
                  <tr
                    key={inf.username}
                    className="border-b border-border/50 hover:bg-background-secondary/50 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {inf.profilePicUrl ? (
                            <img
                              src={`/api/proxy-image?url=${encodeURIComponent(inf.profilePicUrl)}`}
                              alt={inf.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-accent">
                              {inf.username.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{inf.fullName || inf.username}</p>
                          <p className="text-xs text-foreground-secondary">@{inf.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm font-medium text-foreground">{inf.productPosts}</span>
                      <span className="text-xs text-foreground-secondary">/{inf.totalPosts}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm text-foreground">{formatNumber(inf.likes + inf.comments)}</span>
                        <span className="text-xs text-foreground-secondary">{formatNumber(inf.likes)} ❤️ {formatNumber(inf.comments)} 💬</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-medium ${inf.attributedSales > 0 ? 'text-success' : 'text-foreground-secondary'}`}>{inf.attributedSales}</span>
                        <span className={`text-xs ${inf.confidence > 0.7 ? 'text-success' : inf.confidence > 0.4 ? 'text-warning' : 'text-foreground-secondary'}`}>
                          {(inf.confidence * 100).toFixed(0)}% confiance
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-sm font-medium ${inf.attributedRevenue > 0 ? 'text-success' : 'text-foreground-secondary'}`}>
                        {formatCurrency(inf.attributedRevenue)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-sm font-medium ${inf.attributedFollowers > 0 ? 'text-info' : 'text-foreground-secondary'}`}>
                        +{formatNumber(inf.attributedFollowers)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-sm font-medium ${inf.attributedVisitors > 0 ? 'text-accent' : 'text-foreground-secondary'}`}>
                        {formatNumber(inf.attributedVisitors)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-sm text-foreground">{formatCurrency(inf.budget)}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${inf.roi > 0 ? 'text-success' : inf.roi < 0 ? 'text-danger' : 'text-foreground-secondary'}`}>
                        {inf.roi > 0 ? <ArrowUpRight className="w-4 h-4" /> : inf.roi < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                        {inf.roi > 0 ? '+' : ''}{inf.roi.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-background-secondary/50 font-medium">
                  <td className="py-3 px-2 text-foreground">Total</td>
                  <td className="py-3 px-2 text-center text-foreground">{influencerStats.reduce((sum, i) => sum + i.productPosts, 0)}</td>
                  <td className="py-3 px-2 text-center text-foreground">{formatNumber(influencerTotals.likes + influencerTotals.comments)}</td>
                  <td className="py-3 px-2 text-center text-success font-semibold">{influencerTotals.attributedSales}</td>
                  <td className="py-3 px-2 text-center text-success font-semibold">{formatCurrency(influencerTotals.attributedRevenue)}</td>
                  <td className="py-3 px-2 text-center text-info font-semibold">+{formatNumber(influencerTotals.attributedFollowers)}</td>
                  <td className="py-3 px-2 text-center text-accent font-semibold">{formatNumber(influencerTotals.attributedVisitors)}</td>
                  <td className="py-3 px-2 text-center text-foreground">{formatCurrency(influencerTotals.budget)}</td>
                  <td className="py-3 px-2 text-center">
                    {influencerTotals.budget > 0 && (
                      <span className={`font-semibold ${influencerTotals.attributedRevenue > influencerTotals.budget ? 'text-success' : 'text-danger'}`}>
                        {((influencerTotals.attributedRevenue - influencerTotals.budget) / influencerTotals.budget * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note explicative - masquée sur mobile */}
          <div className="hidden sm:block mt-4 p-3 rounded-lg bg-info/5 border border-info/20">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
              <div className="text-xs text-info">
                <strong>Attribution intelligente sans friction:</strong>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Temporel = Achat dans les 48h après un post</span>
                  <span className="inline-flex items-center gap-1"><UserPlus className="w-3 h-3" /> Nouveau = Premier achat du client</span>
                  <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" /> Produit = Correspond au produit mentionné</span>
                  <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3" /> Pic = Ventes anormalement élevées</span>
                  <span className="inline-flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Baseline = Répartition par engagement</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Accès aux campagnes */}
      <Link href="/campaigns">
        <Card className="bg-accent/5 border-accent/20 hover:bg-accent/10 transition-colors cursor-pointer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Campagnes d'influence</h3>
                <p className="text-xs sm:text-sm text-foreground-secondary truncate">
                  {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} <span className="hidden sm:inline">· Gérez vos influenceurs</span>
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
          </div>
        </Card>
      </Link>
    </div>
  );
}
