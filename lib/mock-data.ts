import { Campaign, Influencer, Post, Order, HourlyMetric, AttributionData, CampaignInsight } from './types';
import { subDays, subHours, addHours, startOfDay, setHours } from 'date-fns';

// ============================================
// DONNÉES FIXES 2025-2026 POUR LA DÉMO
// ============================================

// Types pour les objectifs de campagne
export type CampaignObjective = 'ventes' | 'notoriete' | 'engagement' | 'lancement';

export const campaignObjectives: { value: CampaignObjective; label: string; description: string }[] = [
  { value: 'ventes', label: 'Ventes directes', description: 'Maximiser les conversions et le CA' },
  { value: 'notoriete', label: 'Notoriété', description: 'Augmenter la visibilité de la marque' },
  { value: 'engagement', label: 'Engagement', description: 'Générer des interactions et de l\'UGC' },
  { value: 'lancement', label: 'Lancement produit', description: 'Introduire un nouveau produit' },
];

// Interface étendue pour les campagnes avec objectif
export interface CampaignWithObjective extends Campaign {
  objective: CampaignObjective;
  totalRevenue: number;
  roi: number;
}

// Interface pour les influenceurs avec historique
export interface InfluencerWithHistory extends Influencer {
  campaignHistory: {
    campaignId: string;
    campaignName: string;
    budget: number;
    revenue: number;
    roi: number;
    date: string;
  }[];
  totalBudget: number;
  totalRevenue: number;
  averageRoi: number;
}

const now = new Date();

// Influenceuses avec historique de campagnes
export const influencers: InfluencerWithHistory[] = [
  {
    id: 'inf-1',
    username: 'lenamahfouf',
    displayName: 'Léna Mahfouf',
    avatarUrl: '',
    followers: 4200000,
    avgEngagement: 3.2,
    category: 'Lifestyle',
    posts: [],
    attribution: {
      influencerId: 'inf-1',
      postId: 'post-1',
      ordersAttributed: 156,
      revenueAttributed: 52500,
      liftPercentage: 206,
      confidence: 'high',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-1', campaignName: 'Lancement Sérum 2025', budget: 8000, revenue: 24500, roi: 206, date: '2025-02' },
      { campaignId: 'camp-3', campaignName: 'Summer Glow', budget: 10000, revenue: 28000, roi: 180, date: '2025-07' },
    ],
    totalBudget: 18000,
    totalRevenue: 52500,
    averageRoi: 192,
  },
  {
    id: 'inf-2',
    username: 'enjoyphoenix',
    displayName: 'Marie Lopez',
    avatarUrl: '',
    followers: 5100000,
    avgEngagement: 2.8,
    category: 'Beauty',
    posts: [],
    attribution: {
      influencerId: 'inf-2',
      postId: 'post-4',
      ordersAttributed: 198,
      revenueAttributed: 41000,
      liftPercentage: 242,
      confidence: 'high',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-1', campaignName: 'Lancement Sérum 2025', budget: 12000, revenue: 41000, roi: 242, date: '2025-02' },
    ],
    totalBudget: 12000,
    totalRevenue: 41000,
    averageRoi: 242,
  },
  {
    id: 'inf-3',
    username: 'sananas',
    displayName: 'Sanaa El Mahalli',
    avatarUrl: '',
    followers: 2800000,
    avgEngagement: 3.5,
    category: 'Beauty & Lifestyle',
    posts: [],
    attribution: {
      influencerId: 'inf-3',
      postId: 'post-6',
      ordersAttributed: 112,
      revenueAttributed: 24100,
      liftPercentage: 221,
      confidence: 'high',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-2', campaignName: 'Anti-Âge Premium', budget: 3500, revenue: 8900, roi: 154, date: '2025-04' },
      { campaignId: 'camp-4', campaignName: 'Black Friday 2025', budget: 4000, revenue: 15200, roi: 280, date: '2025-11' },
    ],
    totalBudget: 7500,
    totalRevenue: 24100,
    averageRoi: 221,
  },
  {
    id: 'inf-4',
    username: 'cloecouture',
    displayName: 'Chloé Martin',
    avatarUrl: '',
    followers: 520000,
    avgEngagement: 4.1,
    category: 'Fashion & Beauty',
    posts: [],
    attribution: {
      influencerId: 'inf-4',
      postId: 'post-8',
      ordersAttributed: 45,
      revenueAttributed: 5800,
      liftPercentage: 132,
      confidence: 'medium',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-2', campaignName: 'Anti-Âge Premium', budget: 2500, revenue: 5800, roi: 132, date: '2025-04' },
    ],
    totalBudget: 2500,
    totalRevenue: 5800,
    averageRoi: 132,
  },
  {
    id: 'inf-5',
    username: 'juliebeautylab',
    displayName: 'Julie Renard',
    avatarUrl: '',
    followers: 340000,
    avgEngagement: 5.2,
    category: 'Skincare',
    posts: [],
    attribution: {
      influencerId: 'inf-5',
      postId: 'post-10',
      ordersAttributed: 89,
      revenueAttributed: 16000,
      liftPercentage: 256,
      confidence: 'high',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-3', campaignName: 'Summer Glow', budget: 2000, revenue: 6200, roi: 210, date: '2025-07' },
      { campaignId: 'camp-4', campaignName: 'Black Friday 2025', budget: 2500, revenue: 9800, roi: 292, date: '2025-11' },
    ],
    totalBudget: 4500,
    totalRevenue: 16000,
    averageRoi: 256,
  },
  {
    id: 'inf-6',
    username: 'emma.skincare',
    displayName: 'Emma Dubois',
    avatarUrl: '',
    followers: 180000,
    avgEngagement: 5.8,
    category: 'Skincare',
    posts: [],
    attribution: {
      influencerId: 'inf-6',
      postId: 'post-12',
      ordersAttributed: 34,
      revenueAttributed: 6900,
      liftPercentage: 173,
      confidence: 'medium',
      conversionWindow: 48,
    },
    campaignHistory: [
      { campaignId: 'camp-4', campaignName: 'Black Friday 2025', budget: 1500, revenue: 4100, roi: 173, date: '2025-11' },
      { campaignId: 'camp-5', campaignName: 'Nouvelle Année 2026', budget: 2000, revenue: 2800, roi: 40, date: '2026-01' },
    ],
    totalBudget: 3500,
    totalRevenue: 6900,
    averageRoi: 97,
  },
];

// Posts (générés à partir des campagnes)
export const posts: Post[] = [
  // Campagne active - Nouvelle Année 2026
  {
    id: 'post-1',
    influencerId: 'inf-5',
    timestamp: new Date('2026-01-08T11:00:00Z'),
    type: 'reel',
    caption: 'Nouvelle année, nouvelle routine skincare ! Le sérum hydratant est mon must-have 2026 ✨',
    likes: 14000,
    comments: 380,
    views: 95000,
    url: 'https://instagram.com/p/abc123',
  },
  {
    id: 'post-2',
    influencerId: 'inf-5',
    timestamp: new Date('2026-01-12T09:30:00Z'),
    type: 'story',
    caption: 'Application matinale du sérum',
    likes: 8500,
    comments: 0,
    views: 42000,
    url: 'https://instagram.com/stories/juliebeautylab/123',
  },
  {
    id: 'post-3',
    influencerId: 'inf-6',
    timestamp: new Date('2026-01-10T09:00:00Z'),
    type: 'carousel',
    caption: 'Comment réparer sa peau après les fêtes - ma routine en 5 étapes',
    likes: 7200,
    comments: 165,
    url: 'https://instagram.com/p/def456',
  },
  {
    id: 'post-4',
    influencerId: 'inf-6',
    timestamp: new Date('2026-01-14T14:00:00Z'),
    type: 'reel',
    caption: 'Routine complète du soir avec le sérum hydratant intense',
    likes: 5800,
    comments: 120,
    views: 38000,
    url: 'https://instagram.com/p/ghi789',
  },
  // Posts historiques pour affichage
  {
    id: 'post-5',
    influencerId: 'inf-1',
    timestamp: new Date('2025-02-05T14:30:00Z'),
    type: 'reel',
    caption: 'Je teste le nouveau sérum depuis 2 semaines et ma peau est transformée...',
    likes: 89000,
    comments: 1200,
    views: 520000,
    url: 'https://instagram.com/p/jkl012',
  },
  {
    id: 'post-6',
    influencerId: 'inf-2',
    timestamp: new Date('2025-02-10T16:00:00Z'),
    type: 'reel',
    caption: 'Mes essentiels skincare du moment ! Le sérum est incroyable',
    likes: 145000,
    comments: 3400,
    views: 890000,
    url: 'https://instagram.com/p/mno345',
  },
];

// Associer les posts aux influenceurs
influencers.forEach(inf => {
  inf.posts = posts.filter(p => p.influencerId === inf.id);
});

// Campagnes 2025-2026 avec objectifs
export const campaigns: CampaignWithObjective[] = [
  {
    id: 'camp-1',
    name: 'Lancement Sérum 2025',
    product: 'Sérum Hydratant Intense',
    sku: 'SERUM-HYDRA-30ML',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-28'),
    status: 'completed',
    budget: 20000,
    influencers: ['inf-1', 'inf-2'],
    objective: 'lancement',
    totalRevenue: 65500,
    roi: 228,
  },
  {
    id: 'camp-2',
    name: 'Anti-Âge Premium',
    product: 'Crème Anti-Âge Premium',
    sku: 'CREME-ANTIAGE-50ML',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-04-30'),
    status: 'completed',
    budget: 6000,
    influencers: ['inf-3', 'inf-4'],
    objective: 'ventes',
    totalRevenue: 14700,
    roi: 145,
  },
  {
    id: 'camp-3',
    name: 'Summer Glow',
    product: 'Huile Visage Éclat',
    sku: 'HUILE-ECLAT-30ML',
    startDate: new Date('2025-06-15'),
    endDate: new Date('2025-07-15'),
    status: 'completed',
    budget: 12000,
    influencers: ['inf-1', 'inf-5'],
    objective: 'notoriete',
    totalRevenue: 34200,
    roi: 185,
  },
  {
    id: 'camp-4',
    name: 'Black Friday 2025',
    product: 'Coffret Routine Complète',
    sku: 'COFFRET-ROUTINE',
    startDate: new Date('2025-11-20'),
    endDate: new Date('2025-11-30'),
    status: 'completed',
    budget: 8000,
    influencers: ['inf-3', 'inf-5', 'inf-6'],
    objective: 'ventes',
    totalRevenue: 29100,
    roi: 264,
  },
  {
    id: 'camp-5',
    name: 'Nouvelle Année 2026',
    product: 'Sérum Hydratant Intense',
    sku: 'SERUM-HYDRA-30ML',
    startDate: new Date('2026-01-05'),
    endDate: new Date('2026-01-31'),
    status: 'active',
    budget: 5000,
    influencers: ['inf-5', 'inf-6'],
    objective: 'engagement',
    totalRevenue: 8200,
    roi: 64,
  },
];

// Mapping campagne -> influenceurs avec détails
export const campaignInfluencerDetails: Record<string, {
  influencerId: string;
  budget: number;
  revenue: number;
  roi: number;
  posts: { id: string; timestamp: string; caption: string; likes: number; comments: number }[];
}[]> = {
  'camp-1': [
    {
      influencerId: 'inf-1',
      budget: 8000,
      revenue: 24500,
      roi: 206,
      posts: [
        { id: 'p1-1', timestamp: '2025-02-05T14:30:00Z', caption: 'Je teste le nouveau sérum depuis 2 semaines...', likes: 89000, comments: 1200 },
        { id: 'p1-2', timestamp: '2025-02-18T10:00:00Z', caption: 'Routine du matin avec mon sérum préféré...', likes: 67000, comments: 890 },
      ],
    },
    {
      influencerId: 'inf-2',
      budget: 12000,
      revenue: 41000,
      roi: 242,
      posts: [
        { id: 'p2-1', timestamp: '2025-02-10T16:00:00Z', caption: 'Mes essentiels skincare du moment !', likes: 145000, comments: 3400 },
      ],
    },
  ],
  'camp-2': [
    {
      influencerId: 'inf-3',
      budget: 3500,
      revenue: 8900,
      roi: 154,
      posts: [
        { id: 'p3-1', timestamp: '2025-04-08T11:00:00Z', caption: 'Ma nouvelle crème anti-âge favorite !', likes: 23000, comments: 450 },
      ],
    },
    {
      influencerId: 'inf-4',
      budget: 2500,
      revenue: 5800,
      roi: 132,
      posts: [
        { id: 'p4-1', timestamp: '2025-04-12T09:30:00Z', caption: 'Routine anti-âge à 30 ans...', likes: 15000, comments: 280 },
      ],
    },
  ],
  'camp-3': [
    {
      influencerId: 'inf-1',
      budget: 10000,
      revenue: 28000,
      roi: 180,
      posts: [
        { id: 'p5-1', timestamp: '2025-06-20T15:00:00Z', caption: 'Summer routine ! Peau glowy tout l été...', likes: 98000, comments: 1500 },
      ],
    },
    {
      influencerId: 'inf-5',
      budget: 2000,
      revenue: 6200,
      roi: 210,
      posts: [
        { id: 'p6-1', timestamp: '2025-06-25T12:00:00Z', caption: 'Test huile visage éclat : mon avis après 1 mois...', likes: 12000, comments: 340 },
      ],
    },
  ],
  'camp-4': [
    {
      influencerId: 'inf-3',
      budget: 4000,
      revenue: 15200,
      roi: 280,
      posts: [
        { id: 'p7-1', timestamp: '2025-11-24T08:00:00Z', caption: 'BLACK FRIDAY ! -30% sur tout...', likes: 34000, comments: 890 },
      ],
    },
    {
      influencerId: 'inf-5',
      budget: 2500,
      revenue: 9800,
      roi: 292,
      posts: [
        { id: 'p8-1', timestamp: '2025-11-25T10:00:00Z', caption: 'Mes recommandations Black Friday skincare...', likes: 18000, comments: 520 },
      ],
    },
    {
      influencerId: 'inf-6',
      budget: 1500,
      revenue: 4100,
      roi: 173,
      posts: [
        { id: 'p9-1', timestamp: '2025-11-26T14:00:00Z', caption: 'Haul Black Friday : j\'ai craqué !', likes: 8500, comments: 190 },
      ],
    },
  ],
  'camp-5': [
    {
      influencerId: 'inf-5',
      budget: 3000,
      revenue: 5400,
      roi: 80,
      posts: [
        { id: 'p10-1', timestamp: '2026-01-08T11:00:00Z', caption: 'Nouvelle année, nouvelle routine !', likes: 14000, comments: 380 },
      ],
    },
    {
      influencerId: 'inf-6',
      budget: 2000,
      revenue: 2800,
      roi: 40,
      posts: [
        { id: 'p11-1', timestamp: '2026-01-10T09:00:00Z', caption: 'Comment réparer sa peau après les fêtes...', likes: 7200, comments: 165 },
      ],
    },
  ],
};

// Générer des commandes fixes sur la période 2025-2026
function generateOrders(): Order[] {
  const orders: Order[] = [];
  const cities = [
    { city: 'Paris', region: 'Île-de-France' },
    { city: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
    { city: 'Marseille', region: 'Provence-Alpes-Côte d\'Azur' },
    { city: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
    { city: 'Toulouse', region: 'Occitanie' },
    { city: 'Nantes', region: 'Pays de la Loire' },
    { city: 'Lille', region: 'Hauts-de-France' },
    { city: 'Strasbourg', region: 'Grand Est' },
  ];

  const products = [
    { name: 'Sérum Hydratant Intense', price: 45 },
    { name: 'Crème Anti-Âge Premium', price: 89 },
    { name: 'Huile Visage Éclat', price: 38 },
    { name: 'Coffret Routine Complète', price: 149 },
    { name: 'Masque Purifiant', price: 29 },
    { name: 'Contour des Yeux', price: 52 },
  ];

  // Seed fixe pour reproductibilité
  let seed = 12345;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Période: janvier 2025 à janvier 2026
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2026-01-16');

  // Définir les périodes de campagne pour les boosts
  const campaignPeriods = campaigns.map(c => ({
    start: c.startDate.getTime(),
    end: c.endDate.getTime(),
    boost: c.objective === 'ventes' ? 2.5 : c.objective === 'lancement' ? 2.0 : 1.5,
  }));

  let orderId = 1001;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dayTimestamp = d.getTime();

    // Base: moins le weekend
    let baseOrders = dayOfWeek === 0 || dayOfWeek === 6 ? 4 : 6;

    // Boost si dans une période de campagne
    const activeCampaign = campaignPeriods.find(cp => dayTimestamp >= cp.start && dayTimestamp <= cp.end);
    if (activeCampaign) {
      baseOrders = Math.floor(baseOrders * activeCampaign.boost);
    }

    // Générer les commandes du jour
    for (let i = 0; i < baseOrders; i++) {
      const hour = 8 + Math.floor(seededRandom() * 14);
      const minute = Math.floor(seededRandom() * 60);
      const orderDate = new Date(d);
      orderDate.setHours(hour, minute, 0, 0);

      const location = cities[Math.floor(seededRandom() * cities.length)];
      const product = products[Math.floor(seededRandom() * products.length)];

      orders.push({
        id: `order-${orderId}`,
        timestamp: new Date(orderDate),
        amount: product.price + Math.floor(seededRandom() * 20),
        items: [product.name],
        city: location.city,
        region: location.region,
      });

      orderId++;
    }
  }

  return orders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export const orders = generateOrders();

// Générer les métriques horaires pour les 30 derniers jours
function generateHourlyMetrics(): HourlyMetric[] {
  const metrics: HourlyMetric[] = [];
  const baseline = 0.4; // commandes moyennes par heure (baseline)

  // 30 derniers jours
  for (let day = 0; day <= 30; day++) {
    const currentDay = subDays(now, 30 - day);

    for (let hour = 0; hour <= 23; hour++) {
      const currentHour = setHours(startOfDay(currentDay), hour);

      // Compter les commandes pour cette heure
      const hourOrders = orders.filter(o => {
        const orderHour = new Date(o.timestamp);
        return orderHour.getTime() >= currentHour.getTime() &&
               orderHour.getTime() < addHours(currentHour, 1).getTime();
      });

      // Vérifier si un post a été publié cette heure
      const postThisHour = posts.find(p => {
        const postHour = new Date(p.timestamp);
        return postHour.getTime() >= currentHour.getTime() &&
               postHour.getTime() < addHours(currentHour, 1).getTime();
      });

      metrics.push({
        hour: currentHour,
        orders: hourOrders.length,
        revenue: hourOrders.reduce((sum, o) => sum + o.amount, 0),
        baseline: hour >= 8 && hour <= 23 ? baseline : 0.1,
        postEvent: postThisHour ? {
          influencerId: postThisHour.influencerId,
          postId: postThisHour.id,
        } : undefined,
      });
    }
  }

  return metrics;
}

export const hourlyMetrics = generateHourlyMetrics();

// Stats du dashboard globales
export function getDashboardStats() {
  const totalCampaignRevenue = campaigns.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalCampaignBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const avgOrderValue = totalRevenue / totalOrders;
  const avgRoi = Math.round(((totalCampaignRevenue - totalCampaignBudget) / totalCampaignBudget) * 100);

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalCampaignRevenue,
    totalCampaignBudget,
    avgRoi,
    roas: totalCampaignRevenue / totalCampaignBudget,
  };
}

// Stats pour une campagne spécifique
export function getCampaignStats(campaignId: string) {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return null;

  const details = campaignInfluencerDetails[campaignId] || [];

  // Calculer les commandes pendant la période de campagne
  const campaignOrders = orders.filter(o => {
    const orderDate = new Date(o.timestamp);
    return orderDate >= campaign.startDate && orderDate <= campaign.endDate;
  });

  // Baseline (période équivalente avant la campagne)
  const campaignDuration = campaign.endDate.getTime() - campaign.startDate.getTime();
  const baselineStart = new Date(campaign.startDate.getTime() - campaignDuration);
  const baselineEnd = campaign.startDate;

  const baselineOrders = orders.filter(o => {
    const orderDate = new Date(o.timestamp);
    return orderDate >= baselineStart && orderDate < baselineEnd;
  });

  const campaignRevenue = campaignOrders.reduce((sum, o) => sum + o.amount, 0);
  const baselineRevenue = baselineOrders.reduce((sum, o) => sum + o.amount, 0);
  const lift = baselineRevenue > 0 ? Math.round(((campaignRevenue - baselineRevenue) / baselineRevenue) * 100) : 0;

  return {
    ...campaign,
    ordersCount: campaignOrders.length,
    baselineOrdersCount: baselineOrders.length,
    calculatedRevenue: campaignRevenue,
    baselineRevenue,
    lift,
    influencerDetails: details.map(d => ({
      ...d,
      influencer: influencers.find(i => i.id === d.influencerId),
    })),
  };
}

// Obtenir les métriques horaires pour une campagne
export function getCampaignHourlyMetrics(campaignId: string): HourlyMetric[] {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return [];

  return hourlyMetrics.filter(m => {
    const metricDate = new Date(m.hour);
    return metricDate >= campaign.startDate && metricDate <= campaign.endDate;
  });
}

// Insights de campagne
export const campaignInsights: CampaignInsight[] = [
  {
    id: 'insight-1',
    type: 'content',
    title: 'Les Reels surperforment',
    description: 'Les Reels génèrent 2.3x plus de conversions que les posts classiques.',
    metric: '+230%',
  },
  {
    id: 'insight-2',
    type: 'timing',
    title: 'Fenêtre optimale',
    description: 'Les publications entre 19h et 21h génèrent le plus de ventes.',
    metric: '19h-21h',
  },
  {
    id: 'insight-3',
    type: 'performance',
    title: 'Top performer',
    description: '@emma.beauty génère 38% du CA total attribué avec un ROAS de 3.2x.',
    metric: 'ROAS 3.2x',
  },
  {
    id: 'insight-4',
    type: 'recommendation',
    title: 'Opportunité micro-influence',
    description: '@beauty.louise (95K) a un meilleur ROAS que @glamour.sophie (1.2M).',
    metric: '2.1x vs 0.4x',
  },
];

// Récents posts détectés avec leur impact
export function getRecentPostsWithImpact() {
  return posts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
    .map(post => {
      const influencer = influencers.find(i => i.id === post.influencerId);

      // Calculer l'impact approximatif basé sur les commandes dans les heures suivantes
      const postTime = new Date(post.timestamp);
      const impactOrders = orders.filter(o => {
        const orderTime = new Date(o.timestamp);
        const hoursDiff = (orderTime.getTime() - postTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= 0 && hoursDiff <= 6;
      });

      return {
        ...post,
        influencer,
        impactOrders: Math.floor(impactOrders.length * (influencer?.attribution.liftPercentage || 100) / 200),
      };
    });
}

// Helper pour obtenir un influenceur par ID
export function getInfluencerById(id: string): InfluencerWithHistory | undefined {
  return influencers.find(i => i.id === id);
}

// Helper pour obtenir une campagne par ID
export function getCampaignById(id: string): CampaignWithObjective | undefined {
  return campaigns.find(c => c.id === id);
}

// Helper pour obtenir les métriques filtrées
export function getMetricsForPeriod(days: number): HourlyMetric[] {
  const cutoff = subDays(now, days);
  return hourlyMetrics.filter(m => new Date(m.hour) >= cutoff);
}

// Calculer le ROAS par influenceur
export function getInfluencerROAS(influencer: InfluencerWithHistory): number {
  if (influencer.totalBudget === 0) return 0;
  return influencer.totalRevenue / influencer.totalBudget;
}

// Obtenir tous les influenceurs avec historique (triés par ROI)
export function getInfluencersWithHistory(): InfluencerWithHistory[] {
  return [...influencers]
    .filter(i => i.campaignHistory.length > 0)
    .sort((a, b) => b.averageRoi - a.averageRoi);
}

// Obtenir les influenceurs pour une campagne spécifique
export function getInfluencersForCampaign(campaignId: string): InfluencerWithHistory[] {
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return [];

  return influencers.filter(i => campaign.influencers.includes(i.id));
}

// Stats globales pour le dashboard
export const globalStats = {
  totalRevenue: orders.reduce((sum, o) => sum + o.amount, 0),
  totalOrders: orders.length,
  avgOrderValue: orders.reduce((sum, o) => sum + o.amount, 0) / orders.length,
  totalCampaigns: campaigns.length,
  activeCampaigns: campaigns.filter(c => c.status === 'active').length,
  totalInfluencers: influencers.length,
  totalCampaignBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
  totalCampaignRevenue: campaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
  overallRoi: Math.round(((campaigns.reduce((sum, c) => sum + c.totalRevenue, 0) - campaigns.reduce((sum, c) => sum + c.budget, 0)) / campaigns.reduce((sum, c) => sum + c.budget, 0)) * 100),
};
