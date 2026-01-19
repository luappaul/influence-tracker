/**
 * Attribution Model ADVANCED - Sans code promo
 *
 * PROMESSE: Tracker l'impact influenceur SANS lien ni code promo
 *
 * Données disponibles:
 * - Shopify: CA horaire, nombre de commandes
 * - Scraping: Heure du post, nombre de followers
 *
 * Objectifs:
 * 1. Détecter un uplift global vs baseline
 * 2. Attribuer cet uplift entre plusieurs influenceurs
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HourlyDataPoint {
  hour: number; // 0-71 (72 heures)
  timestamp: Date;
  revenue: number;
  orders: number;
  // Pas de code promo !
}

export interface InfluencerEvent {
  id: string;
  username: string;
  postHour: number; // Heure du post (0-71)
  followers: number; // Nombre de followers (scrapé)
  // Optionnel si on scrape plus
  engagementRate?: number; // Taux d'engagement moyen
  avgLikes?: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  // Configuration baseline
  baselineHourlyRevenue: number;
  baselineVariance: number;
  dayOfWeekPattern: number[]; // 24 valeurs pour pattern horaire
  // Contexte externe (qu'on ne connait pas forcément)
  momentumPeriods: { startHour: number; endHour: number; multiplier: number; name: string }[];
  // Influenceurs
  influencers: InfluencerEvent[];
  // Impact réel (pour simulation uniquement - on ne le connait pas en vrai)
  trueInfluencerImpacts: { [influencerId: string]: number }; // Impact réel par influenceur
}

// ============================================================================
// ATTRIBUTION INTER-INFLUENCEURS
// ============================================================================

/**
 * Modèle d'attribution entre influenceurs
 *
 * Quand plusieurs influenceurs postent, comment répartir l'uplift ?
 *
 * Facteurs pris en compte:
 * 1. TIMING: Proximité temporelle entre le post et le pic de ventes
 * 2. AUDIENCE: Nombre de followers (proxy de reach potentiel)
 * 3. DECAY: L'effet diminue avec le temps depuis le post
 * 4. OVERLAP: Pénalité si plusieurs posts très proches
 */

export interface InfluencerAttribution {
  influencerId: string;
  username: string;
  followers: number;
  postHour: number;

  // Scores (0-100)
  timingScore: number;      // Corrélation timing post → uplift
  audienceScore: number;    // Poids relatif de l'audience
  decayScore: number;       // Fraicheur du post

  // Attribution finale
  attributionShare: number; // % de l'uplift attribué (0-1)
  attributedRevenue: number; // € attribué

  // Confiance
  confidence: number;       // 0-100
  confidenceFactors: {
    timingClarity: number;  // Signal temporel clair ?
    audienceWeight: number; // Audience significative ?
    noOverlap: number;      // Pas de chevauchement ?
  };
}

export interface AttributionResult {
  // Uplift global
  totalUplift: number;           // € total au-dessus de la baseline
  upliftConfidence: number;      // Confiance dans l'uplift global

  // Attribution par influenceur
  influencerAttributions: InfluencerAttribution[];

  // Méta-analyse
  attributionMethod: string;
  warnings: string[];
}

/**
 * Calcule l'attribution entre plusieurs influenceurs
 */
export function calculateInfluencerAttribution(
  hourlyData: HourlyDataPoint[],
  baseline: number[],
  influencers: InfluencerEvent[]
): AttributionResult {
  const warnings: string[] = [];

  // 1. Calculer l'uplift total
  const totalActual = hourlyData.reduce((s, d) => s + d.revenue, 0);
  const totalBaseline = baseline.reduce((s, b) => s + b, 0);
  const totalUplift = Math.max(0, totalActual - totalBaseline);

  // Si pas d'uplift, pas d'attribution
  if (totalUplift <= 0) {
    return {
      totalUplift: 0,
      upliftConfidence: 0,
      influencerAttributions: influencers.map(inf => ({
        influencerId: inf.id,
        username: inf.username,
        followers: inf.followers,
        postHour: inf.postHour,
        timingScore: 0,
        audienceScore: 0,
        decayScore: 0,
        attributionShare: 0,
        attributedRevenue: 0,
        confidence: 0,
        confidenceFactors: { timingClarity: 0, audienceWeight: 0, noOverlap: 0 },
      })),
      attributionMethod: 'none',
      warnings: ['Pas d\'uplift détecté par rapport à la baseline'],
    };
  }

  // 2. Calculer les scores pour chaque influenceur
  const attributions: InfluencerAttribution[] = [];
  const totalFollowers = influencers.reduce((s, inf) => s + inf.followers, 0);

  for (const inf of influencers) {
    // --- TIMING SCORE ---
    // Mesure la corrélation entre le post et l'uplift observé
    const timingScore = calculateTimingScore(hourlyData, baseline, inf.postHour);

    // --- AUDIENCE SCORE ---
    // Poids relatif de l'audience (log scale pour éviter que 1M domine tout)
    const logFollowers = Math.log10(inf.followers + 1);
    const maxLogFollowers = Math.log10(Math.max(...influencers.map(i => i.followers)) + 1);
    const audienceScore = (logFollowers / maxLogFollowers) * 100;

    // --- DECAY SCORE ---
    // Plus le post est récent par rapport à la fin de la période, plus le score est haut
    const hoursActive = 72 - inf.postHour;
    const decayScore = Math.min(100, (hoursActive / 72) * 100 + 20); // Bonus pour avoir posté

    // --- OVERLAP PENALTY ---
    // Vérifier si d'autres influenceurs ont posté proche
    const closeInfluencers = influencers.filter(
      other => other.id !== inf.id && Math.abs(other.postHour - inf.postHour) <= 4
    );
    const overlapPenalty = closeInfluencers.length > 0 ? 0.7 : 1.0;

    if (closeInfluencers.length > 0) {
      warnings.push(`${inf.username} a posté proche de ${closeInfluencers.map(i => i.username).join(', ')} - attribution incertaine`);
    }

    // --- CONFIDENCE FACTORS ---
    const timingClarity = timingScore > 50 ? 80 : timingScore > 30 ? 50 : 20;
    const audienceWeight = inf.followers > 100000 ? 80 : inf.followers > 10000 ? 60 : 40;
    const noOverlap = overlapPenalty === 1.0 ? 90 : 40;

    attributions.push({
      influencerId: inf.id,
      username: inf.username,
      followers: inf.followers,
      postHour: inf.postHour,
      timingScore,
      audienceScore,
      decayScore,
      attributionShare: 0, // Calculé après
      attributedRevenue: 0, // Calculé après
      confidence: 0, // Calculé après
      confidenceFactors: { timingClarity, audienceWeight, noOverlap },
    });
  }

  // 3. Calculer les parts d'attribution
  // Formule: weighted score = timing * 0.5 + audience * 0.3 + decay * 0.2
  const weightedScores = attributions.map(a => ({
    id: a.influencerId,
    score: a.timingScore * 0.5 + a.audienceScore * 0.3 + a.decayScore * 0.2,
  }));

  const totalWeightedScore = weightedScores.reduce((s, w) => s + w.score, 0);

  for (const attr of attributions) {
    const ws = weightedScores.find(w => w.id === attr.influencerId)!;
    attr.attributionShare = totalWeightedScore > 0 ? ws.score / totalWeightedScore : 0;
    attr.attributedRevenue = totalUplift * attr.attributionShare;

    // Confiance = moyenne des facteurs
    attr.confidence = Math.round(
      (attr.confidenceFactors.timingClarity +
       attr.confidenceFactors.audienceWeight +
       attr.confidenceFactors.noOverlap) / 3
    );
  }

  // 4. Confiance globale dans l'uplift
  const upliftConfidence = calculateUpliftConfidence(hourlyData, baseline, influencers);

  return {
    totalUplift,
    upliftConfidence,
    influencerAttributions: attributions,
    attributionMethod: 'weighted-timing-audience',
    warnings,
  };
}

/**
 * Calcule le score de timing pour un influenceur
 * Mesure si l'uplift observé corrèle avec le moment du post
 */
function calculateTimingScore(
  hourlyData: HourlyDataPoint[],
  baseline: number[],
  postHour: number
): number {
  // Calculer l'uplift par heure
  const hourlyUplift = hourlyData.map((d, i) => d.revenue - baseline[i]);

  // Fenêtre d'impact attendue: 0-24h après le post
  const impactWindow = 24;
  const windowStart = postHour;
  const windowEnd = Math.min(72, postHour + impactWindow);

  // Uplift dans la fenêtre d'impact
  const windowUplift = hourlyUplift.slice(windowStart, windowEnd);
  const avgWindowUplift = windowUplift.reduce((s, u) => s + u, 0) / windowUplift.length;

  // Uplift hors fenêtre (avant le post)
  const preUplift = hourlyUplift.slice(0, postHour);
  const avgPreUplift = preUplift.length > 0
    ? preUplift.reduce((s, u) => s + u, 0) / preUplift.length
    : 0;

  // Score: différence normalisée
  const baselineAvg = baseline.reduce((s, b) => s + b, 0) / baseline.length;
  const upliftRatio = (avgWindowUplift - avgPreUplift) / (baselineAvg || 1);

  // Convertir en score 0-100
  // upliftRatio de 0.3 (30% d'uplift) = score de 100
  return Math.min(100, Math.max(0, upliftRatio * 333));
}

/**
 * Calcule la confiance dans l'uplift global
 */
function calculateUpliftConfidence(
  hourlyData: HourlyDataPoint[],
  baseline: number[],
  influencers: InfluencerEvent[]
): number {
  if (influencers.length === 0) return 0;

  // Facteur 1: Amplitude de l'uplift
  const totalActual = hourlyData.reduce((s, d) => s + d.revenue, 0);
  const totalBaseline = baseline.reduce((s, b) => s + b, 0);
  const upliftRatio = (totalActual - totalBaseline) / totalBaseline;
  const amplitudeScore = Math.min(100, upliftRatio * 200); // 50% uplift = 100

  // Facteur 2: Clarté du signal temporel
  // Y a-t-il un pic clair après les posts ?
  let clarityScore = 0;
  for (const inf of influencers) {
    const postHour = inf.postHour;
    const windowAfter = hourlyData.slice(postHour, Math.min(72, postHour + 12));
    const windowBefore = hourlyData.slice(Math.max(0, postHour - 6), postHour);

    if (windowBefore.length > 0 && windowAfter.length > 0) {
      const avgBefore = windowBefore.reduce((s, d) => s + d.revenue, 0) / windowBefore.length;
      const avgAfter = windowAfter.reduce((s, d) => s + d.revenue, 0) / windowAfter.length;
      if (avgAfter > avgBefore * 1.1) { // Au moins 10% de hausse
        clarityScore += 100 / influencers.length;
      }
    }
  }

  // Facteur 3: Pas trop de bruit
  const hourlyUplift = hourlyData.map((d, i) => d.revenue - baseline[i]);
  const variance = calculateVariance(hourlyUplift);
  const mean = hourlyUplift.reduce((s, u) => s + u, 0) / hourlyUplift.length;
  const cv = Math.sqrt(variance) / (Math.abs(mean) || 1); // Coefficient de variation
  const noiseScore = Math.max(0, 100 - cv * 50); // Moins de variance = meilleur score

  return Math.round((amplitudeScore * 0.4 + clarityScore * 0.4 + noiseScore * 0.2));
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
}

// ============================================================================
// MÉTHODE 1: DIFFERENCE-IN-DIFFERENCES (DiD)
// ============================================================================

export interface DiDResult {
  prePostAvg: number;
  postPostAvg: number;
  preExpectedAvg: number;
  postExpectedAvg: number;
  observedChange: number;
  expectedChange: number;
  didEstimate: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  significant: boolean;
  ci95Lower: number;
  ci95Upper: number;
}

export function calculateDiD(
  hourlyData: HourlyDataPoint[],
  baseline: number[],
  postHour: number,
  windowSize: number = 6
): DiDResult {
  const preStart = Math.max(0, postHour - windowSize);
  const preEnd = postHour;
  const preData = hourlyData.slice(preStart, preEnd);
  const preBaseline = baseline.slice(preStart, preEnd);

  const postStart = postHour;
  const postEnd = Math.min(hourlyData.length, postHour + windowSize);
  const postData = hourlyData.slice(postStart, postEnd);
  const postBaseline = baseline.slice(postStart, postEnd);

  const prePostAvg = preData.reduce((s, d) => s + d.revenue, 0) / preData.length;
  const postPostAvg = postData.reduce((s, d) => s + d.revenue, 0) / postData.length;
  const preExpectedAvg = preBaseline.reduce((s, b) => s + b, 0) / preBaseline.length;
  const postExpectedAvg = postBaseline.reduce((s, b) => s + b, 0) / postBaseline.length;

  const observedChange = postPostAvg - prePostAvg;
  const expectedChange = postExpectedAvg - preExpectedAvg;
  const didEstimate = observedChange - expectedChange;

  const allPre = preData.map((d, i) => d.revenue - preBaseline[i]);
  const allPost = postData.map((d, i) => d.revenue - postBaseline[i]);
  const variancePre = allPre.reduce((s, x) => s + Math.pow(x - (prePostAvg - preExpectedAvg), 2), 0) / (allPre.length - 1);
  const variancePost = allPost.reduce((s, x) => s + Math.pow(x - (postPostAvg - postExpectedAvg), 2), 0) / (allPost.length - 1);
  const standardError = Math.sqrt(variancePre / allPre.length + variancePost / allPost.length) || 1;

  const tStatistic = didEstimate / standardError;
  const pValue = 2 * (1 - normalCDF(Math.abs(tStatistic)));

  const ci95Lower = didEstimate - 1.96 * standardError;
  const ci95Upper = didEstimate + 1.96 * standardError;

  return {
    prePostAvg,
    postPostAvg,
    preExpectedAvg,
    postExpectedAvg,
    observedChange,
    expectedChange,
    didEstimate,
    standardError,
    tStatistic,
    pValue,
    significant: pValue < 0.05,
    ci95Lower,
    ci95Upper,
  };
}

// ============================================================================
// MÉTHODE 2: INTERRUPTED TIME SERIES (ITS)
// ============================================================================

/**
 * Interrupted Time Series Analysis
 *
 * Principe: Modéliser la tendance AVANT l'intervention (post),
 * puis mesurer le changement de NIVEAU et de PENTE après.
 *
 * Modèle: Y = β0 + β1*time + β2*intervention + β3*time_after_intervention
 *
 * - β2 = changement de niveau immédiat (jump)
 * - β3 = changement de pente (accélération/décélération)
 *
 * Avantages:
 * - Spécifiquement conçu pour mesurer l'effet d'une intervention
 * - Donne des estimations claires du "avant/après"
 * - Robuste aux tendances préexistantes
 */

export interface ITSResult {
  // Coefficients du modèle
  baselineLevel: number;      // β0: niveau de base
  baselineTrend: number;      // β1: pente avant intervention
  levelChange: number;        // β2: saut de niveau après le post
  trendChange: number;        // β3: changement de pente

  // Statistiques
  levelChangeSignificant: boolean;
  trendChangeSignificant: boolean;
  rSquared: number;           // Qualité du fit

  // Effet estimé
  immediateEffect: number;    // Effet immédiat en €
  sustainedEffect: number;    // Effet soutenu (sur 24h)
  totalEffect: number;        // Effet total cumulé

  // Confiance
  confidenceScore: number;    // 0-100
}

export function calculateITS(
  hourlyData: HourlyDataPoint[],
  baseline: number[],
  postHour: number
): ITSResult {
  // Préparer les données pour la régression
  const n = hourlyData.length;
  const preData = hourlyData.slice(0, postHour);
  const postData = hourlyData.slice(postHour);

  // Variables pour régression
  // Y = revenue - baseline (pour isoler l'effet)
  const y = hourlyData.map((d, i) => d.revenue - baseline[i]);

  // time: 0, 1, 2, ... (centré sur le post)
  const time = hourlyData.map((_, i) => i - postHour);

  // intervention: 0 avant, 1 après
  const intervention: number[] = hourlyData.map((_, i) => i >= postHour ? 1 : 0);

  // time_after: 0 avant, puis 1, 2, 3... après
  const timeAfter = hourlyData.map((_, i) => i >= postHour ? i - postHour : 0);

  // Régression linéaire multiple simplifiée (méthode des moindres carrés)
  // On calcule les coefficients via les formules normales

  // Moyennes
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const meanTime = time.reduce((s, v) => s + v, 0) / n;
  const meanInt = intervention.reduce((s, v) => s + v, 0) / n;
  const meanTimeAfter = timeAfter.reduce((s, v) => s + v, 0) / n;

  // Calcul simplifié des coefficients (régression en 2 parties)

  // Tendance avant le post
  const preTrend = preData.length > 1
    ? linearRegression(preData.map((_, i) => i), preData.map((d, i) => d.revenue - baseline[i]))
    : { slope: 0, intercept: 0 };

  // Tendance après le post
  const postTrend = postData.length > 1
    ? linearRegression(postData.map((_, i) => i), postData.map((d, i) => d.revenue - baseline[postHour + i]))
    : { slope: 0, intercept: 0 };

  // Coefficients
  const baselineLevel = preTrend.intercept;
  const baselineTrend = preTrend.slope;
  const levelChange = postTrend.intercept - (baselineLevel + baselineTrend * postHour);
  const trendChange = postTrend.slope - baselineTrend;

  // Calcul R² (variance expliquée)
  const predicted = hourlyData.map((_, i) => {
    if (i < postHour) {
      return baselineLevel + baselineTrend * i;
    } else {
      return baselineLevel + baselineTrend * i + levelChange + trendChange * (i - postHour);
    }
  });

  const ssRes = y.reduce((s, yi, i) => s + Math.pow(yi - predicted[i], 2), 0);
  const ssTot = y.reduce((s, yi) => s + Math.pow(yi - meanY, 2), 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Significativité (basée sur l'amplitude relative)
  const baselineAvg = baseline.reduce((s, b) => s + b, 0) / baseline.length;
  const levelChangeSignificant = Math.abs(levelChange) > baselineAvg * 0.1; // >10% de la baseline
  const trendChangeSignificant = Math.abs(trendChange) > baselineAvg * 0.02; // Pente significative

  // Effets estimés
  const immediateEffect = Math.max(0, levelChange);
  const sustainedEffect = Math.max(0, levelChange + trendChange * 12); // Effet à H+12
  const totalEffect = postData.reduce((s, d, i) => {
    const expectedWithoutPost = baselineLevel + baselineTrend * (postHour + i);
    const actual = d.revenue - baseline[postHour + i];
    return s + Math.max(0, actual - expectedWithoutPost);
  }, 0);

  // Score de confiance
  let confidenceScore = 30; // Base

  // Bonus si changement de niveau significatif
  if (levelChangeSignificant && levelChange > 0) {
    confidenceScore += 25;
  }

  // Bonus si tendance positive après
  if (trendChange > 0 || (trendChange > -baselineTrend && levelChange > 0)) {
    confidenceScore += 15;
  }

  // Bonus si bon R²
  if (rSquared > 0.5) confidenceScore += 15;
  if (rSquared > 0.7) confidenceScore += 10;

  // Cap à 75 (sans preuve directe)
  confidenceScore = Math.min(75, Math.max(0, confidenceScore));

  return {
    baselineLevel,
    baselineTrend,
    levelChange,
    trendChange,
    levelChangeSignificant,
    trendChangeSignificant,
    rSquared,
    immediateEffect,
    sustainedEffect,
    totalEffect,
    confidenceScore,
  };
}

// Régression linéaire simple
function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0 };

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 0.0001) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ============================================================================
// MÉTHODE 3: CAUSAL IMPACT
// ============================================================================

export interface CausalImpactResult {
  actual: number[];
  predicted: number[];
  lowerBound: number[];
  upperBound: number[];
  cumulativeActual: number;
  cumulativePredicted: number;
  cumulativeEffect: number;
  cumulativeEffectLower: number;
  cumulativeEffectUpper: number;
  relativeEffect: number;
  relativeEffectLower: number;
  relativeEffectUpper: number;
  probabilityCausal: number;
}

export function calculateCausalImpact(
  hourlyData: HourlyDataPoint[],
  postHour: number,
  preTrainingHours: number = 24
): CausalImpactResult {
  const trainingStart = Math.max(0, postHour - preTrainingHours);
  const trainingData = hourlyData.slice(trainingStart, postHour);

  const hourlyPatterns: { mean: number; std: number }[] = Array(24).fill(null).map(() => ({ mean: 0, std: 0 }));
  const hourlyValues: number[][] = Array(24).fill(null).map(() => []);

  trainingData.forEach((d, i) => {
    const hourOfDay = (trainingStart + i) % 24;
    hourlyValues[hourOfDay].push(d.revenue);
  });

  hourlyPatterns.forEach((_, hourOfDay) => {
    const values = hourlyValues[hourOfDay];
    if (values.length > 0) {
      hourlyPatterns[hourOfDay].mean = values.reduce((s, v) => s + v, 0) / values.length;
      hourlyPatterns[hourOfDay].std = Math.sqrt(
        values.reduce((s, v) => s + Math.pow(v - hourlyPatterns[hourOfDay].mean, 2), 0) / values.length
      ) || hourlyPatterns[hourOfDay].mean * 0.2;
    }
  });

  const actual: number[] = [];
  const predicted: number[] = [];
  const lowerBound: number[] = [];
  const upperBound: number[] = [];

  hourlyData.forEach((d, i) => {
    const hourOfDay = i % 24;
    const pattern = hourlyPatterns[hourOfDay];
    actual.push(d.revenue);
    predicted.push(pattern.mean);
    lowerBound.push(pattern.mean - 1.96 * pattern.std);
    upperBound.push(pattern.mean + 1.96 * pattern.std);
  });

  const postActual = actual.slice(postHour);
  const postPredicted = predicted.slice(postHour);
  const postLower = lowerBound.slice(postHour);
  const postUpper = upperBound.slice(postHour);

  const cumulativeActual = postActual.reduce((s, v) => s + v, 0);
  const cumulativePredicted = postPredicted.reduce((s, v) => s + v, 0);
  const cumulativeEffect = cumulativeActual - cumulativePredicted;

  const cumulativeStd = Math.sqrt(
    postPredicted.reduce((s, _, i) => s + Math.pow((postUpper[i] - postLower[i]) / 3.92, 2), 0)
  );
  const cumulativeEffectLower = cumulativeEffect - 1.96 * cumulativeStd;
  const cumulativeEffectUpper = cumulativeEffect + 1.96 * cumulativeStd;

  const relativeEffect = cumulativePredicted > 0 ? (cumulativeEffect / cumulativePredicted) * 100 : 0;
  const relativeEffectLower = cumulativePredicted > 0 ? (cumulativeEffectLower / cumulativePredicted) * 100 : 0;
  const relativeEffectUpper = cumulativePredicted > 0 ? (cumulativeEffectUpper / cumulativePredicted) * 100 : 0;

  const zScore = cumulativeEffect / (cumulativeStd || 1);
  const probabilityCausal = normalCDF(zScore);

  return {
    actual,
    predicted,
    lowerBound,
    upperBound,
    cumulativeActual,
    cumulativePredicted,
    cumulativeEffect,
    cumulativeEffectLower,
    cumulativeEffectUpper,
    relativeEffect,
    relativeEffectLower,
    relativeEffectUpper,
    probabilityCausal,
  };
}

// ============================================================================
// COMBINAISON DES SCORES
// ============================================================================

export interface CombinedConfidence {
  didConfidence: number;
  itsConfidence: number;
  causalConfidence: number;
  combinedScore: number;
  interpretation: string;
  methods: {
    name: string;
    score: number;
    weight: number;
    explanation: string;
  }[];
}

export function combineConfidenceScores(
  did: DiDResult,
  its: ITSResult,
  causal: CausalImpactResult
): CombinedConfidence {
  const didConfidence = Math.max(0, Math.min(100, (1 - did.pValue) * 100));
  const itsConfidence = its.confidenceScore;
  const causalConfidence = Math.round(causal.probabilityCausal * 100);

  // Pondération: ITS et Causal Impact sont les plus adaptés pour les séries temporelles
  const weights = [0.30, 0.35, 0.35]; // DiD, ITS, Causal

  const combinedScore = Math.round(
    weights[0] * didConfidence +
    weights[1] * itsConfidence +
    weights[2] * causalConfidence
  );

  let interpretation: string;
  if (combinedScore >= 70) {
    interpretation = "Haute confiance - Les 3 méthodes détectent un signal clair après le post";
  } else if (combinedScore >= 50) {
    interpretation = "Confiance modérée - Signal temporel présent, corrélation probable avec le post";
  } else if (combinedScore >= 30) {
    interpretation = "Confiance faible - Signal faible ou contexte bruité, prudence recommandée";
  } else {
    interpretation = "Confiance très faible - Pas de signal clair détecté après le post";
  }

  return {
    didConfidence,
    itsConfidence,
    causalConfidence,
    combinedScore,
    interpretation,
    methods: [
      {
        name: "Difference-in-Differences",
        score: didConfidence,
        weight: weights[0],
        explanation: did.significant
          ? `Effet significatif (p=${did.pValue.toFixed(3)}), uplift de ${did.didEstimate.toFixed(0)}€/h`
          : `Effet non significatif (p=${did.pValue.toFixed(3)})`,
      },
      {
        name: "Interrupted Time Series",
        score: itsConfidence,
        weight: weights[1],
        explanation: its.levelChangeSignificant
          ? `Saut de niveau: +${its.levelChange.toFixed(0)}€/h, R²=${(its.rSquared * 100).toFixed(0)}%`
          : `Pas de changement de niveau significatif (R²=${(its.rSquared * 100).toFixed(0)}%)`,
      },
      {
        name: "Causal Impact",
        score: causalConfidence,
        weight: weights[2],
        explanation: `Effet cumulatif: ${causal.cumulativeEffect.toFixed(0)}€ (${causal.relativeEffect.toFixed(1)}%). Prob: ${(causal.probabilityCausal * 100).toFixed(0)}%`,
      },
    ],
  };
}

// ============================================================================
// SIMULATION DE SCÉNARIOS
// ============================================================================

export function simulateScenario(scenario: SimulationScenario): HourlyDataPoint[] {
  const data: HourlyDataPoint[] = [];

  for (let hour = 0; hour < 72; hour++) {
    const hourOfDay = hour % 24;
    const dayPattern = scenario.dayOfWeekPattern[hourOfDay];

    let revenue = scenario.baselineHourlyRevenue * dayPattern;
    revenue *= (1 + (Math.random() - 0.5) * scenario.baselineVariance);

    // Appliquer momentum
    for (const momentum of scenario.momentumPeriods) {
      if (hour >= momentum.startHour && hour <= momentum.endHour) {
        revenue *= momentum.multiplier;
      }
    }

    // Appliquer effet influenceur (chaque influenceur a son propre impact)
    for (const inf of scenario.influencers) {
      if (hour >= inf.postHour) {
        const hoursSincePost = hour - inf.postHour;
        const impactDuration = 24; // 24h d'impact

        if (hoursSincePost <= impactDuration) {
          const decay = Math.exp(-0.12 * hoursSincePost);
          const trueImpact = scenario.trueInfluencerImpacts[inf.id] || 0.2;
          // Pondérer par la taille d'audience (log scale)
          const audienceFactor = Math.log10(inf.followers) / 6; // 1M followers = factor 1
          const impact = trueImpact * decay * audienceFactor;
          revenue *= (1 + impact);
        }
      }
    }

    const orders = Math.round(revenue / 80);

    data.push({
      hour,
      timestamp: new Date(Date.now() + hour * 60 * 60 * 1000),
      revenue: Math.round(revenue),
      orders,
    });
  }

  return data;
}

export function generateBaseline(scenario: SimulationScenario): number[] {
  return Array(72).fill(0).map((_, hour) => {
    const hourOfDay = hour % 24;
    let baseline = scenario.baselineHourlyRevenue * scenario.dayOfWeekPattern[hourOfDay];

    for (const momentum of scenario.momentumPeriods) {
      if (hour >= momentum.startHour && hour <= momentum.endHour) {
        baseline *= momentum.multiplier;
      }
    }

    return Math.round(baseline);
  });
}

// ============================================================================
// 28 SCÉNARIOS DE TEST (SANS CODE PROMO)
// ============================================================================

export function generateAdvancedScenarios(): SimulationScenario[] {
  const typicalHourlyPattern = [
    0.3, 0.2, 0.15, 0.1, 0.1, 0.15,
    0.3, 0.5, 0.7, 0.9, 1.0, 1.1,
    1.2, 1.1, 1.0, 0.95, 1.0, 1.1,
    1.2, 1.3, 1.35, 1.2, 0.9, 0.5,
  ];

  const weekendPattern = [
    0.4, 0.3, 0.2, 0.15, 0.15, 0.2,
    0.4, 0.6, 0.8, 1.0, 1.2, 1.3,
    1.4, 1.3, 1.2, 1.1, 1.0, 0.9,
    0.8, 0.9, 1.0, 1.1, 0.8, 0.5,
  ];

  const b2bPattern = [
    0.1, 0.05, 0.05, 0.05, 0.05, 0.1,
    0.3, 0.6, 0.9, 1.2, 1.3, 1.2,
    1.1, 1.0, 1.1, 1.2, 1.0, 0.7,
    0.4, 0.2, 0.1, 0.1, 0.1, 0.1,
  ];

  const internationalPattern = [
    0.4, 0.5, 0.6, 0.7, 0.6, 0.5,
    0.3, 0.2, 0.15, 0.15, 0.2, 0.3,
    0.4, 0.5, 0.7, 0.9, 1.1, 1.3,
    1.4, 1.3, 1.2, 1.0, 0.8, 0.6,
  ];

  return [
    // === SCÉNARIOS SIMPLES ===

    // 1. Cas idéal - 1 influenceur, signal clair
    {
      id: 'ideal-single',
      name: '1 influenceur - signal clair',
      description: 'Un influenceur 500K followers poste à H+6, baseline stable',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.12,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'emma_lifestyle', postHour: 6, followers: 500000 },
      ],
      trueInfluencerImpacts: { inf1: 0.35 },
    },

    // 2. Petit influenceur
    {
      id: 'small-influencer',
      name: 'Petit influenceur 20K',
      description: 'Micro-influenceur avec 20K followers',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'micro_julie', postHour: 10, followers: 20000 },
      ],
      trueInfluencerImpacts: { inf1: 0.15 },
    },

    // 3. Mega influenceur 2M
    {
      id: 'mega-influencer',
      name: 'Mega influenceur 2M',
      description: 'Star avec 2M followers, fort impact',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'mega_star', postHour: 10, followers: 2000000 },
      ],
      trueInfluencerImpacts: { inf1: 0.60 },
    },

    // 4. Post de nuit
    {
      id: 'night-post',
      name: 'Post à 3h du matin',
      description: 'Mauvais timing, audience endormie',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'night_owl', postHour: 3, followers: 300000 },
      ],
      trueInfluencerImpacts: { inf1: 0.12 },
    },

    // 5. Contrôle - pas d'influenceur
    {
      id: 'control-none',
      name: 'Contrôle - aucun influenceur',
      description: 'Juste la baseline, pour vérifier les faux positifs',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [],
      trueInfluencerImpacts: {},
    },

    // === SCÉNARIOS MULTI-INFLUENCEURS ===

    // 6. 2 influenceurs séquentiels
    {
      id: 'two-sequential',
      name: '2 influenceurs séquentiels',
      description: 'Premier à H+4, second à H+28 (24h après)',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'first_poster', postHour: 4, followers: 400000 },
        { id: 'inf2', username: 'second_poster', postHour: 28, followers: 300000 },
      ],
      trueInfluencerImpacts: { inf1: 0.30, inf2: 0.25 },
    },

    // 7. 2 influenceurs simultanés (overlap)
    {
      id: 'two-overlap',
      name: '2 influenceurs simultanés',
      description: 'Postent à 2h d\'intervalle - attribution difficile',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'sarah_mode', postHour: 10, followers: 350000 },
        { id: 'inf2', username: 'alex_tech', postHour: 12, followers: 280000 },
      ],
      trueInfluencerImpacts: { inf1: 0.25, inf2: 0.20 },
    },

    // 8. 3 influenceurs en vague
    {
      id: 'three-wave',
      name: '3 influenceurs en vague',
      description: 'Posts à H+6, H+18, H+36',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'wave1_emma', postHour: 6, followers: 450000 },
        { id: 'inf2', username: 'wave2_lucas', postHour: 18, followers: 320000 },
        { id: 'inf3', username: 'wave3_marie', postHour: 36, followers: 280000 },
      ],
      trueInfluencerImpacts: { inf1: 0.28, inf2: 0.22, inf3: 0.18 },
    },

    // 9. 5 micro-influenceurs
    {
      id: 'five-micro',
      name: '5 micro-influenceurs',
      description: 'Stratégie micro: 5 petits (15-50K) en 6h',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'micro_anna', postHour: 8, followers: 25000 },
        { id: 'inf2', username: 'micro_ben', postHour: 9, followers: 35000 },
        { id: 'inf3', username: 'micro_clara', postHour: 10, followers: 18000 },
        { id: 'inf4', username: 'micro_david', postHour: 11, followers: 42000 },
        { id: 'inf5', username: 'micro_eva', postHour: 12, followers: 30000 },
      ],
      trueInfluencerImpacts: {
        inf1: 0.08, inf2: 0.10, inf3: 0.06, inf4: 0.12, inf5: 0.09
      },
    },

    // 10. Hybride: 1 mega + 3 micro
    {
      id: 'hybrid-mega-micro',
      name: '1 mega + 3 micro',
      description: 'Le mega lance, les micro relaient',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'big_boss', postHour: 8, followers: 1200000 },
        { id: 'inf2', username: 'relay_1', postHour: 14, followers: 45000 },
        { id: 'inf3', username: 'relay_2', postHour: 20, followers: 38000 },
        { id: 'inf4', username: 'relay_3', postHour: 32, followers: 52000 },
      ],
      trueInfluencerImpacts: { inf1: 0.45, inf2: 0.08, inf3: 0.07, inf4: 0.09 },
    },

    // 11. Audiences très différentes
    {
      id: 'audience-disparity',
      name: 'Disparité d\'audience 100x',
      description: '1M vs 10K - qui a le plus d\'impact ?',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'big_one', postHour: 10, followers: 1000000 },
        { id: 'inf2', username: 'tiny_one', postHour: 14, followers: 10000 },
      ],
      trueInfluencerImpacts: { inf1: 0.40, inf2: 0.05 },
    },

    // 12. 4 influenceurs relais 72h
    {
      id: 'relay-72h',
      name: 'Relais complet 72h',
      description: '4 influenceurs, 1 toutes les 18h',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'relay_h0', postHour: 2, followers: 380000 },
        { id: 'inf2', username: 'relay_h18', postHour: 18, followers: 420000 },
        { id: 'inf3', username: 'relay_h36', postHour: 36, followers: 350000 },
        { id: 'inf4', username: 'relay_h54', postHour: 54, followers: 290000 },
      ],
      trueInfluencerImpacts: { inf1: 0.25, inf2: 0.28, inf3: 0.22, inf4: 0.18 },
    },

    // === SCÉNARIOS AVEC CONTEXTE DIFFICILE ===

    // 13. Black Friday
    {
      id: 'black-friday',
      name: 'Pendant Black Friday',
      description: 'Post pendant BF - signal noyé dans le bruit',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.25,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 0, endHour: 72, multiplier: 1.8, name: 'Black Friday' },
      ],
      influencers: [
        { id: 'inf1', username: 'bf_poster', postHour: 12, followers: 450000 },
      ],
      trueInfluencerImpacts: { inf1: 0.15 }, // Impact réduit car BF domine
    },

    // 14. Haute variance baseline
    {
      id: 'chaotic-baseline',
      name: 'Business chaotique',
      description: 'Variance ±40%, signal très difficile',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.40,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'chaos_fighter', postHour: 10, followers: 380000 },
      ],
      trueInfluencerImpacts: { inf1: 0.25 },
    },

    // 15. Flash sale simultanée
    {
      id: 'flash-sale',
      name: 'Flash sale en même temps',
      description: 'Post pendant une vente flash 4h',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.20,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 10, endHour: 14, multiplier: 2.2, name: 'Flash -50%' },
      ],
      influencers: [
        { id: 'inf1', username: 'flash_poster', postHour: 11, followers: 420000 },
      ],
      trueInfluencerImpacts: { inf1: 0.12 }, // Difficile à isoler
    },

    // 16. Concurrent en promo
    {
      id: 'competitor-promo',
      name: 'Concurrent fait -30%',
      description: 'Notre influenceur poste pendant promo concurrent',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.20,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 0, endHour: 48, multiplier: 0.85, name: 'Concurrent promo' },
      ],
      influencers: [
        { id: 'inf1', username: 'loyal_fighter', postHour: 12, followers: 520000 },
      ],
      trueInfluencerImpacts: { inf1: 0.35 }, // Compense partiellement
    },

    // 17. Lancement produit
    {
      id: 'product-launch',
      name: 'Lancement nouveau produit',
      description: 'Hype produit + influenceur',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.25,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 0, endHour: 72, multiplier: 1.4, name: 'Hype lancement' },
      ],
      influencers: [
        { id: 'inf1', username: 'launch_partner', postHour: 9, followers: 680000 },
      ],
      trueInfluencerImpacts: { inf1: 0.45 },
    },

    // 18. Post viral inattendu
    {
      id: 'viral-post',
      name: 'Post devient viral',
      description: 'Explosion de viralité après 12h',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 18, endHour: 48, multiplier: 1.6, name: 'Viralité' },
      ],
      influencers: [
        { id: 'inf1', username: 'accidental_viral', postHour: 6, followers: 280000 },
      ],
      trueInfluencerImpacts: { inf1: 0.50 },
    },

    // === SCÉNARIOS TIMING ===

    // 19. Week-end samedi
    {
      id: 'weekend-saturday',
      name: 'Post samedi matin',
      description: 'Audience détendue le week-end',
      baselineHourlyRevenue: 500,
      baselineVariance: 0.15,
      dayOfWeekPattern: weekendPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'weekend_vibes', postHour: 10, followers: 380000 },
      ],
      trueInfluencerImpacts: { inf1: 0.32 },
    },

    // 20. Post + rappel 24h après
    {
      id: 'post-reminder',
      name: 'Post + Rappel story',
      description: 'L\'influenceur reposte en story le lendemain',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'reminder_queen', postHour: 10, followers: 420000 },
        { id: 'inf1b', username: 'reminder_queen', postHour: 34, followers: 420000 }, // Rappel
      ],
      trueInfluencerImpacts: { inf1: 0.28, inf1b: 0.15 },
    },

    // 21. Effet retardé (slow burn)
    {
      id: 'slow-burn',
      name: 'Effet retardé',
      description: 'Contenu éducatif, effet sur 48h+',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'educator_pro', postHour: 6, followers: 320000 },
      ],
      trueInfluencerImpacts: { inf1: 0.18 }, // Plus faible mais plus long
    },

    // === SCÉNARIOS BUSINESS SPÉCIAUX ===

    // 22. B2B cycle long
    {
      id: 'b2b-long',
      name: 'B2B (LinkedIn)',
      description: 'Vente B2B, pattern bureau, effet sur plusieurs jours',
      baselineHourlyRevenue: 200,
      baselineVariance: 0.30,
      dayOfWeekPattern: b2bPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'b2b_expert', postHour: 9, followers: 85000 },
      ],
      trueInfluencerImpacts: { inf1: 0.35 },
    },

    // 23. Luxe (haut panier)
    {
      id: 'luxury',
      name: 'Produit luxe',
      description: 'Peu de ventes, panier 500€',
      baselineHourlyRevenue: 250,
      baselineVariance: 0.35,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'luxury_taste', postHour: 11, followers: 180000 },
      ],
      trueInfluencerImpacts: { inf1: 0.40 },
    },

    // 24. Saisonnier été
    {
      id: 'summer-peak',
      name: 'Pic estival (maillots)',
      description: 'Business saisonnier en été',
      baselineHourlyRevenue: 600,
      baselineVariance: 0.15,
      dayOfWeekPattern: [
        0.2, 0.15, 0.1, 0.1, 0.1, 0.15,
        0.3, 0.5, 0.8, 1.0, 1.2, 1.3,
        1.4, 1.5, 1.4, 1.2, 1.0, 0.9,
        0.8, 0.7, 0.6, 0.5, 0.4, 0.3,
      ],
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'summer_queen', postHour: 14, followers: 520000 },
      ],
      trueInfluencerImpacts: { inf1: 0.28 },
    },

    // 25. Audience internationale (US)
    {
      id: 'international-us',
      name: 'Audience US (décalage 6h)',
      description: 'Influenceur FR avec audience US',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.20,
      dayOfWeekPattern: internationalPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'global_reach', postHour: 15, followers: 680000 },
      ],
      trueInfluencerImpacts: { inf1: 0.30 },
    },

    // 26. Noël
    {
      id: 'christmas',
      name: 'Période Noël',
      description: 'Rush de Noël, baseline élevée',
      baselineHourlyRevenue: 700,
      baselineVariance: 0.25,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 0, endHour: 72, multiplier: 1.3, name: 'Rush Noël' },
      ],
      influencers: [
        { id: 'inf1', username: 'santa_helper', postHour: 12, followers: 450000 },
      ],
      trueInfluencerImpacts: { inf1: 0.18 },
    },

    // 27. Impact quasi nul
    {
      id: 'no-impact',
      name: 'Impact quasi nul',
      description: 'L\'influenceur n\'a aucun effet réel',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.20,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [],
      influencers: [
        { id: 'inf1', username: 'fake_engagement', postHour: 10, followers: 500000 },
      ],
      trueInfluencerImpacts: { inf1: 0.02 }, // Quasi rien
    },

    // 28. Campagne ultra-courte 6h
    {
      id: 'ultra-short',
      name: 'Campagne flash 6h',
      description: 'Offre limitée très courte',
      baselineHourlyRevenue: 400,
      baselineVariance: 0.15,
      dayOfWeekPattern: typicalHourlyPattern,
      momentumPeriods: [
        { startHour: 10, endHour: 16, multiplier: 1.5, name: 'Offre flash' },
      ],
      influencers: [
        { id: 'inf1', username: 'flash_queen', postHour: 10, followers: 480000 },
      ],
      trueInfluencerImpacts: { inf1: 0.55 },
    },
  ];
}

// ============================================================================
// UTILITAIRES MATHÉMATIQUES
// ============================================================================

function normalPDF(x: number, mean: number, std: number): number {
  const variance = std * std;
  return Math.exp(-Math.pow(x - mean, 2) / (2 * variance)) / (std * Math.sqrt(2 * Math.PI));
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
