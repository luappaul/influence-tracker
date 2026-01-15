// Attribution intelligente sans friction
// Analyse statistique pour attribuer les ventes aux influenceurs

import { ShopifyOrder } from './hooks/use-shopify-data';

export interface ScrapedPost {
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
}

export interface CampaignInfluencer {
  id: string;
  username: string;
  fullName: string;
  profilePicUrl: string;
  followersCount: number;
  budget: number;
  campaignStartDate?: string;
  campaignDays?: number;
  scrapedPosts?: ScrapedPost[];
}

export interface AttributionSignal {
  type: 'temporal' | 'new_customer' | 'product_match' | 'anomaly' | 'baseline';
  confidence: number; // 0-1
  weight: number; // Poids dans le calcul final
  description: string;
  data?: Record<string, any>;
}

export interface PostAttribution {
  postId: string;
  postTimestamp: string;
  influencerUsername: string;
  signals: AttributionSignal[];
  attributedOrders: Array<{
    orderId: string;
    orderTotal: number;
    confidence: number;
    signals: string[];
  }>;
  totalAttributedRevenue: number;
  averageConfidence: number;
}

export interface InfluencerAttribution {
  username: string;
  posts: PostAttribution[];
  totalAttributedRevenue: number;
  totalAttributedOrders: number;
  averageConfidence: number;
  signals: {
    temporal: number;
    newCustomer: number;
    productMatch: number;
    anomaly: number;
    baseline: number;
  };
}

export interface AttributionResult {
  influencers: InfluencerAttribution[];
  totalAttributedRevenue: number;
  totalOrders: number;
  baselineRevenue: number;
  incrementalRevenue: number;
  confidenceScore: number;
  methodology: string[];
}

// Configuration des poids pour chaque signal
const SIGNAL_WEIGHTS = {
  temporal_2h: 0.35,    // Achat dans les 2h après le post
  temporal_6h: 0.25,    // Achat dans les 6h après le post
  temporal_24h: 0.15,   // Achat dans les 24h après le post
  temporal_48h: 0.08,   // Achat dans les 48h après le post
  new_customer: 0.25,   // C'est un nouveau client
  product_match: 0.30,  // Le produit acheté correspond au produit mentionné
  anomaly: 0.20,        // Pic de ventes détecté
  baseline: 0.10,       // Attribution baseline résiduelle
};

// Fenêtres temporelles en heures
const TEMPORAL_WINDOWS = [
  { hours: 2, weight: SIGNAL_WEIGHTS.temporal_2h, label: '0-2h' },
  { hours: 6, weight: SIGNAL_WEIGHTS.temporal_6h, label: '2-6h' },
  { hours: 24, weight: SIGNAL_WEIGHTS.temporal_24h, label: '6-24h' },
  { hours: 48, weight: SIGNAL_WEIGHTS.temporal_48h, label: '24-48h' },
];

/**
 * Calcule la baseline quotidienne avec ajustement saisonnier
 */
export function calculateSeasonalBaseline(
  orders: ShopifyOrder[],
  referenceDate: Date,
  lookbackDays: number = 30
): { dailyAverage: number; byDayOfWeek: number[]; byHourOfDay: number[] } {
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() - lookbackDays);

  const baselineOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate && orderDate < referenceDate;
  });

  // Revenue total
  const totalRevenue = baselineOrders.reduce(
    (sum, order) => sum + parseFloat(order.total_price || '0'),
    0
  );
  const dailyAverage = totalRevenue / lookbackDays;

  // Revenue par jour de la semaine (0=dimanche, 6=samedi)
  const byDayOfWeek: number[] = Array(7).fill(0);
  const countByDayOfWeek: number[] = Array(7).fill(0);

  baselineOrders.forEach(order => {
    const day = new Date(order.created_at).getDay();
    byDayOfWeek[day] += parseFloat(order.total_price || '0');
    countByDayOfWeek[day] += 1;
  });

  // Normaliser par le nombre de chaque jour dans la période
  const weeksInPeriod = lookbackDays / 7;
  for (let i = 0; i < 7; i++) {
    byDayOfWeek[i] = byDayOfWeek[i] / weeksInPeriod;
  }

  // Revenue par heure de la journée
  const byHourOfDay: number[] = Array(24).fill(0);
  const countByHour: number[] = Array(24).fill(0);

  baselineOrders.forEach(order => {
    const hour = new Date(order.created_at).getHours();
    byHourOfDay[hour] += parseFloat(order.total_price || '0');
    countByHour[hour] += 1;
  });

  // Normaliser
  for (let i = 0; i < 24; i++) {
    byHourOfDay[i] = byHourOfDay[i] / lookbackDays;
  }

  return { dailyAverage, byDayOfWeek, byHourOfDay };
}

/**
 * Détecte si une commande provient d'un nouveau client
 */
export function isNewCustomer(order: ShopifyOrder, allOrders: ShopifyOrder[]): boolean {
  const customerEmail = order.customer?.email || order.email;
  if (!customerEmail) return true; // Si pas d'email, considéré comme nouveau

  const orderDate = new Date(order.created_at);

  // Chercher des commandes antérieures du même client
  const previousOrders = allOrders.filter(o => {
    const email = o.customer?.email || o.email;
    const oDate = new Date(o.created_at);
    return email === customerEmail && oDate < orderDate;
  });

  return previousOrders.length === 0;
}

/**
 * Vérifie si les produits achetés correspondent au produit mentionné dans le post
 */
export function matchesProductMention(
  order: ShopifyOrder,
  postCaption: string
): { matches: boolean; matchedProducts: string[]; confidence: number } {
  if (!postCaption) return { matches: false, matchedProducts: [], confidence: 0 };

  const captionLower = postCaption.toLowerCase();
  const matchedProducts: string[] = [];

  order.line_items?.forEach(item => {
    const productName = (item.title || '').toLowerCase();
    // Chercher des mots clés du produit dans la caption
    const keywords = productName.split(' ').filter(w => w.length > 3);

    const matches = keywords.some(keyword => captionLower.includes(keyword));
    if (matches) {
      matchedProducts.push(item.title);
    }
  });

  const confidence = matchedProducts.length > 0
    ? Math.min(1, matchedProducts.length / (order.line_items?.length || 1))
    : 0;

  return {
    matches: matchedProducts.length > 0,
    matchedProducts,
    confidence,
  };
}

/**
 * Détecte les anomalies (pics de ventes inhabituels)
 */
export function detectSalesAnomaly(
  hourlyRevenue: number,
  baseline: { byHourOfDay: number[]; byDayOfWeek: number[] },
  date: Date
): { isAnomaly: boolean; multiplier: number; zScore: number } {
  const hour = date.getHours();
  const day = date.getDay();

  // Revenue attendu pour cette heure et ce jour
  const expectedHourly = baseline.byHourOfDay[hour];
  const expectedDaily = baseline.byDayOfWeek[day] / 24; // Répartir sur 24h

  // Moyenne des deux estimations
  const expected = (expectedHourly + expectedDaily) / 2;

  if (expected === 0) {
    return { isAnomaly: hourlyRevenue > 0, multiplier: hourlyRevenue > 0 ? 10 : 1, zScore: 0 };
  }

  const multiplier = hourlyRevenue / expected;

  // Z-score simplifié (on considère un écart-type de 50% du revenue attendu)
  const stdDev = expected * 0.5;
  const zScore = (hourlyRevenue - expected) / stdDev;

  // Anomalie si z-score > 2 (95% intervalle de confiance)
  const isAnomaly = zScore > 2;

  return { isAnomaly, multiplier, zScore };
}

/**
 * Calcule l'attribution temporelle d'une commande à un post
 */
export function calculateTemporalAttribution(
  orderDate: Date,
  postDate: Date
): { window: string; weight: number; hoursAfter: number } | null {
  const hoursAfter = (orderDate.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  // Pas d'attribution si avant le post ou trop tard (> 48h)
  if (hoursAfter < 0 || hoursAfter > 48) return null;

  // Trouver la fenêtre appropriée
  for (const window of TEMPORAL_WINDOWS) {
    if (hoursAfter <= window.hours) {
      return { window: window.label, weight: window.weight, hoursAfter };
    }
  }

  return null;
}

/**
 * Attribution intelligente principale
 */
export function calculateIntelligentAttribution(
  orders: ShopifyOrder[],
  influencers: CampaignInfluencer[],
  campaignStart: Date,
  campaignEnd: Date
): AttributionResult {
  // 1. Calculer la baseline saisonnière
  const baseline = calculateSeasonalBaseline(orders, campaignStart, 30);

  // 2. Filtrer les commandes pendant la campagne
  const campaignOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= campaignStart && orderDate <= campaignEnd;
  });

  // 3. Récupérer tous les posts produit
  const productPosts: Array<ScrapedPost & { influencer: CampaignInfluencer }> = [];
  influencers.forEach(inf => {
    inf.scrapedPosts?.forEach(post => {
      if (post.mentionsProduct === true) {
        productPosts.push({ ...post, influencer: inf });
      }
    });
  });

  // Trier les posts par date
  productPosts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 4. Pour chaque commande, calculer les signaux d'attribution
  const orderAttributions: Map<string, {
    order: ShopifyOrder;
    attributions: Array<{
      post: ScrapedPost & { influencer: CampaignInfluencer };
      signals: AttributionSignal[];
      totalScore: number;
    }>;
  }> = new Map();

  campaignOrders.forEach(order => {
    const orderDate = new Date(order.created_at);
    const orderTotal = parseFloat(order.total_price || '0');
    const isNew = isNewCustomer(order, orders);

    const attributions: Array<{
      post: ScrapedPost & { influencer: CampaignInfluencer };
      signals: AttributionSignal[];
      totalScore: number;
    }> = [];

    // Pour chaque post, calculer les signaux
    productPosts.forEach(post => {
      const postDate = new Date(post.timestamp);
      const signals: AttributionSignal[] = [];

      // Signal temporel
      const temporal = calculateTemporalAttribution(orderDate, postDate);
      if (temporal) {
        signals.push({
          type: 'temporal',
          confidence: 1 - (temporal.hoursAfter / 48), // Plus c'est proche, plus c'est confiant
          weight: temporal.weight,
          description: `Achat ${temporal.hoursAfter.toFixed(1)}h après le post (${temporal.window})`,
          data: { hoursAfter: temporal.hoursAfter, window: temporal.window },
        });
      }

      // Signal nouveau client
      if (isNew && temporal) {
        signals.push({
          type: 'new_customer',
          confidence: 0.8,
          weight: SIGNAL_WEIGHTS.new_customer,
          description: 'Premier achat du client',
        });
      }

      // Signal correspondance produit
      if (temporal) {
        const productMatch = matchesProductMention(order, post.caption);
        if (productMatch.matches) {
          signals.push({
            type: 'product_match',
            confidence: productMatch.confidence,
            weight: SIGNAL_WEIGHTS.product_match,
            description: `Produit mentionné acheté: ${productMatch.matchedProducts.join(', ')}`,
            data: { matchedProducts: productMatch.matchedProducts },
          });
        }
      }

      // Calculer le score total
      if (signals.length > 0) {
        const totalScore = signals.reduce((sum, s) => sum + s.confidence * s.weight, 0);
        attributions.push({ post, signals, totalScore });
      }
    });

    // Trier par score et garder
    attributions.sort((a, b) => b.totalScore - a.totalScore);

    if (attributions.length > 0) {
      orderAttributions.set(order.id.toString(), { order, attributions });
    }
  });

  // 5. Détecter les anomalies par heure
  const hourlyRevenue: Map<string, number> = new Map();
  campaignOrders.forEach(order => {
    const hourKey = new Date(order.created_at).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const current = hourlyRevenue.get(hourKey) || 0;
    hourlyRevenue.set(hourKey, current + parseFloat(order.total_price || '0'));
  });

  // Marquer les heures avec anomalies
  const anomalyHours: Set<string> = new Set();
  hourlyRevenue.forEach((revenue, hourKey) => {
    const date = new Date(hourKey + ':00:00.000Z');
    const anomaly = detectSalesAnomaly(revenue, baseline, date);
    if (anomaly.isAnomaly) {
      anomalyHours.add(hourKey);
    }
  });

  // 6. Agréger par influenceur
  const influencerResults: Map<string, InfluencerAttribution> = new Map();

  influencers.forEach(inf => {
    influencerResults.set(inf.username, {
      username: inf.username,
      posts: [],
      totalAttributedRevenue: 0,
      totalAttributedOrders: 0,
      averageConfidence: 0,
      signals: {
        temporal: 0,
        newCustomer: 0,
        productMatch: 0,
        anomaly: 0,
        baseline: 0,
      },
    });
  });

  // Attribution finale avec normalisation
  orderAttributions.forEach(({ order, attributions }) => {
    if (attributions.length === 0) return;

    const orderTotal = parseFloat(order.total_price || '0');
    const orderHour = new Date(order.created_at).toISOString().slice(0, 13);
    const isAnomalyHour = anomalyHours.has(orderHour);

    // Score total pour normalisation
    const totalScore = attributions.reduce((sum, a) => sum + a.totalScore, 0);

    attributions.forEach(({ post, signals, totalScore: score }) => {
      // Proportion de cette attribution
      const proportion = totalScore > 0 ? score / totalScore : 1 / attributions.length;
      const attributedRevenue = orderTotal * proportion;

      // Ajouter un signal anomalie si applicable
      if (isAnomalyHour) {
        signals.push({
          type: 'anomaly',
          confidence: 0.7,
          weight: SIGNAL_WEIGHTS.anomaly,
          description: 'Pic de ventes inhabituel détecté',
        });
      }

      const result = influencerResults.get(post.influencer.username);
      if (result) {
        result.totalAttributedRevenue += attributedRevenue;
        result.totalAttributedOrders += proportion;

        // Comptabiliser les signaux
        signals.forEach(s => {
          if (s.type === 'temporal') result.signals.temporal += attributedRevenue;
          if (s.type === 'new_customer') result.signals.newCustomer += attributedRevenue;
          if (s.type === 'product_match') result.signals.productMatch += attributedRevenue;
          if (s.type === 'anomaly') result.signals.anomaly += attributedRevenue;
        });
      }
    });
  });

  // 7. Attribution baseline pour les commandes non attribuées
  const attributedOrderIds = new Set(Array.from(orderAttributions.keys()));
  const unattributedOrders = campaignOrders.filter(o => !attributedOrderIds.has(o.id.toString()));
  const unattributedRevenue = unattributedOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_price || '0'),
    0
  );

  // Répartir le revenue non attribué par engagement
  const totalEngagement = influencers.reduce((sum, inf) => {
    const productPosts = inf.scrapedPosts?.filter(p => p.mentionsProduct === true) || [];
    return sum + productPosts.reduce((s, p) => s + p.likesCount + p.commentsCount * 2, 0);
  }, 0);

  if (totalEngagement > 0 && unattributedRevenue > 0) {
    influencers.forEach(inf => {
      const productPosts = inf.scrapedPosts?.filter(p => p.mentionsProduct === true) || [];
      const engagement = productPosts.reduce((s, p) => s + p.likesCount + p.commentsCount * 2, 0);
      const share = engagement / totalEngagement;
      const baselineAttribution = unattributedRevenue * share * 0.5; // 50% seulement car moins certain

      const result = influencerResults.get(inf.username);
      if (result) {
        result.totalAttributedRevenue += baselineAttribution;
        result.signals.baseline += baselineAttribution;
      }
    });
  }

  // 8. Calculer les métriques finales
  const results = Array.from(influencerResults.values());
  const totalAttributed = results.reduce((sum, r) => sum + r.totalAttributedRevenue, 0);
  const totalOrders = results.reduce((sum, r) => sum + r.totalAttributedOrders, 0);

  // Revenue de la campagne
  const campaignRevenue = campaignOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_price || '0'),
    0
  );

  // Durée de la campagne en jours
  const campaignDays = Math.ceil((campaignEnd.getTime() - campaignStart.getTime()) / (1000 * 60 * 60 * 24));
  const expectedRevenue = baseline.dailyAverage * campaignDays;
  const incrementalRevenue = Math.max(0, campaignRevenue - expectedRevenue);

  // Score de confiance global (basé sur la proportion de revenue attribué avec des signaux forts)
  const strongSignalRevenue = results.reduce(
    (sum, r) => sum + r.signals.temporal + r.signals.newCustomer + r.signals.productMatch,
    0
  );
  const confidenceScore = totalAttributed > 0 ? strongSignalRevenue / totalAttributed : 0;

  return {
    influencers: results,
    totalAttributedRevenue: totalAttributed,
    totalOrders: Math.round(totalOrders),
    baselineRevenue: expectedRevenue,
    incrementalRevenue,
    confidenceScore,
    methodology: [
      'Corrélation temporelle (0-2h, 2-6h, 6-24h, 24-48h)',
      'Détection nouveaux clients',
      'Correspondance produit mentionné/acheté',
      'Détection anomalies (pics de ventes)',
      'Ajustement saisonnier (jour/heure)',
      'Attribution baseline résiduelle par engagement',
    ],
  };
}

/**
 * Génère les données pour le graphique horaire
 */
export function generateHourlyChartData(
  orders: ShopifyOrder[],
  posts: Array<{ timestamp: string; influencer: string; profilePicUrl: string }>,
  startDate: Date,
  endDate: Date,
  baseline: { byHourOfDay: number[]; byDayOfWeek: number[] }
): Array<{
  datetime: string;
  hour: string;
  revenue: number;
  orders: number;
  expectedRevenue: number;
  isAnomaly: boolean;
  hasPost: boolean;
  postInfluencer?: string;
  postProfilePic?: string;
}> {
  const data: Array<{
    datetime: string;
    hour: string;
    revenue: number;
    orders: number;
    expectedRevenue: number;
    isAnomaly: boolean;
    hasPost: boolean;
    postInfluencer?: string;
    postProfilePic?: string;
  }> = [];

  // Grouper les commandes par heure
  const hourlyData: Map<string, { revenue: number; orders: number }> = new Map();

  orders.forEach(order => {
    const orderDate = new Date(order.created_at);
    if (orderDate >= startDate && orderDate <= endDate) {
      const hourKey = orderDate.toISOString().slice(0, 13);
      const current = hourlyData.get(hourKey) || { revenue: 0, orders: 0 };
      current.revenue += parseFloat(order.total_price || '0');
      current.orders += 1;
      hourlyData.set(hourKey, current);
    }
  });

  // Créer les posts par heure
  const postsByHour: Map<string, { influencer: string; profilePicUrl: string }> = new Map();
  posts.forEach(post => {
    const hourKey = new Date(post.timestamp).toISOString().slice(0, 13);
    postsByHour.set(hourKey, { influencer: post.influencer, profilePicUrl: post.profilePicUrl });
  });

  // Générer les données pour chaque heure de la période
  const current = new Date(startDate);
  while (current <= endDate) {
    const hourKey = current.toISOString().slice(0, 13);
    const hourData = hourlyData.get(hourKey) || { revenue: 0, orders: 0 };
    const post = postsByHour.get(hourKey);

    // Calculer le revenue attendu
    const hour = current.getHours();
    const day = current.getDay();
    const expectedRevenue = (baseline.byHourOfDay[hour] + baseline.byDayOfWeek[day] / 24) / 2;

    // Détecter l'anomalie
    const anomaly = detectSalesAnomaly(hourData.revenue, baseline, current);

    data.push({
      datetime: hourKey,
      hour: current.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      revenue: hourData.revenue,
      orders: hourData.orders,
      expectedRevenue,
      isAnomaly: anomaly.isAnomaly,
      hasPost: !!post,
      postInfluencer: post?.influencer,
      postProfilePic: post?.profilePicUrl,
    });

    current.setHours(current.getHours() + 1);
  }

  return data;
}
