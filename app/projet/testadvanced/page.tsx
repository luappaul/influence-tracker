'use client';

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  generateAdvancedScenarios,
  simulateScenario,
  generateBaseline,
  calculateInfluencerAttribution,
  calculateDiD,
  calculateITS,
  calculateCausalImpact,
  combineConfidenceScores,
  SimulationScenario,
  HourlyDataPoint,
  AttributionResult,
  CombinedConfidence,
} from '@/lib/attribution-advanced';

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

// Nombre de simulations pour le stress test
const NUM_SIMULATIONS = 1000;

export default function TestAdvancedPage() {
  const scenarios = useMemo(() => generateAdvancedScenarios(), []);
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);

  const scenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0],
    [scenarios, selectedScenarioId]
  );

  // === STRESS TEST GLOBAL: 1000 simulations ===
  const globalStats = useMemo(() => {
    const results: {
      scenarioId: string;
      scenarioName: string;
      trueImpact: number;
      detectedUplift: number;
      confidence: number;
      didSignificant: boolean;
      itsLevelChange: boolean;
      causalProb: number;
    }[] = [];

    // Répartir les 1000 simulations sur tous les scénarios
    const simsPerScenario = Math.floor(NUM_SIMULATIONS / scenarios.length);

    for (const sc of scenarios) {
      for (let i = 0; i < simsPerScenario; i++) {
        const data = simulateScenario(sc);
        const baselineData = generateBaseline(sc);
        const attr = calculateInfluencerAttribution(data, baselineData, sc.influencers);

        const firstPost = sc.influencers[0]?.postHour ?? 12;
        const did = calculateDiD(data, baselineData, firstPost);
        const its = calculateITS(data, baselineData, firstPost);
        const causal = calculateCausalImpact(data, firstPost);
        const combined = combineConfidenceScores(did, its, causal);

        // Impact réel moyen du scénario
        const trueImpactValues = Object.values(sc.trueInfluencerImpacts);
        const avgTrueImpact = trueImpactValues.length > 0
          ? trueImpactValues.reduce((s, v) => s + v, 0) / trueImpactValues.length
          : 0;

        results.push({
          scenarioId: sc.id,
          scenarioName: sc.name,
          trueImpact: avgTrueImpact,
          detectedUplift: attr.totalUplift,
          confidence: combined.combinedScore,
          didSignificant: did.significant,
          itsLevelChange: its.levelChangeSignificant,
          causalProb: causal.probabilityCausal,
        });
      }
    }

    // Calculer les statistiques globales
    const totalTests = results.length;

    // Seuils ajustés pour le nouveau modèle plus strict
    const CONFIDENCE_THRESHOLD = 40; // Seuil de détection
    const HIGH_IMPACT_THRESHOLD = 0.15; // Impact considéré comme "réel"
    const LOW_IMPACT_THRESHOLD = 0.05; // Impact considéré comme négligeable

    // Vrais positifs: impact significatif ET confiance suffisante
    const truePositives = results.filter(r => r.trueImpact >= HIGH_IMPACT_THRESHOLD && r.confidence >= CONFIDENCE_THRESHOLD).length;
    const highImpactCount = results.filter(r => r.trueImpact >= HIGH_IMPACT_THRESHOLD).length;
    const truePositiveRate = highImpactCount > 0 ? truePositives / highImpactCount : 0;

    // Faux positifs: impact faible MAIS confiance élevée
    const falsePositives = results.filter(r => r.trueImpact < LOW_IMPACT_THRESHOLD && r.confidence >= CONFIDENCE_THRESHOLD).length;
    const lowImpactCount = results.filter(r => r.trueImpact < LOW_IMPACT_THRESHOLD).length;
    const falsePositiveRate = lowImpactCount > 0 ? falsePositives / lowImpactCount : 0;

    // Vrais négatifs: impact faible ET confiance basse
    const trueNegatives = results.filter(r => r.trueImpact < LOW_IMPACT_THRESHOLD && r.confidence < CONFIDENCE_THRESHOLD).length;

    // Faux négatifs: impact significatif MAIS confiance basse
    const falseNegatives = results.filter(r => r.trueImpact >= HIGH_IMPACT_THRESHOLD && r.confidence < CONFIDENCE_THRESHOLD).length;

    // Confiance moyenne par catégorie d'impact
    const highImpactResults = results.filter(r => r.trueImpact >= 0.3);
    const mediumImpactResults = results.filter(r => r.trueImpact >= 0.1 && r.trueImpact < 0.3);
    const lowImpactResults = results.filter(r => r.trueImpact > 0 && r.trueImpact < 0.1);
    const noImpactResults = results.filter(r => r.trueImpact === 0);

    const avgConfidenceHigh = highImpactResults.length > 0
      ? highImpactResults.reduce((s, r) => s + r.confidence, 0) / highImpactResults.length
      : 0;
    const avgConfidenceMedium = mediumImpactResults.length > 0
      ? mediumImpactResults.reduce((s, r) => s + r.confidence, 0) / mediumImpactResults.length
      : 0;
    const avgConfidenceLow = lowImpactResults.length > 0
      ? lowImpactResults.reduce((s, r) => s + r.confidence, 0) / lowImpactResults.length
      : 0;
    const avgConfidenceNone = noImpactResults.length > 0
      ? noImpactResults.reduce((s, r) => s + r.confidence, 0) / noImpactResults.length
      : 0;

    // Stats par méthode
    const didSignificantRate = results.filter(r => r.didSignificant).length / totalTests;
    const itsDetectionRate = results.filter(r => r.itsLevelChange).length / totalTests;
    const causalHighProbRate = results.filter(r => r.causalProb > 0.7).length / totalTests;

    // Corrélation entre impact réel et confiance
    const correlation = calculateCorrelation(
      results.map(r => r.trueImpact),
      results.map(r => r.confidence)
    );

    return {
      totalTests,
      truePositives,
      truePositiveRate,
      falsePositives,
      falsePositiveRate,
      trueNegatives,
      falseNegatives,
      avgConfidenceHigh,
      avgConfidenceMedium,
      avgConfidenceLow,
      avgConfidenceNone,
      didSignificantRate,
      itsDetectionRate,
      causalHighProbRate,
      correlation,
      // Pour le graphique
      distributionData: [
        { category: 'Fort impact (>30%)', confidence: avgConfidenceHigh, count: highImpactResults.length },
        { category: 'Impact moyen (10-30%)', confidence: avgConfidenceMedium, count: mediumImpactResults.length },
        { category: 'Faible impact (<10%)', confidence: avgConfidenceLow, count: lowImpactResults.length },
        { category: 'Pas d\'impact', confidence: avgConfidenceNone, count: noImpactResults.length },
      ],
    };
  }, [scenarios]);

  // Simuler les données pour le scénario sélectionné
  const { hourlyData, baseline, attribution, combinedConfidence } = useMemo(() => {
    const data = simulateScenario(scenario);
    const baselineData = generateBaseline(scenario);

    // Attribution inter-influenceurs
    const attr = calculateInfluencerAttribution(data, baselineData, scenario.influencers);

    // Analyses statistiques pour le premier influenceur
    const firstPost = scenario.influencers[0]?.postHour ?? 12;
    const did = calculateDiD(data, baselineData, firstPost);

    // Interrupted Time Series
    const its = calculateITS(data, baselineData, firstPost);

    // Causal Impact
    const causal = calculateCausalImpact(data, firstPost);

    // Combiner les scores
    const combined = combineConfidenceScores(did, its, causal);

    return {
      hourlyData: data,
      baseline: baselineData,
      attribution: attr,
      combinedConfidence: combined,
    };
  }, [scenario]);

  // Données pour le graphique timeline
  const timelineData = useMemo(() => {
    return hourlyData.map((d, i) => ({
      hour: d.hour,
      label: `H${d.hour}`,
      actual: d.revenue,
      baseline: baseline[i],
      uplift: Math.max(0, d.revenue - baseline[i]),
    }));
  }, [hourlyData, baseline]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Attribution Model - Stress Test
          </h1>
          <p className="text-gray-400 text-sm">
            {NUM_SIMULATIONS} simulations sur {scenarios.length} scénarios
          </p>
        </div>

        {/* RECAP GLOBAL - 1000 tests */}
        <GlobalStatsCard stats={globalStats} />

        {/* Sélecteur de scénario */}
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="block text-sm text-gray-400 mb-2">Explorer un scénario ({scenarios.length} disponibles)</label>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            {scenarios.map((s, idx) => (
              <option key={s.id} value={s.id}>
                {idx + 1}. {s.name} - {s.description}
              </option>
            ))}
          </select>

          {/* Détails du scénario */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Influenceurs</div>
              <div className="text-xl font-bold text-blue-400">
                {scenario.influencers.length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Followers total</div>
              <div className="text-xl font-bold text-purple-400">
                {(scenario.influencers.reduce((s, i) => s + i.followers, 0) / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Baseline / heure</div>
              <div className="text-xl font-bold text-green-400">
                {scenario.baselineHourlyRevenue}€
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Variance</div>
              <div className="text-xl font-bold text-orange-400">
                ±{(scenario.baselineVariance * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Attribution globale */}
        <AttributionSummary attribution={attribution} combined={combinedConfidence} />

        {/* Attribution par influenceur */}
        {scenario.influencers.length > 0 && (
          <InfluencerAttributionCard attribution={attribution} scenario={scenario} />
        )}

        {/* Timeline 72h */}
        <TimelineChart
          data={timelineData}
          scenario={scenario}
        />

        {/* Méthodes statistiques */}
        <MethodsCard combined={combinedConfidence} />

        {/* Warnings */}
        {attribution.warnings.length > 0 && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
            <h3 className="font-bold text-amber-400 mb-2">Avertissements</h3>
            <ul className="space-y-1">
              {attribution.warnings.map((w, i) => (
                <li key={i} className="text-amber-200 text-sm">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Explications */}
        <PedagogicalSection />
      </div>
    </div>
  );
}

function AttributionSummary({
  attribution,
  combined,
}: {
  attribution: AttributionResult;
  combined: CombinedConfidence;
}) {
  const getColorClass = (score: number) => {
    if (score >= 75) return 'from-green-500 to-emerald-500';
    if (score >= 55) return 'from-blue-500 to-cyan-500';
    if (score >= 35) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold text-white mb-1">Résultat de l'Attribution</h2>
          <p className="text-gray-400 text-sm">{combined.interpretation}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-gray-400 text-xs">Uplift Total</div>
            <div className="text-2xl font-bold text-green-400">
              +{attribution.totalUplift.toLocaleString()}€
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-xs">Confiance</div>
            <div
              className={`text-3xl font-bold bg-gradient-to-r ${getColorClass(
                combined.combinedScore
              )} bg-clip-text text-transparent`}
            >
              {combined.combinedScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColorClass(combined.combinedScore)} transition-all duration-500`}
          style={{ width: `${combined.combinedScore}%` }}
        />
      </div>

      {/* Méthode d'attribution */}
      <div className="mt-4 bg-gray-800 rounded-lg p-3 text-sm">
        <span className="text-purple-400 font-medium">Méthode :</span>{' '}
        <span className="text-gray-300">
          Attribution basée sur la corrélation temporelle (timing des posts) et la taille d'audience (followers).
          3 méthodes statistiques sont combinées pour estimer la confiance.
        </span>
      </div>
    </div>
  );
}

function InfluencerAttributionCard({
  attribution,
  scenario,
}: {
  attribution: AttributionResult;
  scenario: SimulationScenario;
}) {
  // Données pour le pie chart
  const pieData = attribution.influencerAttributions.map((a, i) => ({
    name: a.username,
    value: a.attributedRevenue,
    share: a.attributionShare * 100,
  }));

  // Données pour le bar chart comparatif
  const barData = attribution.influencerAttributions.map((a) => ({
    username: a.username.length > 12 ? a.username.slice(0, 10) + '...' : a.username,
    timing: a.timingScore,
    audience: a.audienceScore,
    decay: a.decayScore,
    confidence: a.confidence,
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-white mb-4">
        Attribution par Influenceur
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div>
          <h3 className="text-sm text-gray-400 mb-3">Répartition de l'uplift</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, payload }) => `${name}: ${(payload?.share as number)?.toFixed(0) || 0}%`}
                labelLine={false}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${(value as number)?.toLocaleString() || 0}€`, 'Attribué']}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Score breakdown */}
        <div>
          <h3 className="text-sm text-gray-400 mb-3">Scores par facteur</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
              <YAxis dataKey="username" type="category" stroke="#9CA3AF" width={80} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="timing" fill="#3B82F6" name="Timing" stackId="a" />
              <Bar dataKey="audience" fill="#8B5CF6" name="Audience" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Détails par influenceur */}
      <div className="mt-6 space-y-3">
        {attribution.influencerAttributions.map((a, idx) => {
          const trueImpact = scenario.trueInfluencerImpacts[a.influencerId];
          return (
            <div key={a.influencerId} className="bg-gray-800 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-medium text-white">{a.username}</span>
                  <span className="text-gray-400 text-sm">
                    {(a.followers / 1000).toFixed(0)}K followers
                  </span>
                  <span className="text-gray-500 text-sm">
                    • Post H+{a.postHour}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Attribué</div>
                    <div className="font-bold text-green-400">
                      {a.attributedRevenue.toLocaleString()}€
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Part</div>
                    <div className="font-bold text-blue-400">
                      {(a.attributionShare * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Confiance</div>
                    <div className={`font-bold ${a.confidence >= 60 ? 'text-green-400' : a.confidence >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {a.confidence}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">Timing</div>
                  <div className="font-medium text-blue-400">{a.timingScore.toFixed(0)}/100</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">Audience</div>
                  <div className="font-medium text-purple-400">{a.audienceScore.toFixed(0)}/100</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-gray-400">Decay</div>
                  <div className="font-medium text-cyan-400">{a.decayScore.toFixed(0)}/100</div>
                </div>
              </div>

              {/* Impact réel (pour comparaison en simulation) */}
              {trueImpact !== undefined && (
                <div className="mt-2 text-xs text-gray-500">
                  Impact réel simulé: +{(trueImpact * 100).toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineChart({
  data,
  scenario,
}: {
  data: { hour: number; label: string; actual: number; baseline: number; uplift: number }[];
  scenario: SimulationScenario;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-white mb-2">Timeline 72 heures</h2>
      <p className="text-gray-400 text-sm mb-4">
        CA réel (bleu) vs baseline attendue (gris). L'uplift est la zone entre les deux.
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="label"
            stroke="#9CA3AF"
            tick={{ fontSize: 10 }}
            interval={5}
          />
          <YAxis stroke="#9CA3AF" tickFormatter={(v) => `${v}€`} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              `${(value as number)?.toLocaleString() || 0}€`,
              name === 'actual' ? 'CA Réel' : name === 'baseline' ? 'Baseline' : 'Uplift',
            ]}
          />
          <Legend />

          {/* Baseline */}
          <Area
            type="monotone"
            dataKey="baseline"
            stroke="#6B7280"
            fill="#374151"
            fillOpacity={0.5}
            name="Baseline"
          />

          {/* CA réel */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="CA Réel"
          />

          {/* Uplift en barres */}
          <Bar dataKey="uplift" fill="#10B981" opacity={0.4} name="Uplift" />

          {/* Lignes verticales pour les posts */}
          {scenario.influencers.map((inf, idx) => (
            <ReferenceLine
              key={inf.id}
              x={`H${inf.postHour}`}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `${inf.username.slice(0, 8)}`,
                position: 'top',
                fill: COLORS[idx % COLORS.length],
                fontSize: 10,
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Légende des influenceurs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {scenario.influencers.map((inf, idx) => (
          <div
            key={inf.id}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="font-medium">{inf.username}</span>
            <span className="text-gray-400">H+{inf.postHour}</span>
            <span className="text-gray-500">{(inf.followers / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MethodsCard({ combined }: { combined: CombinedConfidence }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-white mb-4">Méthodes Statistiques</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {combined.methods.map((m) => (
          <div key={m.name} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-white text-sm">{m.name}</h3>
              <span
                className={`text-lg font-bold ${
                  m.score >= 70 ? 'text-green-400' : m.score >= 45 ? 'text-yellow-400' : 'text-red-400'
                }`}
              >
                {m.score.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full mb-2">
              <div
                className={`h-full rounded-full ${
                  m.score >= 70 ? 'bg-green-500' : m.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${m.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{m.explanation}</p>
            <div className="mt-2 text-xs text-gray-500">Poids: {(m.weight * 100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PedagogicalSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const topics = [
    {
      id: 'did',
      title: 'Difference-in-Differences (DiD)',
      icon: '📈',
      content: `**Principe**

Compare deux différences:
1. Le changement RÉEL des ventes (avant vs après le post)
2. Le changement ATTENDU (basé sur la baseline historique)

**Formule:**
DiD = (Ventes_après - Ventes_avant) - (Attendu_après - Attendu_avant)

**Exemple:**
- Avant: 400€/h (attendu: 380€/h)
- Après: 600€/h (attendu: 400€/h)
- DiD = (600-400) - (400-380) = 180€/h d'effet

**Avantages:**
- Contrôle les tendances temporelles naturelles
- Donne une p-value pour la significativité`,
    },
    {
      id: 'its',
      title: 'Interrupted Time Series (ITS)',
      icon: '📉',
      content: `**Principe**

Modélise la tendance AVANT le post, puis mesure:
1. Le SAUT de niveau immédiat après le post
2. Le changement de PENTE (accélération ou décélération)

**Modèle:**
Y = niveau_base + tendance×temps + saut×intervention + nouvelle_pente×temps_après

**Ce qu'on mesure:**
- Saut de niveau: +X€/h immédiatement après le post
- Changement de pente: la tendance s'accélère-t-elle ?
- R²: qualité du modèle (plus c'est haut, mieux c'est)

**Avantages:**
- Spécifiquement conçu pour mesurer l'effet d'une intervention
- Robuste aux tendances préexistantes`,
    },
    {
      id: 'causal',
      title: 'Causal Impact',
      icon: '🔮',
      content: `**Principe (inspiré de Google)**

1. Apprendre le pattern de ventes AVANT le post
2. Prédire ce qui "aurait dû" se passer APRÈS (contrefactuel)
3. Comparer la réalité au contrefactuel

**Visualisation:**
- Ligne bleue = CA réel
- Zone grise = Ce qui était attendu sans intervention

Si le CA réel est AU-DESSUS de la zone grise → effet détecté

**Ce qu'on obtient:**
- Effet cumulatif en €
- Probabilité d'un effet causal (0-100%)`,
    },
    {
      id: 'multi',
      title: 'Attribution Multi-Influenceurs',
      icon: '👥',
      content: `**Le défi**

Quand plusieurs influenceurs postent sur 72h, comment répartir l'uplift ?

**Notre approche:**

Score pondéré = Timing × 50% + Audience × 30% + Decay × 20%

- **Timing (50%)**: Corrélation entre le post et le pic de ventes
- **Audience (30%)**: Nombre de followers (échelle log)
- **Decay (20%)**: Bonus pour les posts récents

**Overlap (posts proches):**
Si 2 influenceurs postent à <4h d'intervalle → warning car impossible de les distinguer.

**Exemple:**
- Emma poste à H+6 (500K, uplift clair) → 60%
- Lucas poste à H+20 (300K, uplift moyen) → 40%`,
    },
    {
      id: 'confidence',
      title: 'Score de Confiance Combiné',
      icon: '🎯',
      content: `**Principe**

On combine les 3 méthodes statistiques:
- DiD: 30%
- ITS: 35%
- Causal Impact: 35%

**Interprétation:**
- 70%+ : Haute confiance - Signal clair après le post
- 50-70% : Modérée - Signal présent, corrélation probable
- 30-50% : Faible - Signal faible ou contexte bruité
- <30% : Très faible - Pas de signal clair

**Pourquoi ces poids ?**
ITS et Causal Impact sont les plus adaptés pour les séries temporelles avec intervention.
DiD apporte une validation statistique (p-value).`,
    },
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-white mb-4">Comment ça marche ?</h2>

      <div className="space-y-2">
        {topics.map((topic) => (
          <div
            key={topic.id}
            className={`bg-gray-800 rounded-lg overflow-hidden transition-all ${
              expanded === topic.id ? 'ring-1 ring-blue-500' : ''
            }`}
          >
            <button
              onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{topic.icon}</span>
                <span className="font-medium text-white">{topic.title}</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expanded === topic.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === topic.id && (
              <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                <div className="text-sm text-gray-300 space-y-2">
                  {topic.content.split('\n\n').map((para, i) => {
                    if (para.startsWith('**') && para.endsWith('**')) {
                      return (
                        <h4 key={i} className="font-bold text-blue-400 mt-3">
                          {para.replace(/\*\*/g, '')}
                        </h4>
                      );
                    }
                    if (para.startsWith('- ')) {
                      return (
                        <ul key={i} className="list-disc list-inside space-y-1 ml-2">
                          {para.split('\n').map((line, j) => (
                            <li key={j}>{line.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={i}>
                        {para.split('**').map((part, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="text-white">{part}</strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// GLOBAL STATS CARD - Récap des 1000 tests
// ============================================================================

interface GlobalStats {
  totalTests: number;
  truePositives: number;
  truePositiveRate: number;
  falsePositives: number;
  falsePositiveRate: number;
  trueNegatives: number;
  falseNegatives: number;
  avgConfidenceHigh: number;
  avgConfidenceMedium: number;
  avgConfidenceLow: number;
  avgConfidenceNone: number;
  didSignificantRate: number;
  itsDetectionRate: number;
  causalHighProbRate: number;
  correlation: number;
  distributionData: { category: string; confidence: number; count: number }[];
}

function GlobalStatsCard({ stats }: { stats: GlobalStats }) {
  const precision = stats.truePositives / (stats.truePositives + stats.falsePositives) || 0;
  const recall = stats.truePositives / (stats.truePositives + stats.falseNegatives) || 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-white">
          Stress Test Global
        </h2>
        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
          {stats.totalTests} simulations
        </span>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {(stats.truePositiveRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">Vrais Positifs</div>
          <div className="text-xs text-gray-500">Impact &gt;10% détecté</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">
            {(stats.falsePositiveRate * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">Faux Positifs</div>
          <div className="text-xs text-gray-500">Impact &lt;5% mal détecté</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {(f1Score * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">F1 Score</div>
          <div className="text-xs text-gray-500">Précision globale</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {(stats.correlation * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">Corrélation</div>
          <div className="text-xs text-gray-500">Impact ↔ Confiance</div>
        </div>
      </div>

      {/* Confiance par catégorie d'impact */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-400 mb-3">Confiance moyenne par catégorie d'impact réel</h3>
        <div className="space-y-2">
          {stats.distributionData.map((d) => (
            <div key={d.category} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-400 truncate">{d.category}</div>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    d.confidence >= 60 ? 'bg-green-500' :
                    d.confidence >= 40 ? 'bg-yellow-500' :
                    d.confidence >= 20 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${d.confidence}%` }}
                />
              </div>
              <div className="w-16 text-right">
                <span className="text-sm font-bold text-white">{d.confidence.toFixed(0)}%</span>
                <span className="text-xs text-gray-500 ml-1">({d.count})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Détail par méthode */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="font-bold text-white">{(stats.didSignificantRate * 100).toFixed(0)}%</div>
          <div className="text-gray-400">DiD significatif</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="font-bold text-white">{(stats.itsDetectionRate * 100).toFixed(0)}%</div>
          <div className="text-gray-400">ITS détecte saut</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="font-bold text-white">{(stats.causalHighProbRate * 100).toFixed(0)}%</div>
          <div className="text-gray-400">Causal &gt;70%</div>
        </div>
      </div>

      {/* Interprétation */}
      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg text-sm">
        <p className="text-gray-300">
          <strong className="text-white">Interprétation:</strong>{' '}
          {stats.correlation > 0.6
            ? 'Bonne corrélation entre impact réel et confiance détectée. Le modèle discrimine bien.'
            : stats.correlation > 0.3
            ? 'Corrélation modérée. Le modèle détecte les gros effets mais peut manquer les petits.'
            : 'Corrélation faible. Le modèle a du mal à distinguer les différents niveaux d\'impact.'}
          {stats.falsePositiveRate < 0.15
            ? ' Taux de faux positifs acceptable.'
            : ' Attention: taux de faux positifs élevé.'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: Corrélation de Pearson
// ============================================================================

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const sumY2 = y.reduce((s, yi) => s + yi * yi, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return den > 0 ? num / den : 0;
}
