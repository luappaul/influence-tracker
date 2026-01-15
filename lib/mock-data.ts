import { Campaign, Influencer, Post, Order, HourlyMetric, AttributionData, CampaignInsight } from './types';
import { subDays, subHours, addHours, startOfDay, setHours } from 'date-fns';

const now = new Date();
const campaignStart = subDays(now, 12);
const campaignEnd = addHours(now, 24 * 18); // 18 jours restants

// Influenceuses
export const influencers: Influencer[] = [
  {
    id: 'inf-1',
    username: 'emma.beauty',
    displayName: 'Emma Martin',
    avatarUrl: '/avatars/emma.jpg',
    followers: 850000,
    avgEngagement: 4.2,
    category: 'Beauté & Skincare',
    posts: [],
    attribution: {
      influencerId: 'inf-1',
      postId: 'post-1',
      ordersAttributed: 89,
      revenueAttributed: 4450,
      liftPercentage: 235,
      confidence: 'high',
      conversionWindow: 48,
    },
  },
  {
    id: 'inf-2',
    username: 'julie.glow',
    displayName: 'Julie Dubois',
    avatarUrl: '/avatars/julie.jpg',
    followers: 420000,
    avgEngagement: 3.8,
    category: 'Lifestyle & Beauté',
    posts: [],
    attribution: {
      influencerId: 'inf-2',
      postId: 'post-4',
      ordersAttributed: 52,
      revenueAttributed: 2600,
      liftPercentage: 145,
      confidence: 'high',
      conversionWindow: 48,
    },
  },
  {
    id: 'inf-3',
    username: 'skincare.marie',
    displayName: 'Marie Laurent',
    avatarUrl: '/avatars/marie.jpg',
    followers: 180000,
    avgEngagement: 5.1,
    category: 'Skincare Expert',
    posts: [],
    attribution: {
      influencerId: 'inf-3',
      postId: 'post-6',
      ordersAttributed: 28,
      revenueAttributed: 1400,
      liftPercentage: 78,
      confidence: 'medium',
      conversionWindow: 48,
    },
  },
  {
    id: 'inf-4',
    username: 'beauty.louise',
    displayName: 'Louise Petit',
    avatarUrl: '/avatars/louise.jpg',
    followers: 95000,
    avgEngagement: 6.3,
    category: 'Micro-influenceuse Beauté',
    posts: [],
    attribution: {
      influencerId: 'inf-4',
      postId: 'post-8',
      ordersAttributed: 45,
      revenueAttributed: 2250,
      liftPercentage: 189,
      confidence: 'high',
      conversionWindow: 48,
    },
  },
  {
    id: 'inf-5',
    username: 'glamour.sophie',
    displayName: 'Sophie Bernard',
    avatarUrl: '/avatars/sophie.jpg',
    followers: 1200000,
    avgEngagement: 1.8,
    category: 'Mode & Glamour',
    posts: [],
    attribution: {
      influencerId: 'inf-5',
      postId: 'post-10',
      ordersAttributed: 12,
      revenueAttributed: 600,
      liftPercentage: 23,
      confidence: 'low',
      conversionWindow: 48,
    },
  },
  {
    id: 'inf-6',
    username: 'natural.chloe',
    displayName: 'Chloé Moreau',
    avatarUrl: '/avatars/chloe.jpg',
    followers: 65000,
    avgEngagement: 4.5,
    category: 'Beauté Naturelle',
    posts: [],
    attribution: {
      influencerId: 'inf-6',
      postId: 'post-12',
      ordersAttributed: 8,
      revenueAttributed: 400,
      liftPercentage: 15,
      confidence: 'low',
      conversionWindow: 48,
    },
  },
];

// Posts
export const posts: Post[] = [
  // Emma.beauty - Top performer
  {
    id: 'post-1',
    influencerId: 'inf-1',
    timestamp: subDays(now, 10),
    type: 'reel',
    caption: 'Mon nouveau sérum préféré ! Le Sérum Éclat a transformé ma peau en seulement 2 semaines ✨ #skincare #serumeclat',
    likes: 45200,
    comments: 892,
    views: 520000,
    url: 'https://instagram.com/p/abc123',
  },
  {
    id: 'post-2',
    influencerId: 'inf-1',
    timestamp: subDays(now, 5),
    type: 'story',
    caption: 'Application du sérum ce matin - routine skincare',
    likes: 28000,
    comments: 0,
    views: 180000,
    url: 'https://instagram.com/stories/emma.beauty/123',
  },
  {
    id: 'post-3',
    influencerId: 'inf-1',
    timestamp: subHours(now, 2),
    type: 'reel',
    caption: 'Before/After 2 semaines avec le Sérum Éclat ! Les résultats parlent deux-mêmes 🌟',
    likes: 52100,
    comments: 1203,
    views: 680000,
    url: 'https://instagram.com/p/def456',
  },
  // Julie.glow - Bon performer
  {
    id: 'post-4',
    influencerId: 'inf-2',
    timestamp: subDays(now, 8),
    type: 'post',
    caption: 'Découverte du mois : ce sérum qui fait des miracles ! 💫 #beautytips #serum',
    likes: 18500,
    comments: 423,
    url: 'https://instagram.com/p/ghi789',
  },
  {
    id: 'post-5',
    influencerId: 'inf-2',
    timestamp: subHours(now, 5),
    type: 'carousel',
    caption: 'Ma routine complète du soir avec le Sérum Éclat - swipe pour tout voir 👉',
    likes: 22300,
    comments: 567,
    url: 'https://instagram.com/p/jkl012',
  },
  // Skincare.marie - Performer moyen
  {
    id: 'post-6',
    influencerId: 'inf-3',
    timestamp: subDays(now, 7),
    type: 'reel',
    caption: 'Test expert : analyse des ingrédients du Sérum Éclat 🔬',
    likes: 12400,
    comments: 289,
    views: 95000,
    url: 'https://instagram.com/p/mno345',
  },
  {
    id: 'post-7',
    influencerId: 'inf-3',
    timestamp: subDays(now, 2),
    type: 'post',
    caption: 'Retour après 10 jours dutilisation - mon avis honnête',
    likes: 9800,
    comments: 178,
    url: 'https://instagram.com/p/pqr678',
  },
  // Beauty.louise - Micro efficace
  {
    id: 'post-8',
    influencerId: 'inf-4',
    timestamp: subDays(now, 6),
    type: 'reel',
    caption: 'Ce sérum a changé ma vie ! Je vous montre pourquoi ✨',
    likes: 8900,
    comments: 456,
    views: 72000,
    url: 'https://instagram.com/p/stu901',
  },
  {
    id: 'post-9',
    influencerId: 'inf-4',
    timestamp: subDays(now, 1),
    type: 'story',
    caption: 'Code promo exclusif dans ma bio !',
    likes: 5600,
    comments: 0,
    views: 45000,
    url: 'https://instagram.com/stories/beauty.louise/456',
  },
  // Glamour.sophie - Sous-performer
  {
    id: 'post-10',
    influencerId: 'inf-5',
    timestamp: subDays(now, 9),
    type: 'post',
    caption: 'Nouveau dans ma routine ! #sponsored #skincare',
    likes: 35000,
    comments: 234,
    url: 'https://instagram.com/p/vwx234',
  },
  {
    id: 'post-11',
    influencerId: 'inf-5',
    timestamp: subDays(now, 3),
    type: 'reel',
    caption: 'Get ready with me + skincare routine',
    likes: 42000,
    comments: 312,
    views: 380000,
    url: 'https://instagram.com/p/yza567',
  },
  // Natural.chloe - Sous-performer
  {
    id: 'post-12',
    influencerId: 'inf-6',
    timestamp: subDays(now, 4),
    type: 'post',
    caption: 'Test du Sérum Éclat - pas convaincue pour le moment...',
    likes: 4200,
    comments: 89,
    url: 'https://instagram.com/p/bcd890',
  },
];

// Associer les posts aux influenceurs
influencers.forEach(inf => {
  inf.posts = posts.filter(p => p.influencerId === inf.id);
});

// Campagne
export const campaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Lancement Sérum Éclat',
    product: 'Sérum Éclat Vitamine C',
    sku: 'SERUM-ECLAT-30ML',
    startDate: campaignStart,
    endDate: campaignEnd,
    status: 'active',
    budget: 8500,
    influencers: influencers.map(i => i.id),
  },
];

// Générer des commandes avec des pics réalistes
function generateOrders(): Order[] {
  const orders: Order[] = [];
  const cities = [
    { city: 'Paris', region: 'Île-de-France' },
    { city: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
    { city: 'Marseille', region: 'Provence-Alpes-Côte dAzur' },
    { city: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
    { city: 'Toulouse', region: 'Occitanie' },
    { city: 'Nantes', region: 'Pays de la Loire' },
    { city: 'Lille', region: 'Hauts-de-France' },
    { city: 'Strasbourg', region: 'Grand Est' },
  ];

  // Baseline : ~3-5 commandes par heure
  // Pic après post performant : jusqu'à 15-25 commandes par heure

  for (let day = 0; day <= 12; day++) {
    const currentDay = subDays(now, 12 - day);

    for (let hour = 8; hour <= 23; hour++) {
      const currentHour = setHours(startOfDay(currentDay), hour);

      // Baseline orders
      let orderCount = Math.floor(Math.random() * 3) + 2; // 2-4 commandes baseline

      // Vérifier si un post performant a été publié dans les 48h précédentes
      const recentPosts = posts.filter(p => {
        const postTime = new Date(p.timestamp);
        const hoursDiff = (currentHour.getTime() - postTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff >= 0 && hoursDiff <= 48;
      });

      recentPosts.forEach(post => {
        const influencer = influencers.find(i => i.id === post.influencerId);
        if (!influencer) return;

        const postTime = new Date(post.timestamp);
        const hoursSincePost = (currentHour.getTime() - postTime.getTime()) / (1000 * 60 * 60);

        // Impact décroissant avec le temps
        let impactMultiplier = 1;
        if (hoursSincePost <= 2) impactMultiplier = 1;
        else if (hoursSincePost <= 6) impactMultiplier = 0.7;
        else if (hoursSincePost <= 12) impactMultiplier = 0.4;
        else if (hoursSincePost <= 24) impactMultiplier = 0.2;
        else impactMultiplier = 0.1;

        // Impact basé sur la performance de l'influenceur
        const roas = influencer.attribution.revenueAttributed / (8500 / 6);
        if (roas > 2) {
          orderCount += Math.floor((Math.random() * 8 + 5) * impactMultiplier);
        } else if (roas > 1) {
          orderCount += Math.floor((Math.random() * 4 + 2) * impactMultiplier);
        } else {
          orderCount += Math.floor((Math.random() * 2) * impactMultiplier);
        }
      });

      // Créer les commandes pour cette heure
      for (let i = 0; i < orderCount; i++) {
        const location = cities[Math.floor(Math.random() * cities.length)];
        const minuteOffset = Math.floor(Math.random() * 60);

        orders.push({
          id: `order-${day}-${hour}-${i}`,
          timestamp: addHours(currentHour, minuteOffset / 60),
          amount: 45 + Math.floor(Math.random() * 30), // 45€ - 75€
          items: ['Sérum Éclat Vitamine C 30ml'],
          city: location.city,
          region: location.region,
        });
      }
    }
  }

  return orders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export const orders = generateOrders();

// Générer les métriques horaires
function generateHourlyMetrics(): HourlyMetric[] {
  const metrics: HourlyMetric[] = [];
  const baseline = 3.5; // commandes moyennes par heure

  for (let day = 0; day <= 12; day++) {
    const currentDay = subDays(now, 12 - day);

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
        baseline: hour >= 8 && hour <= 23 ? baseline : 0.5,
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

// Stats du dashboard
export function getDashboardStats() {
  const totalRevenue = influencers.reduce((sum, i) => sum + i.attribution.revenueAttributed, 0);
  const totalSales = influencers.reduce((sum, i) => sum + i.attribution.ordersAttributed, 0);
  const avgLift = influencers.reduce((sum, i) => sum + i.attribution.liftPercentage, 0) / influencers.length;
  const roas = totalRevenue / campaigns[0].budget;

  return {
    totalRevenue,
    totalSales,
    avgLift,
    roas,
  };
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
export function getInfluencerById(id: string): Influencer | undefined {
  return influencers.find(i => i.id === id);
}

// Helper pour obtenir une campagne par ID
export function getCampaignById(id: string): Campaign | undefined {
  return campaigns.find(c => c.id === id);
}

// Helper pour obtenir les métriques filtrées
export function getMetricsForPeriod(days: number): HourlyMetric[] {
  const cutoff = subDays(now, days);
  return hourlyMetrics.filter(m => new Date(m.hour) >= cutoff);
}

// Calculer le ROAS par influenceur
export function getInfluencerROAS(influencer: Influencer): number {
  const budgetPerInfluencer = campaigns[0].budget / influencers.length;
  return influencer.attribution.revenueAttributed / budgetPerInfluencer;
}
