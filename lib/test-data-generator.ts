/**
 * Test Data Generator for Attribution Model Stress Testing
 *
 * Generates realistic Shopify + Instagram data for 3 business scenarios:
 * 1. Growing business (forte croissance)
 * 2. New business (vient de naître)
 * 3. Declining business (en déclin)
 */

import type {
  AttributionInput,
  DailyData,
  HistoricalData,
  MomentumConfig,
  PromoContext,
  PaidMediaContext,
  InfluencerPost,
} from './attribution-model';

// ============================================================================
// BUSINESS SCENARIO TYPES
// ============================================================================

export type BusinessScenario = 'growing' | 'new' | 'declining';

export interface ScenarioConfig {
  name: string;
  description: string;
  baseRevenue: number; // Daily average
  growthRate: number; // Daily multiplier (1.01 = +1%/day)
  volatility: number; // Revenue variance (0-1)
  avgSessions: number;
  avgIgShare: number; // Instagram share of traffic
  avgEngagementRate: number;
}

const SCENARIOS: Record<BusinessScenario, ScenarioConfig> = {
  growing: {
    name: 'E-commerce en forte croissance',
    description: 'Marque DTC mode qui explose sur Instagram, CA x3 en 6 mois',
    baseRevenue: 8000,
    growthRate: 1.008, // +0.8%/day ≈ +30%/month
    volatility: 0.25,
    avgSessions: 2500,
    avgIgShare: 0.35,
    avgEngagementRate: 3.5,
  },
  new: {
    name: 'Startup e-commerce naissante',
    description: 'Lancement il y a 2 mois, premiers influenceurs, données limitées',
    baseRevenue: 1200,
    growthRate: 1.015, // High growth but low base
    volatility: 0.45, // Very volatile
    avgSessions: 400,
    avgIgShare: 0.45, // Heavy IG dependence
    avgEngagementRate: 4.2,
  },
  declining: {
    name: 'Marque mature en déclin',
    description: 'Ancienne marque, audience vieillissante, CA -15% YoY',
    baseRevenue: 15000,
    growthRate: 0.998, // -0.2%/day
    volatility: 0.15,
    avgSessions: 4000,
    avgIgShare: 0.12, // Low IG share
    avgEngagementRate: 1.8,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomGaussian(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

function getDayOfWeekMultiplier(dayOfWeek: number): number {
  // Weekend boost, Monday dip
  const multipliers = [0.85, 0.9, 0.95, 1.0, 1.05, 1.15, 1.1];
  return multipliers[dayOfWeek];
}

function getHourMultiplier(hour: number): number {
  // Shopping patterns: low at night, peaks at 12h and 20h
  const pattern = [
    0.2, 0.15, 0.1, 0.1, 0.1, 0.15, // 0-5h
    0.3, 0.5, 0.7, 0.9, 1.0, 1.1,   // 6-11h
    1.2, 1.1, 1.0, 0.9, 0.95, 1.0,  // 12-17h
    1.15, 1.3, 1.4, 1.2, 0.8, 0.4,  // 18-23h
  ];
  return pattern[hour];
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

export function generateHistoricalData(
  scenario: BusinessScenario,
  days: number = 60,
  endDate: Date = new Date()
): HistoricalData {
  const config = SCENARIOS[scenario];
  const daily: DailyData[] = [];

  for (let i = days; i > 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();

    // Base revenue with growth trend
    const daysFromStart = days - i;
    const trendMultiplier = Math.pow(config.growthRate, daysFromStart);
    const dayMultiplier = getDayOfWeekMultiplier(dayOfWeek);
    const noise = randomGaussian(1, config.volatility);

    const revenue = Math.max(0,
      config.baseRevenue * trendMultiplier * dayMultiplier * noise
    );

    const sessions = Math.round(
      config.avgSessions * trendMultiplier * dayMultiplier * randomGaussian(1, 0.2)
    );

    const igSessions = Math.round(sessions * config.avgIgShare * randomGaussian(1, 0.15));

    daily.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(revenue * 100) / 100,
      sessions,
      igSessions,
    });
  }

  // Generate year-ago data (only for declining scenario, others are too new)
  let yearAgo: DailyData[] | undefined;
  if (scenario === 'declining') {
    yearAgo = [];
    for (let i = 7; i > 0; i--) {
      const date = new Date(endDate);
      date.setFullYear(date.getFullYear() - 1);
      date.setDate(date.getDate() - i);

      // Year ago was 15% higher
      const revenue = config.baseRevenue * 1.15 * getDayOfWeekMultiplier(date.getDay()) * randomGaussian(1, 0.15);
      yearAgo.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
        sessions: Math.round(config.avgSessions * 1.1),
        igSessions: Math.round(config.avgSessions * 0.15),
      });
    }
  }

  return { daily, yearAgo };
}

export function generateInfluencerPost(
  scenario: BusinessScenario,
  postTime: Date,
  tier: 'micro' | 'mid' | 'macro' = 'mid'
): InfluencerPost {
  const config = SCENARIOS[scenario];

  const tierConfigs = {
    micro: { reach: [5000, 30000], engagement: [4, 8], name: 'micro_' },
    mid: { reach: [30000, 150000], engagement: [2.5, 5], name: 'mid_' },
    macro: { reach: [150000, 500000], engagement: [1.5, 3], name: 'macro_' },
  };

  const tierConfig = tierConfigs[tier];
  const reach = Math.round(
    tierConfig.reach[0] + Math.random() * (tierConfig.reach[1] - tierConfig.reach[0])
  );
  const engagement = tierConfig.engagement[0] +
    Math.random() * (tierConfig.engagement[1] - tierConfig.engagement[0]);

  const names = [
    { username: 'emma_lifestyle', fullName: 'Emma Martin' },
    { username: 'julien_fit', fullName: 'Julien Dupont' },
    { username: 'sarah_beauty', fullName: 'Sarah Bernard' },
    { username: 'lucas_travel', fullName: 'Lucas Moreau' },
    { username: 'chloe_mode', fullName: 'Chloé Petit' },
    { username: 'alex_tech', fullName: 'Alexandre Leroy' },
    { username: 'marie_food', fullName: 'Marie Dubois' },
    { username: 'thomas_sport', fullName: 'Thomas Garcia' },
  ];

  const randomName = names[Math.floor(Math.random() * names.length)];

  return {
    id: `inf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: randomName.username,
    profilePicUrl: `https://i.pravatar.cc/150?u=${randomName.username}`,
    postTimestamp: postTime.toISOString(),
    reachEstimated: reach,
    engagementRate: Math.round(engagement * 100) / 100,
    storyWithLink: Math.random() > 0.3,
    personalCodeUsed: Math.random() > 0.5,
    historicalUpliftMean: scenario === 'new' ? undefined : Math.random() * 0.5 + 0.3,
    historicalConfidence: scenario === 'new' ? undefined : Math.random() * 0.4 + 0.4,
  };
}

export function generateMomentums(currentDate: Date): MomentumConfig[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  const momentums: MomentumConfig[] = [];

  // Black Friday (last Friday of November)
  const blackFriday = new Date(year, 10, 28); // Approximate
  momentums.push({
    name: 'Black Friday',
    centralDate: blackFriday.toISOString().split('T')[0],
    impactCoefficient: 0.35,
    intensityCurve: [
      { daysOffset: -14, intensity: 0.2 },
      { daysOffset: -7, intensity: 0.5 },
      { daysOffset: -3, intensity: 0.8 },
      { daysOffset: 0, intensity: 1.0 },
      { daysOffset: 2, intensity: 0.6 },
      { daysOffset: 7, intensity: 0.3 },
      { daysOffset: 14, intensity: 0.1 },
    ],
  });

  // Soldes d'hiver (January)
  momentums.push({
    name: 'Soldes Hiver',
    centralDate: `${year}-01-10`,
    impactCoefficient: 0.25,
    intensityCurve: [
      { daysOffset: -3, intensity: 0.3 },
      { daysOffset: 0, intensity: 1.0 },
      { daysOffset: 7, intensity: 0.8 },
      { daysOffset: 14, intensity: 0.5 },
      { daysOffset: 21, intensity: 0.3 },
      { daysOffset: 28, intensity: 0.1 },
    ],
  });

  // Soldes d'été (June-July)
  momentums.push({
    name: 'Soldes Été',
    centralDate: `${year}-06-25`,
    impactCoefficient: 0.20,
    intensityCurve: [
      { daysOffset: -3, intensity: 0.3 },
      { daysOffset: 0, intensity: 1.0 },
      { daysOffset: 7, intensity: 0.7 },
      { daysOffset: 14, intensity: 0.4 },
      { daysOffset: 21, intensity: 0.2 },
    ],
  });

  // Noël
  momentums.push({
    name: 'Noël',
    centralDate: `${year}-12-25`,
    impactCoefficient: 0.30,
    intensityCurve: [
      { daysOffset: -21, intensity: 0.3 },
      { daysOffset: -14, intensity: 0.5 },
      { daysOffset: -7, intensity: 0.8 },
      { daysOffset: -3, intensity: 1.0 },
      { daysOffset: 0, intensity: 0.4 },
      { daysOffset: 3, intensity: 0.2 },
    ],
  });

  return momentums;
}

export function generatePromoContext(intensity: 'none' | 'light' | 'medium' | 'heavy'): PromoContext {
  const configs: Record<string, PromoContext> = {
    none: { discountLevel: 0, globalCodeActive: false, bundlesActive: false, freeShipping: false },
    light: { discountLevel: 0.10, globalCodeActive: false, bundlesActive: false, freeShipping: true },
    medium: { discountLevel: 0.20, globalCodeActive: true, bundlesActive: false, freeShipping: true },
    heavy: { discountLevel: 0.35, globalCodeActive: true, bundlesActive: true, freeShipping: true },
  };
  return configs[intensity];
}

export function generatePaidMediaContext(
  scenario: BusinessScenario,
  intensity: 'low' | 'normal' | 'high'
): PaidMediaContext {
  const baseSpends: Record<BusinessScenario, number> = {
    growing: 800,
    new: 200,
    declining: 1500,
  };

  const baseSpend = baseSpends[scenario];
  const multipliers = { low: 0.5, normal: 1.0, high: 1.8 };
  const currentMultiplier = multipliers[intensity];

  return {
    metaSpend24h: Math.round(baseSpend * 0.7 * currentMultiplier),
    googleSpend24h: Math.round(baseSpend * 0.3 * currentMultiplier),
    paidSpendBaseline: baseSpend,
    avgCpmChange: intensity === 'high' ? 1.3 : intensity === 'low' ? 0.9 : 1.0,
    avgCpcChange: intensity === 'high' ? 1.25 : intensity === 'low' ? 0.95 : 1.0,
  };
}

// ============================================================================
// FULL TEST SCENARIO GENERATOR
// ============================================================================

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  scenario: BusinessScenario;
  input: AttributionInput;
  // Expected behavior notes
  expectedBehavior: string;
}

export function generateTestScenarios(): TestScenario[] {
  const scenarios: TestScenario[] = [];
  const now = new Date();

  // ============================================================================
  // SCENARIO 1: Growing business, clean signal
  // ============================================================================
  {
    const historical = generateHistoricalData('growing', 60, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 12);

    // Simulate uplift: observed is 40% higher than expected
    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.4;

    // Generate hourly data with early spike (Instagram pattern)
    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i < 3) return baseHourly * 2.5; // Big spike first 3 hours
      if (i < 6) return baseHourly * 1.5;
      return baseHourly * 0.7;
    });

    scenarios.push({
      id: 'growing-clean',
      name: 'Croissance + Signal propre',
      description: 'Marque en croissance, 1 influenceuse mid-tier, pas de promo ni paid excessif',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 3200,
        observedIgSessions24h: 1400,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('none'),
        paidMediaContext: generatePaidMediaContext('growing', 'normal'),
        influencers: [generateInfluencerPost('growing', postTime, 'mid')],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Haute confiance (70-85), attribution claire à l\'influenceuse, uplift bien isolé',
    });
  }

  // ============================================================================
  // SCENARIO 2: Growing business, Black Friday noise
  // ============================================================================
  {
    const bfDate = new Date(now.getFullYear(), 10, 28); // Nov 28
    const historical = generateHistoricalData('growing', 60, bfDate);
    const postTime = new Date(bfDate);
    postTime.setHours(postTime.getHours() - 8);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 2.1; // Big uplift but also BF

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i < 4) return baseHourly * 1.8;
      return baseHourly * 0.9;
    });

    scenarios.push({
      id: 'growing-bf',
      name: 'Croissance + Black Friday',
      description: 'Post influenceuse pendant Black Friday - attribution difficile',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 5500,
        observedIgSessions24h: 1800,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(bfDate),
        currentDate: bfDate.toISOString(),
        promoContext: generatePromoContext('heavy'),
        paidMediaContext: generatePaidMediaContext('growing', 'high'),
        influencers: [generateInfluencerPost('growing', postTime, 'macro')],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Confiance basse (30-50), momentum et promo absorbent beaucoup, attribution influenceur réduite',
    });
  }

  // ============================================================================
  // SCENARIO 3: New business, first influencer campaign
  // ============================================================================
  {
    const historical = generateHistoricalData('new', 45, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 6);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 2.8; // Massive relative uplift

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i < 2) return baseHourly * 3.5;
      if (i < 4) return baseHourly * 2.0;
      return baseHourly * 0.5;
    });

    scenarios.push({
      id: 'new-first-campaign',
      name: 'Startup + 1ère campagne',
      description: 'Nouvelle marque, données limitées, 1 micro-influenceuse avec code',
      scenario: 'new',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 850,
        observedIgSessions24h: 520,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('light'),
        paidMediaContext: generatePaidMediaContext('new', 'low'),
        influencers: [
          { ...generateInfluencerPost('new', postTime, 'micro'), personalCodeUsed: true },
        ],
        avgEngagementRateCategory: 4.0,
      },
      expectedBehavior: 'Confiance moyenne (50-65), fort signal IG mais baseline instable, code utilisé = preuve forte',
    });
  }

  // ============================================================================
  // SCENARIO 4: New business, multiple influencers
  // ============================================================================
  {
    const historical = generateHistoricalData('new', 45, now);
    const postTime1 = new Date(now);
    postTime1.setHours(postTime1.getHours() - 4);
    const postTime2 = new Date(now);
    postTime2.setHours(postTime2.getHours() - 8);
    const postTime3 = new Date(now);
    postTime3.setHours(postTime3.getHours() - 18);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 3.5;

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      // Multiple peaks
      if (i >= 4 && i <= 6) return baseHourly * 2.2;
      if (i >= 8 && i <= 10) return baseHourly * 1.8;
      if (i >= 18 && i <= 20) return baseHourly * 1.5;
      return baseHourly * 0.6;
    });

    scenarios.push({
      id: 'new-multi-influencers',
      name: 'Startup + 3 influenceurs',
      description: '3 influenceurs postent dans la même fenêtre 24h - attribution complexe',
      scenario: 'new',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 1100,
        observedIgSessions24h: 680,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('none'),
        paidMediaContext: generatePaidMediaContext('new', 'normal'),
        influencers: [
          generateInfluencerPost('new', postTime1, 'micro'),
          generateInfluencerPost('new', postTime2, 'micro'),
          generateInfluencerPost('new', postTime3, 'mid'),
        ],
        avgEngagementRateCategory: 4.0,
      },
      expectedBehavior: 'Confiance réduite (40-55) à cause du chevauchement, répartition basée sur timing et reach',
    });
  }

  // ============================================================================
  // SCENARIO 5: Declining business, promo heavy
  // ============================================================================
  {
    const historical = generateHistoricalData('declining', 60, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 10);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.15; // Small uplift

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      // Flat pattern, no clear IG spike
      return baseHourly * (0.9 + Math.random() * 0.2);
    });

    scenarios.push({
      id: 'declining-promo',
      name: 'Déclin + Promo forte',
      description: 'Marque en déclin qui mise sur promos, influence peu visible',
      scenario: 'declining',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 4200,
        observedIgSessions24h: 450,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('heavy'),
        paidMediaContext: generatePaidMediaContext('declining', 'high'),
        influencers: [generateInfluencerPost('declining', postTime, 'macro')],
        avgEngagementRateCategory: 2.0,
      },
      expectedBehavior: 'Confiance très basse (20-35), promo et paid expliquent tout, quasi pas d\'attribution influenceur',
    });
  }

  // ============================================================================
  // SCENARIO 6: Declining business, influencer saves the day
  // ============================================================================
  {
    const historical = generateHistoricalData('declining', 60, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 3);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.45; // Good uplift despite decline

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      // Clear early spike
      if (i < 2) return baseHourly * 3.0;
      if (i < 5) return baseHourly * 2.0;
      return baseHourly * 0.6;
    });

    scenarios.push({
      id: 'declining-clean',
      name: 'Déclin + Signal propre',
      description: 'Marque en déclin mais influenceuse génère un vrai uplift isolé',
      scenario: 'declining',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 4800,
        observedIgSessions24h: 1100,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('none'),
        paidMediaContext: generatePaidMediaContext('declining', 'low'),
        influencers: [
          { ...generateInfluencerPost('declining', postTime, 'mid'), personalCodeUsed: true, storyWithLink: true },
        ],
        avgEngagementRateCategory: 2.0,
      },
      expectedBehavior: 'Confiance bonne (60-75), signal temporel clair, pas de bruit promo/paid, YoY corrige le déclin',
    });
  }

  // ============================================================================
  // SCENARIO 7: Growing with paid amplification
  // ============================================================================
  {
    const historical = generateHistoricalData('growing', 60, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 5);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.8;

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i < 3) return baseHourly * 2.0;
      if (i < 8) return baseHourly * 1.4;
      return baseHourly * 0.7;
    });

    scenarios.push({
      id: 'growing-paid-amplify',
      name: 'Croissance + Paid amplifie IG',
      description: 'Paid media boost le post influenceur - effet combiné',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 4500,
        observedIgSessions24h: 1600,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('light'),
        paidMediaContext: generatePaidMediaContext('growing', 'high'),
        influencers: [generateInfluencerPost('growing', postTime, 'mid')],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Confiance moyenne (50-65), paid élevé mais IG sessions share aussi, influence plafonnée mais présente',
    });
  }

  // ============================================================================
  // SCENARIO 8: Soldes + micro-influencer seeding
  // ============================================================================
  {
    const soldesDate = new Date(now.getFullYear(), 0, 12); // Jan 12
    const historical = generateHistoricalData('growing', 60, soldesDate);
    const postTime1 = new Date(soldesDate);
    postTime1.setHours(postTime1.getHours() - 2);
    const postTime2 = new Date(soldesDate);
    postTime2.setHours(postTime2.getHours() - 6);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.7;

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i < 3) return baseHourly * 2.2;
      if (i >= 6 && i < 9) return baseHourly * 1.6;
      return baseHourly * 0.8;
    });

    scenarios.push({
      id: 'soldes-seeding',
      name: 'Soldes + Seeding micro',
      description: 'Période soldes avec 2 micro-influenceuses en seeding',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 3800,
        observedIgSessions24h: 1300,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(soldesDate),
        currentDate: soldesDate.toISOString(),
        promoContext: generatePromoContext('medium'),
        paidMediaContext: generatePaidMediaContext('growing', 'normal'),
        influencers: [
          generateInfluencerPost('growing', postTime1, 'micro'),
          generateInfluencerPost('growing', postTime2, 'micro'),
        ],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Confiance modérée (45-60), momentum soldes réduit attribution, mais timing des posts visible',
    });
  }

  // ============================================================================
  // SCENARIO 9: No influencer (control)
  // ============================================================================
  {
    const historical = generateHistoricalData('growing', 60, now);

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.05; // Normal variance

    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      return baseHourly * getHourMultiplier(i);
    });

    scenarios.push({
      id: 'control-no-influencer',
      name: 'Contrôle sans influenceur',
      description: 'Jour normal sans post influenceur - le modèle ne doit rien attribuer',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 2600,
        observedIgSessions24h: 700,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('none'),
        paidMediaContext: generatePaidMediaContext('growing', 'normal'),
        influencers: [],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Pas d\'attribution influenceur (0€), uplift quasi nul ou négatif, baseline = observé',
    });
  }

  // ============================================================================
  // SCENARIO 10: False positive test
  // ============================================================================
  {
    const historical = generateHistoricalData('growing', 60, now);
    const postTime = new Date(now);
    postTime.setHours(postTime.getHours() - 20); // Posted 20h ago

    const expectedBase = historical.daily.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
    const observedRevenue = expectedBase * 1.35; // Uplift but late

    // Uplift NOT correlated with post time
    const hourlyRevenue = Array(24).fill(0).map((_, i) => {
      const baseHourly = observedRevenue / 24;
      if (i >= 15 && i <= 18) return baseHourly * 2.0; // Late spike
      return baseHourly * 0.85;
    });

    scenarios.push({
      id: 'false-positive',
      name: 'Faux positif potentiel',
      description: 'Influenceuse a posté mais uplift arrive 15h plus tard - pas son effet',
      scenario: 'growing',
      input: {
        observedRevenue24h: Math.round(observedRevenue),
        observedSessions24h: 3100,
        observedIgSessions24h: 600,
        hourlyRevenue24h: hourlyRevenue.map(r => Math.round(r)),
        historicalData: historical,
        momentums: generateMomentums(now),
        currentDate: now.toISOString(),
        promoContext: generatePromoContext('light'),
        paidMediaContext: generatePaidMediaContext('growing', 'normal'),
        influencers: [generateInfluencerPost('growing', postTime, 'mid')],
        avgEngagementRateCategory: 3.0,
      },
      expectedBehavior: 'Confiance basse (25-40), timing score très bas, pénalité temporelle forte, attribution minimale',
    });
  }

  return scenarios;
}

export { SCENARIOS };
