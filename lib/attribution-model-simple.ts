/**
 * Attribution Model SIMPLIFIED - Version réaliste avec données disponibles
 *
 * Données utilisées:
 * - Shopify: CA historique, commandes, codes promo
 * - Manuel: timing post influenceur, promo globale active
 * - Hardcodé: dates momentums (BF, soldes, Noël)
 *
 * Données NON utilisées (pas dispo sans intégrations lourdes):
 * - Paid Media (Meta/Google Ads)
 * - Sessions / trafic
 * - Reach/engagement influenceur (sauf si fourni manuellement)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DailyRevenue {
  date: string;
  revenue: number;
  ordersCount: number;
  ordersWithInfluencerCode: number; // Commandes avec code influenceur
  ordersWithGlobalPromo: number; // Commandes avec promo globale
}

export interface SimpleHistoricalData {
  daily: DailyRevenue[];
}

export interface SimpleMomentum {
  name: string;
  isActive: boolean;
  intensity: number; // 0-1
  expectedImpact: number; // ex: 0.35 pour +35%
}

export interface SimpleInfluencer {
  id: string;
  username: string;
  postTimestamp: string;
  promoCode?: string; // Code promo personnel
  codeUsageCount: number; // Nombre de commandes avec ce code sur 24h
  // Optionnel - si l'influenceur partage ses stats
  reachEstimated?: number;
  engagementRate?: number;
}

export interface SimpleAttributionInput {
  // Données Shopify (24h après post)
  observedRevenue24h: number;
  ordersCount24h: number;
  hourlyRevenue24h?: number[]; // Optionnel - si dispo via Shopify Analytics

  // Historique Shopify
  historicalData: SimpleHistoricalData;

  // Contexte (manuel ou hardcodé)
  currentDate: string;
  activeMomentums: SimpleMomentum[];
  globalPromoActive: boolean;
  globalPromoDiscount: number; // 0-1

  // Influenceurs
  influencers: SimpleInfluencer[];
}

// ============================================================================
// LAYER 1 - BASELINE (Shopify only)
// ============================================================================

export interface SimpleLayer1 {
  expectedRevenue24h: number;
  ma7: number;
  ma14: number;
  ma28: number;
  dayOfWeekMultiplier: number;
}

function getDayOfWeekMultiplier(date: Date): number {
  const day = date.getDay();
  // Patterns e-commerce typiques
  const multipliers = [0.85, 0.92, 0.95, 1.0, 1.05, 1.12, 1.08];
  return multipliers[day];
}

export function calcSimpleLayer1(input: SimpleAttributionInput): SimpleLayer1 {
  const { historicalData, currentDate } = input;
  const daily = historicalData.daily;

  const last7 = daily.slice(-7);
  const last14 = daily.slice(-14);
  const last28 = daily.slice(-28);

  const ma7 = last7.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last7.length, 1);
  const ma14 = last14.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last14.length, 1);
  const ma28 = last28.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last28.length, 1);

  // Pondération: plus de poids sur le récent
  const baseExpected = 0.5 * ma7 + 0.3 * ma14 + 0.2 * ma28;

  // Ajustement jour de la semaine
  const dayMultiplier = getDayOfWeekMultiplier(new Date(currentDate));
  const expectedRevenue24h = baseExpected * dayMultiplier;

  return {
    expectedRevenue24h,
    ma7,
    ma14,
    ma28,
    dayOfWeekMultiplier: dayMultiplier,
  };
}

// ============================================================================
// LAYER 2 - MOMENTUMS (Hardcodé)
// ============================================================================

export interface SimpleLayer2 {
  expectedWithMomentum: number;
  momentumMultiplier: number;
  activeMomentums: { name: string; impact: number }[];
}

export function calcSimpleLayer2(
  layer1: SimpleLayer1,
  momentums: SimpleMomentum[]
): SimpleLayer2 {
  const activeMomentums: { name: string; impact: number }[] = [];
  let totalImpact = 0;

  for (const m of momentums) {
    if (m.isActive && m.intensity > 0) {
      const impact = m.intensity * m.expectedImpact;
      totalImpact += impact;
      activeMomentums.push({ name: m.name, impact });
    }
  }

  const momentumMultiplier = 1 + totalImpact;
  const expectedWithMomentum = layer1.expectedRevenue24h * momentumMultiplier;

  return {
    expectedWithMomentum,
    momentumMultiplier,
    activeMomentums,
  };
}

// ============================================================================
// LAYER 3 - PROMOS (Simplifié - basé sur input manuel)
// ============================================================================

export interface SimpleLayer3 {
  expectedWithPromo: number;
  promoMultiplier: number;
  promoActive: boolean;
}

export function calcSimpleLayer3(
  layer2: SimpleLayer2,
  globalPromoActive: boolean,
  globalPromoDiscount: number
): SimpleLayer3 {
  // Impact estimé d'une promo globale
  // Règle simple: 10% de remise = ~15% de CA en plus
  const promoImpact = globalPromoActive ? globalPromoDiscount * 1.5 : 0;
  const promoMultiplier = 1 + promoImpact;
  const expectedWithPromo = layer2.expectedWithMomentum * promoMultiplier;

  return {
    expectedWithPromo,
    promoMultiplier,
    promoActive: globalPromoActive,
  };
}

// ============================================================================
// LAYER 4 - PAID MEDIA: SKIP (pas de données)
// On passe directement à l'attribution influenceur
// ============================================================================

// ============================================================================
// LAYER 5 - ATTRIBUTION INFLUENCEUR (Simplifié)
// ============================================================================

export interface SimpleInfluencerAttribution {
  influencer: SimpleInfluencer;
  timingScore: number;
  codeScore: number; // Basé sur l'utilisation du code promo
  totalScore: number;
  weight: number;
  attributedRevenue: number;
  revenueFromCode: number; // CA directement tracké via code
}

export interface SimpleLayer5 {
  upliftResidual: number;
  directRevenueFromCodes: number;
  estimatedIndirectRevenue: number;
  influencerAttributions: SimpleInfluencerAttribution[];
}

export function calcSimpleLayer5(
  layer3: SimpleLayer3,
  observedRevenue24h: number,
  influencers: SimpleInfluencer[],
  currentDate: string,
  avgOrderValue: number
): SimpleLayer5 {
  const upliftResidual = Math.max(0, observedRevenue24h - layer3.expectedWithPromo);

  if (influencers.length === 0) {
    return {
      upliftResidual,
      directRevenueFromCodes: 0,
      estimatedIndirectRevenue: 0,
      influencerAttributions: [],
    };
  }

  const currentTime = new Date(currentDate);

  // Calculer le CA direct des codes promo
  const directRevenueFromCodes = influencers.reduce((sum, inf) => {
    return sum + (inf.codeUsageCount * avgOrderValue);
  }, 0);

  const attributions: SimpleInfluencerAttribution[] = influencers.map(inf => {
    // Timing score (décroissance exponentielle)
    const postTime = new Date(inf.postTimestamp);
    const hoursSince = (currentTime.getTime() - postTime.getTime()) / (1000 * 60 * 60);
    const lambda = 0.12; // Décroissance plus lente que modèle complet
    const timingScore = Math.exp(-lambda * Math.max(0, hoursSince));

    // Code score (le signal le plus fort qu'on a)
    // Plus le code est utilisé, plus on est sûr de l'impact
    const maxCodeUsage = Math.max(...influencers.map(i => i.codeUsageCount), 1);
    const codeScore = inf.codeUsageCount / maxCodeUsage;

    // Score total: on privilégie fortement le code car c'est notre preuve
    const totalScore = inf.promoCode
      ? 0.3 * timingScore + 0.7 * codeScore
      : timingScore; // Sans code, on n'a que le timing

    const revenueFromCode = inf.codeUsageCount * avgOrderValue;

    return {
      influencer: inf,
      timingScore,
      codeScore,
      totalScore,
      weight: 0,
      attributedRevenue: 0,
      revenueFromCode,
    };
  });

  // Normaliser les poids
  const totalScore = attributions.reduce((sum, a) => sum + a.totalScore, 0);
  for (const attr of attributions) {
    attr.weight = totalScore > 0 ? attr.totalScore / totalScore : 1 / attributions.length;
    // Attribution = CA direct du code + part de l'uplift indirect
    const indirectShare = (upliftResidual - directRevenueFromCodes) * attr.weight;
    attr.attributedRevenue = attr.revenueFromCode + Math.max(0, indirectShare);
  }

  const estimatedIndirectRevenue = Math.max(0, upliftResidual - directRevenueFromCodes);

  return {
    upliftResidual,
    directRevenueFromCodes,
    estimatedIndirectRevenue,
    influencerAttributions: attributions,
  };
}

// ============================================================================
// CONFIDENCE SCORE SIMPLIFIÉ
// ============================================================================

export interface SimpleConfidenceComponents {
  signalStrength: number;      // L'uplift est-il significatif?
  codeEvidence: number;        // A-t-on des preuves via codes promo?
  temporalClarity: number;     // Le timing est-il clair?
  confounding: number;         // Peu de bruit (momentum/promo)?
  overlap: number;             // Pas trop d'influenceurs en même temps?
}

export interface SimpleConfidence {
  score: number; // 0-100
  components: SimpleConfidenceComponents;
  interpretation: string;
}

export function calcSimpleConfidence(
  layer1: SimpleLayer1,
  layer2: SimpleLayer2,
  layer3: SimpleLayer3,
  layer5: SimpleLayer5,
  observedRevenue24h: number
): SimpleConfidence {
  // A) Signal Strength - l'uplift est-il significatif?
  const expectedFinal = layer3.expectedWithPromo;
  const threshold = 0.10 * expectedFinal; // Seuil à 10%
  const signalStrength = Math.min(layer5.upliftResidual / Math.max(threshold, 1), 1);

  // B) Code Evidence - a-t-on des preuves solides via codes promo?
  const totalCodeRevenue = layer5.directRevenueFromCodes;
  const codeShare = layer5.upliftResidual > 0
    ? totalCodeRevenue / layer5.upliftResidual
    : 0;
  // Plus le CA vient des codes, plus on est confiant
  const codeEvidence = Math.min(codeShare * 1.5, 1); // Boost car code = preuve forte

  // C) Temporal Clarity - les influenceurs ont-ils posté récemment?
  const avgTimingScore = layer5.influencerAttributions.length > 0
    ? layer5.influencerAttributions.reduce((sum, a) => sum + a.timingScore, 0) / layer5.influencerAttributions.length
    : 0;
  const temporalClarity = avgTimingScore;

  // D) Confounding - momentum et promo réduisent la confiance
  const confounding = 1 / (1 +
    1.2 * (layer2.momentumMultiplier - 1) + // Momentum pèse fort
    0.8 * (layer3.promoMultiplier - 1)      // Promo aussi
  );

  // E) Overlap - plusieurs influenceurs = moins clair
  const numInfluencers = layer5.influencerAttributions.length;
  const overlap = numInfluencers > 0 ? 1 / (1 + 0.3 * (numInfluencers - 1)) : 1;

  // Score final - on surpondère codeEvidence car c'est notre meilleure preuve
  const score_0_1 =
    0.20 * signalStrength +
    0.35 * codeEvidence +     // Plus de poids sur les codes
    0.15 * temporalClarity +
    0.20 * confounding +
    0.10 * overlap;

  const score = Math.round(100 * score_0_1);

  // Interprétation
  let interpretation: string;
  if (score >= 70) {
    interpretation = "Attribution fiable - preuves solides via codes promo et timing clair";
  } else if (score >= 50) {
    interpretation = "Attribution probable - signal présent mais contexte bruyant";
  } else if (score >= 30) {
    interpretation = "Attribution incertaine - peu de preuves directes, facteurs confondants";
  } else {
    interpretation = "Attribution non fiable - impossible d'isoler l'effet influenceur";
  }

  return {
    score,
    components: {
      signalStrength,
      codeEvidence,
      temporalClarity,
      confounding,
      overlap,
    },
    interpretation,
  };
}

// ============================================================================
// PIPELINE COMPLET SIMPLIFIÉ
// ============================================================================

export interface SimpleAttributionResult {
  layer1: SimpleLayer1;
  layer2: SimpleLayer2;
  layer3: SimpleLayer3;
  layer5: SimpleLayer5;
  confidence: SimpleConfidence;

  // Résumé
  observedRevenue: number;
  baselineRevenue: number;
  upliftTotal: number;
  upliftFromInfluencers: number;
  directFromCodes: number;
  indirectEstimated: number;
}

export function runSimpleAttribution(input: SimpleAttributionInput): SimpleAttributionResult {
  // Calculer le panier moyen
  const avgOrderValue = input.ordersCount24h > 0
    ? input.observedRevenue24h / input.ordersCount24h
    : 80; // Fallback

  const layer1 = calcSimpleLayer1(input);
  const layer2 = calcSimpleLayer2(layer1, input.activeMomentums);
  const layer3 = calcSimpleLayer3(layer2, input.globalPromoActive, input.globalPromoDiscount);
  const layer5 = calcSimpleLayer5(
    layer3,
    input.observedRevenue24h,
    input.influencers,
    input.currentDate,
    avgOrderValue
  );
  const confidence = calcSimpleConfidence(layer1, layer2, layer3, layer5, input.observedRevenue24h);

  return {
    layer1,
    layer2,
    layer3,
    layer5,
    confidence,
    observedRevenue: input.observedRevenue24h,
    baselineRevenue: layer1.expectedRevenue24h,
    upliftTotal: input.observedRevenue24h - layer1.expectedRevenue24h,
    upliftFromInfluencers: layer5.upliftResidual,
    directFromCodes: layer5.directRevenueFromCodes,
    indirectEstimated: layer5.estimatedIndirectRevenue,
  };
}

// ============================================================================
// GÉNÉRATEUR DE DONNÉES DE TEST RÉALISTES
// ============================================================================

export interface SimpleTestScenario {
  id: string;
  name: string;
  description: string;
  input: SimpleAttributionInput;
  expectedConfidence: string; // "high" | "medium" | "low" | "very_low"
}

function generateSimpleHistory(
  baseRevenue: number,
  volatility: number,
  trend: number, // 1.01 = +1%/jour
  days: number
): SimpleHistoricalData {
  const daily: DailyRevenue[] = [];
  const endDate = new Date();

  for (let i = days; i > 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    const trendMult = Math.pow(trend, days - i);
    const dayMult = getDayOfWeekMultiplier(date);
    const noise = 1 + (Math.random() - 0.5) * volatility * 2;

    const revenue = baseRevenue * trendMult * dayMult * noise;
    const orders = Math.round(revenue / 75); // ~75€ panier moyen

    daily.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(revenue),
      ordersCount: orders,
      ordersWithInfluencerCode: Math.round(orders * 0.05 * Math.random()),
      ordersWithGlobalPromo: Math.round(orders * 0.1 * Math.random()),
    });
  }

  return { daily };
}

export function generateSimpleTestScenarios(): SimpleTestScenario[] {
  const now = new Date();
  const scenarios: SimpleTestScenario[] = [];

  // ============================================================================
  // SCÉNARIO 1: Cas idéal - code promo utilisé, pas de bruit
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'ideal-with-code',
      name: 'Cas idéal - Code promo tracké',
      description: '1 influenceuse avec code promo, pas de momentum ni promo globale, uplift clair',
      input: {
        observedRevenue24h: Math.round(baseline * 1.35), // +35%
        ordersCount24h: Math.round((baseline * 1.35) / 75),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [{
          id: 'inf1',
          username: 'emma_lifestyle',
          postTimestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // -6h
          promoCode: 'EMMA15',
          codeUsageCount: 18, // 18 commandes avec ce code
        }],
      },
      expectedConfidence: 'high',
    });
  }

  // ============================================================================
  // SCÉNARIO 2: Code promo + momentum Black Friday
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'code-with-bf',
      name: 'Code promo pendant Black Friday',
      description: 'Influenceuse avec code mais pendant BF - attribution plus difficile',
      input: {
        observedRevenue24h: Math.round(baseline * 2.1), // +110%
        ordersCount24h: Math.round((baseline * 2.1) / 70),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [{
          name: 'Black Friday',
          isActive: true,
          intensity: 0.9,
          expectedImpact: 0.40,
        }],
        globalPromoActive: true,
        globalPromoDiscount: 0.25,
        influencers: [{
          id: 'inf1',
          username: 'sarah_mode',
          postTimestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          promoCode: 'SARAH20',
          codeUsageCount: 12,
        }],
      },
      expectedConfidence: 'medium',
    });
  }

  // ============================================================================
  // SCÉNARIO 3: Sans code promo, timing seul
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'no-code-timing-only',
      name: 'Sans code - timing seul',
      description: 'Influenceuse sans code promo, on ne peut se fier qu\'au timing',
      input: {
        observedRevenue24h: Math.round(baseline * 1.25),
        ordersCount24h: Math.round((baseline * 1.25) / 75),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [{
          id: 'inf1',
          username: 'julie_beauty',
          postTimestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
          codeUsageCount: 0, // Pas de code
        }],
      },
      expectedConfidence: 'low',
    });
  }

  // ============================================================================
  // SCÉNARIO 4: Multi-influenceurs avec codes
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'multi-influencers-codes',
      name: '3 influenceurs avec codes',
      description: 'Plusieurs influenceurs postent en même temps, chacun avec son code',
      input: {
        observedRevenue24h: Math.round(baseline * 1.55),
        ordersCount24h: Math.round((baseline * 1.55) / 72),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [
          {
            id: 'inf1',
            username: 'emma_lifestyle',
            postTimestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            promoCode: 'EMMA15',
            codeUsageCount: 14,
          },
          {
            id: 'inf2',
            username: 'lucas_fit',
            postTimestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
            promoCode: 'LUCAS10',
            codeUsageCount: 8,
          },
          {
            id: 'inf3',
            username: 'marie_food',
            postTimestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
            promoCode: 'MARIE20',
            codeUsageCount: 5,
          },
        ],
      },
      expectedConfidence: 'medium',
    });
  }

  // ============================================================================
  // SCÉNARIO 5: Promo globale écrase tout
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'global-promo-dominates',
      name: 'Promo globale -40%',
      description: 'Grosse promo globale active, l\'influenceur n\'y est peut-être pour rien',
      input: {
        observedRevenue24h: Math.round(baseline * 1.7),
        ordersCount24h: Math.round((baseline * 1.7) / 65),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: true,
        globalPromoDiscount: 0.40,
        influencers: [{
          id: 'inf1',
          username: 'alex_tech',
          postTimestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          promoCode: 'ALEX10',
          codeUsageCount: 3, // Peu de codes utilisés
        }],
      },
      expectedConfidence: 'low',
    });
  }

  // ============================================================================
  // SCÉNARIO 6: Startup peu d'historique
  // ============================================================================
  {
    const history = generateSimpleHistory(800, 0.4, 1.02, 20); // Seulement 20 jours
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'startup-limited-data',
      name: 'Startup - données limitées',
      description: 'Nouvelle marque avec peu d\'historique, baseline instable',
      input: {
        observedRevenue24h: Math.round(baseline * 2.2),
        ordersCount24h: Math.round((baseline * 2.2) / 60),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [{
          id: 'inf1',
          username: 'micro_influencer',
          postTimestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
          promoCode: 'MICRO20',
          codeUsageCount: 6,
        }],
      },
      expectedConfidence: 'medium',
    });
  }

  // ============================================================================
  // SCÉNARIO 7: Contrôle - pas d'influenceur
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'control-no-influencer',
      name: 'Contrôle - aucun influenceur',
      description: 'Jour normal sans influenceur, le modèle ne doit rien attribuer',
      input: {
        observedRevenue24h: Math.round(baseline * 1.05), // Variance normale
        ordersCount24h: Math.round((baseline * 1.05) / 75),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [],
      },
      expectedConfidence: 'very_low',
    });
  }

  // ============================================================================
  // SCÉNARIO 8: Code très utilisé = confiance max
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'code-heavily-used',
      name: 'Code massivement utilisé',
      description: 'Le code promo représente 60% des commandes = preuve irréfutable',
      input: {
        observedRevenue24h: Math.round(baseline * 1.45),
        ordersCount24h: 85,
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [{
          id: 'inf1',
          username: 'mega_influencer',
          postTimestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          promoCode: 'MEGA25',
          codeUsageCount: 52, // 52/85 = 61% des commandes!
        }],
      },
      expectedConfidence: 'high',
    });
  }

  // ============================================================================
  // SCÉNARIO 9: Post ancien (24h+)
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'old-post',
      name: 'Post trop ancien',
      description: 'L\'influenceuse a posté il y a 20h, le timing score est faible',
      input: {
        observedRevenue24h: Math.round(baseline * 1.20),
        ordersCount24h: Math.round((baseline * 1.20) / 75),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [],
        globalPromoActive: false,
        globalPromoDiscount: 0,
        influencers: [{
          id: 'inf1',
          username: 'late_poster',
          postTimestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(), // -20h
          promoCode: 'LATE15',
          codeUsageCount: 4,
        }],
      },
      expectedConfidence: 'low',
    });
  }

  // ============================================================================
  // SCÉNARIO 10: Soldes + 2 influenceurs
  // ============================================================================
  {
    const history = generateSimpleHistory(5000, 0.2, 1.005, 45);
    const baseline = history.daily.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    scenarios.push({
      id: 'soldes-multi',
      name: 'Soldes + 2 influenceurs',
      description: 'Période de soldes avec 2 influenceurs actifs',
      input: {
        observedRevenue24h: Math.round(baseline * 1.65),
        ordersCount24h: Math.round((baseline * 1.65) / 70),
        historicalData: history,
        currentDate: now.toISOString(),
        activeMomentums: [{
          name: 'Soldes hiver',
          isActive: true,
          intensity: 0.7,
          expectedImpact: 0.25,
        }],
        globalPromoActive: true,
        globalPromoDiscount: 0.20,
        influencers: [
          {
            id: 'inf1',
            username: 'fashion_girl',
            postTimestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            promoCode: 'FASHION10',
            codeUsageCount: 11,
          },
          {
            id: 'inf2',
            username: 'style_guy',
            postTimestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
            promoCode: 'STYLE15',
            codeUsageCount: 6,
          },
        ],
      },
      expectedConfidence: 'low',
    });
  }

  return scenarios;
}
