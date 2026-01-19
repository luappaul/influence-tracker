/**
 * Attribution Model - 5 Layers Incremental Revenue Attribution
 *
 * Objective: Isolate the truly incremental revenue attributable to an Instagram influencer,
 * by neutralizing: seasonality, e-commerce momentums, global promos, and paid media.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HourlyData {
  hour: number; // 0-23
  revenue: number;
  sessions: number;
  igSessions: number;
}

export interface DailyData {
  date: string;
  revenue: number;
  sessions: number;
  igSessions: number;
  hourlyData?: HourlyData[];
}

export interface HistoricalData {
  daily: DailyData[];
  yearAgo?: DailyData[]; // Same period last year for YoY
}

export interface MomentumConfig {
  name: string;
  centralDate: string;
  impactCoefficient: number; // e.g., 0.35 for Black Friday (+35%)
  intensityCurve: { daysOffset: number; intensity: number }[];
}

export interface PromoContext {
  discountLevel: number; // 0-1 (e.g., 0.20 for 20%)
  globalCodeActive: boolean;
  bundlesActive: boolean;
  freeShipping: boolean;
}

export interface PaidMediaContext {
  metaSpend24h: number;
  googleSpend24h: number;
  paidSpendBaseline: number;
  avgCpmChange: number; // ratio vs baseline (e.g., 1.4 = +40%)
  avgCpcChange: number;
}

export interface InfluencerPost {
  id: string;
  username: string;
  profilePicUrl: string;
  postTimestamp: string;
  reachEstimated: number;
  engagementRate: number;
  storyWithLink: boolean;
  personalCodeUsed: boolean;
  historicalUpliftMean?: number; // 0-1 normalized
  historicalConfidence?: number; // 0-1
}

export interface AttributionInput {
  // Observed data (24h window after influencer post)
  observedRevenue24h: number;
  observedSessions24h: number;
  observedIgSessions24h: number;
  hourlyRevenue24h: number[]; // 24 values, one per hour

  // Historical data for baseline
  historicalData: HistoricalData;

  // Context layers
  momentums: MomentumConfig[];
  currentDate: string;
  promoContext: PromoContext;
  paidMediaContext: PaidMediaContext;

  // Influencers active in window
  influencers: InfluencerPost[];

  // Category benchmark
  avgEngagementRateCategory: number;
}

// ============================================================================
// LAYER 1 - HISTORICAL SEASONALITY (Baseline)
// ============================================================================

export interface Layer1Output {
  expectedRevenue24hNoActivation: number;
  ma7: number;
  ma14: number;
  ma28: number;
  yoyFactor: number;
  hourlyExpected: number[];
}

export function calculateLayer1(input: AttributionInput): Layer1Output {
  const { historicalData } = input;
  const daily = historicalData.daily;

  // Calculate moving averages from daily data
  const last7Days = daily.slice(-7);
  const last14Days = daily.slice(-14);
  const last28Days = daily.slice(-28);

  const ma7 = last7Days.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last7Days.length, 1);
  const ma14 = last14Days.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last14Days.length, 1);
  const ma28 = last28Days.reduce((sum, d) => sum + d.revenue, 0) / Math.max(last28Days.length, 1);

  // Weighted average: 50% MA7 + 30% MA14 + 20% MA28
  const expectedBase = 0.5 * ma7 + 0.3 * ma14 + 0.2 * ma28;

  // YoY factor (if we have year-ago data)
  let yoyFactor = 1.0;
  if (historicalData.yearAgo && historicalData.yearAgo.length > 0) {
    const currentWeekAvg = last7Days.reduce((sum, d) => sum + d.revenue, 0) / last7Days.length;
    const yearAgoWeekAvg = historicalData.yearAgo.reduce((sum, d) => sum + d.revenue, 0) / historicalData.yearAgo.length;
    if (yearAgoWeekAvg > 0) {
      yoyFactor = currentWeekAvg / yearAgoWeekAvg;
    }
  }

  const expectedRevenue24hNoActivation = expectedBase * yoyFactor;

  // Distribute expected revenue across hours (simple: use last week's hourly pattern if available)
  // For MVP, use flat distribution
  const hourlyExpected = Array(24).fill(expectedRevenue24hNoActivation / 24);

  return {
    expectedRevenue24hNoActivation,
    ma7,
    ma14,
    ma28,
    yoyFactor,
    hourlyExpected,
  };
}

// ============================================================================
// LAYER 2 - E-COMMERCE MOMENTUMS
// ============================================================================

export interface Layer2Output {
  expectedRevenue24hWithMomentum: number;
  activeMomentums: { name: string; intensity: number; impact: number }[];
  momentumMultiplier: number;
}

export function calculateLayer2(
  layer1Output: Layer1Output,
  momentums: MomentumConfig[],
  currentDate: string
): Layer2Output {
  const current = new Date(currentDate);
  const activeMomentums: { name: string; intensity: number; impact: number }[] = [];

  let totalMomentumImpact = 0;

  for (const momentum of momentums) {
    const centralDate = new Date(momentum.centralDate);
    const daysDiff = Math.round((current.getTime() - centralDate.getTime()) / (1000 * 60 * 60 * 24));

    // Find intensity for current day
    let intensity = 0;
    for (const point of momentum.intensityCurve) {
      if (point.daysOffset === daysDiff) {
        intensity = point.intensity;
        break;
      }
      // Interpolate between points
      const sortedCurve = [...momentum.intensityCurve].sort((a, b) => a.daysOffset - b.daysOffset);
      for (let i = 0; i < sortedCurve.length - 1; i++) {
        if (daysDiff >= sortedCurve[i].daysOffset && daysDiff <= sortedCurve[i + 1].daysOffset) {
          const ratio = (daysDiff - sortedCurve[i].daysOffset) /
                       (sortedCurve[i + 1].daysOffset - sortedCurve[i].daysOffset);
          intensity = sortedCurve[i].intensity + ratio * (sortedCurve[i + 1].intensity - sortedCurve[i].intensity);
          break;
        }
      }
    }

    if (intensity > 0) {
      const impact = intensity * momentum.impactCoefficient;
      totalMomentumImpact += impact;
      activeMomentums.push({
        name: momentum.name,
        intensity,
        impact,
      });
    }
  }

  const momentumMultiplier = 1 + totalMomentumImpact;
  const expectedRevenue24hWithMomentum = layer1Output.expectedRevenue24hNoActivation * momentumMultiplier;

  return {
    expectedRevenue24hWithMomentum,
    activeMomentums,
    momentumMultiplier,
  };
}

// ============================================================================
// LAYER 3 - PROMOS & OFFERS
// ============================================================================

export interface Layer3Output {
  expectedRevenue24hWithPromos: number;
  promoScore: number;
  promoMultiplier: number;
}

export function calculateLayer3(
  layer2Output: Layer2Output,
  promoContext: PromoContext
): Layer3Output {
  // promo_score = 0.4×discount_level + 0.3×code_global + 0.2×bundles + 0.1×free_shipping
  const promoScore =
    0.4 * promoContext.discountLevel +
    0.3 * (promoContext.globalCodeActive ? 1 : 0) +
    0.2 * (promoContext.bundlesActive ? 1 : 0) +
    0.1 * (promoContext.freeShipping ? 1 : 0);

  const promoMultiplier = 1 + promoScore;
  const expectedRevenue24hWithPromos = layer2Output.expectedRevenue24hWithMomentum * promoMultiplier;

  return {
    expectedRevenue24hWithPromos,
    promoScore,
    promoMultiplier,
  };
}

// ============================================================================
// LAYER 4 - PAID MEDIA & TRAFFIC
// ============================================================================

export interface Layer4Output {
  expectedRevenue24hWithAllCorrections: number;
  paidPressure: number;
  trafficLift: number;
  paidInfluenceScore: number;
  paidMultiplier: number;
  instagramSessionsShare: number;
}

export function calculateLayer4(
  layer3Output: Layer3Output,
  paidMediaContext: PaidMediaContext,
  observedSessions24h: number,
  expectedSessions24h: number,
  observedIgSessions24h: number
): Layer4Output {
  // Paid pressure = total spend / baseline spend
  const totalSpend = paidMediaContext.metaSpend24h + paidMediaContext.googleSpend24h;
  const paidPressure = paidMediaContext.paidSpendBaseline > 0
    ? totalSpend / paidMediaContext.paidSpendBaseline
    : 1;

  // Traffic lift = observed sessions / expected sessions
  const trafficLift = expectedSessions24h > 0
    ? observedSessions24h / expectedSessions24h
    : 1;

  // Instagram sessions share
  const instagramSessionsShare = observedSessions24h > 0
    ? observedIgSessions24h / observedSessions24h
    : 0;

  // Paid influence score
  // 0.5 × paid_pressure + 0.3 × traffic_lift + 0.2 × max(cpm_change, cpc_change)
  const paidInfluenceScore =
    0.5 * paidPressure +
    0.3 * trafficLift +
    0.2 * Math.max(paidMediaContext.avgCpmChange, paidMediaContext.avgCpcChange);

  // Paid multiplier with gamma = 0.5
  const gamma = 0.5;
  const paidMultiplier = 1 + gamma * (paidInfluenceScore - 1);

  const expectedRevenue24hWithAllCorrections = layer3Output.expectedRevenue24hWithPromos * paidMultiplier;

  return {
    expectedRevenue24hWithAllCorrections,
    paidPressure,
    trafficLift,
    paidInfluenceScore,
    paidMultiplier,
    instagramSessionsShare,
  };
}

// ============================================================================
// LAYER 5 - INFLUENCER SIGNAL (MULTI-INFLUENCERS)
// ============================================================================

export interface InfluencerAttribution {
  influencer: InfluencerPost;
  reachScore: number;
  engagementScore: number;
  timingScore: number;
  conversionSignal: number;
  historicalScore: number;
  rawSignal: number;
  weight: number; // Normalized (sum = 1)
  attributedRevenue: number;
  attributedUplift: number;
}

export interface Layer5Output {
  upliftResidual: number;
  influencerAttributions: InfluencerAttribution[];
  totalInfluencerRevenue: number;
}

export function calculateLayer5(
  layer4Output: Layer4Output,
  observedRevenue24h: number,
  influencers: InfluencerPost[],
  avgEngagementRateCategory: number,
  currentTimestamp: string
): Layer5Output {
  // Calculate residual uplift (what remains after all corrections)
  const upliftResidual = Math.max(0, observedRevenue24h - layer4Output.expectedRevenue24hWithAllCorrections);

  if (influencers.length === 0 || upliftResidual === 0) {
    return {
      upliftResidual,
      influencerAttributions: [],
      totalInfluencerRevenue: 0,
    };
  }

  const currentTime = new Date(currentTimestamp);
  const maxReach = Math.max(...influencers.map(i => i.reachEstimated));

  // Calculate raw signal for each influencer
  const attributions: InfluencerAttribution[] = influencers.map(inf => {
    // Reach score (log scale to avoid mega-influencer dominance)
    const reachScore = Math.log(1 + inf.reachEstimated) / Math.log(1 + maxReach);

    // Engagement score (relative to category average, capped 0.5-1.5)
    const engagementRatio = avgEngagementRateCategory > 0
      ? inf.engagementRate / avgEngagementRateCategory
      : 1;
    const engagementScore = Math.min(Math.max(engagementRatio, 0.5), 1.5);

    // Timing score (exponential decay, lambda = 0.15)
    const postTime = new Date(inf.postTimestamp);
    const hoursSincePost = (currentTime.getTime() - postTime.getTime()) / (1000 * 60 * 60);
    const lambda = 0.15;
    const timingScore = Math.exp(-lambda * Math.max(0, hoursSincePost));

    // Conversion signal (link + code usage)
    const conversionSignal =
      (inf.storyWithLink ? 0.5 : 0) +
      (inf.personalCodeUsed ? 0.5 : 0);

    // Historical score
    const historicalScore = inf.historicalUpliftMean !== undefined && inf.historicalConfidence !== undefined
      ? 0.5 * inf.historicalUpliftMean + 0.5 * inf.historicalConfidence
      : 0.5; // Neutral if no history

    // Raw signal: weighted combination
    const rawSignal =
      0.30 * reachScore +
      0.25 * engagementScore +
      0.20 * timingScore +
      0.15 * conversionSignal +
      0.10 * historicalScore;

    return {
      influencer: inf,
      reachScore,
      engagementScore,
      timingScore,
      conversionSignal,
      historicalScore,
      rawSignal,
      weight: 0, // Will be normalized
      attributedRevenue: 0,
      attributedUplift: 0,
    };
  });

  // Normalize weights (sum = 1)
  const totalSignal = attributions.reduce((sum, a) => sum + a.rawSignal, 0);

  for (const attr of attributions) {
    attr.weight = totalSignal > 0 ? attr.rawSignal / totalSignal : 1 / attributions.length;
    attr.attributedUplift = upliftResidual * attr.weight;
    attr.attributedRevenue = layer4Output.expectedRevenue24hWithAllCorrections * attr.weight + attr.attributedUplift;
  }

  const totalInfluencerRevenue = attributions.reduce((sum, a) => sum + a.attributedUplift, 0);

  return {
    upliftResidual,
    influencerAttributions: attributions,
    totalInfluencerRevenue: upliftResidual,
  };
}

// ============================================================================
// CONFIDENCE SCORE
// ============================================================================

export interface ConfidenceComponents {
  signalStrength: number;
  temporalPurity: number;
  channelEvidence: number;
  confounding: number;
  overlap: number;
  clarity: number;
}

export interface ConfidenceOutput {
  confidenceScore: number; // 0-100
  components: ConfidenceComponents;
}

export function calculateConfidence(
  upliftResidual: number,
  expectedRevenueAllLayers: number,
  layer2Output: Layer2Output,
  layer3Output: Layer3Output,
  layer4Output: Layer4Output,
  influencerAttributions: InfluencerAttribution[],
  hourlyRevenue24h: number[],
  hourlyExpected: number[]
): ConfidenceOutput {
  // A) Signal Strength
  const threshold = 0.15 * expectedRevenueAllLayers;
  const signalStrength = Math.min(Math.max(upliftResidual / threshold, 0), 1);

  // B) Temporal Purity - analyze uplift concentration in early hours
  const hourlyUplift = hourlyRevenue24h.map((rev, i) => Math.max(0, rev - hourlyExpected[i]));
  const totalHourlyUplift = hourlyUplift.reduce((sum, u) => sum + u, 0) || 1;

  const share_0_1h = hourlyUplift.slice(0, 1).reduce((sum, u) => sum + u, 0) / totalHourlyUplift;
  const share_1_3h = hourlyUplift.slice(1, 3).reduce((sum, u) => sum + u, 0) / totalHourlyUplift;
  const share_3_6h = hourlyUplift.slice(3, 6).reduce((sum, u) => sum + u, 0) / totalHourlyUplift;
  const share_6_24h = hourlyUplift.slice(6, 24).reduce((sum, u) => sum + u, 0) / totalHourlyUplift;

  const temporalPurity =
    0.5 * share_0_1h +
    0.3 * share_1_3h +
    0.15 * share_3_6h +
    0.05 * share_6_24h;

  // C) Channel Evidence (using IG sessions share delta)
  const igShareDelta = layer4Output.instagramSessionsShare - 0.1; // Assuming baseline 10%
  const channelEvidence = Math.min(Math.max(igShareDelta / 0.20, 0), 1);

  // D) Confounding Penalty
  const a = 1.0, b = 0.8, c = 0.8;
  const confounding = 1 / (1 +
    a * (layer2Output.momentumMultiplier - 1) +
    b * (layer3Output.promoMultiplier - 1) +
    c * (layer4Output.paidMultiplier - 1));

  // E) Overlap Penalty
  const numInfluencers = influencerAttributions.length;
  const overlap = numInfluencers > 0 ? 1 / (1 + 0.25 * (numInfluencers - 1)) : 1;

  // F) Attribution Clarity
  let clarity = 1;
  if (influencerAttributions.length >= 2) {
    const sortedWeights = [...influencerAttributions].sort((a, b) => b.weight - a.weight);
    const topWeight = sortedWeights[0].weight;
    const secondWeight = sortedWeights[1].weight;
    clarity = Math.min(Math.max((topWeight - secondWeight) / 0.30, 0), 1);
  }

  // Final confidence score
  const confidence_0_1 =
    0.25 * signalStrength +
    0.20 * temporalPurity +
    0.15 * channelEvidence +
    0.20 * confounding +
    0.10 * overlap +
    0.10 * clarity;

  const confidenceScore = Math.round(100 * confidence_0_1);

  return {
    confidenceScore,
    components: {
      signalStrength,
      temporalPurity,
      channelEvidence,
      confounding,
      overlap,
      clarity,
    },
  };
}

// ============================================================================
// FULL ATTRIBUTION PIPELINE
// ============================================================================

export interface FullAttributionResult {
  // Layer outputs
  layer1: Layer1Output;
  layer2: Layer2Output;
  layer3: Layer3Output;
  layer4: Layer4Output;
  layer5: Layer5Output;
  confidence: ConfidenceOutput;

  // Summary
  observedRevenue: number;
  baselineRevenue: number;
  upliftTotal: number;
  upliftAttributedToInfluencers: number;
  upliftAttributedToOther: number; // momentum + promo + paid
  roi: number | null; // If we have influencer costs
}

export function runFullAttribution(input: AttributionInput): FullAttributionResult {
  // Layer 1 - Seasonality baseline
  const layer1 = calculateLayer1(input);

  // Layer 2 - Momentums
  const layer2 = calculateLayer2(layer1, input.momentums, input.currentDate);

  // Layer 3 - Promos
  const layer3 = calculateLayer3(layer2, input.promoContext);

  // Expected sessions (proportional to expected revenue for simplicity)
  const avgSessionsLast7 = input.historicalData.daily.slice(-7)
    .reduce((sum, d) => sum + d.sessions, 0) / 7;
  const expectedSessions24h = avgSessionsLast7;

  // Layer 4 - Paid Media
  const layer4 = calculateLayer4(
    layer3,
    input.paidMediaContext,
    input.observedSessions24h,
    expectedSessions24h,
    input.observedIgSessions24h
  );

  // Layer 5 - Influencer attribution
  const layer5 = calculateLayer5(
    layer4,
    input.observedRevenue24h,
    input.influencers,
    input.avgEngagementRateCategory,
    input.currentDate
  );

  // Confidence score
  const confidence = calculateConfidence(
    layer5.upliftResidual,
    layer4.expectedRevenue24hWithAllCorrections,
    layer2,
    layer3,
    layer4,
    layer5.influencerAttributions,
    input.hourlyRevenue24h,
    layer1.hourlyExpected
  );

  // Summary calculations
  const observedRevenue = input.observedRevenue24h;
  const baselineRevenue = layer1.expectedRevenue24hNoActivation;
  const upliftTotal = observedRevenue - baselineRevenue;
  const upliftAttributedToInfluencers = layer5.upliftResidual;
  const upliftAttributedToOther = Math.max(0,
    layer4.expectedRevenue24hWithAllCorrections - baselineRevenue);

  return {
    layer1,
    layer2,
    layer3,
    layer4,
    layer5,
    confidence,
    observedRevenue,
    baselineRevenue,
    upliftTotal,
    upliftAttributedToInfluencers,
    upliftAttributedToOther,
    roi: null, // Would need cost data
  };
}
