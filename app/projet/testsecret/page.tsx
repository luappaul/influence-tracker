'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  runFullAttribution,
  type FullAttributionResult,
} from '@/lib/attribution-model';
import {
  generateTestScenarios,
  type TestScenario,
  SCENARIOS,
} from '@/lib/test-data-generator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Layers,
  Target,
  Activity,
  Users,
  DollarSign,
  Percent,
  Clock,
  Zap,
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getConfidenceColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-red-500';
}

function getConfidenceBg(score: number): string {
  if (score >= 70) return 'bg-green-500/10';
  if (score >= 50) return 'bg-yellow-500/10';
  if (score >= 30) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

function getScenarioBadge(scenario: string): { color: string; label: string } {
  const badges: Record<string, { color: string; label: string }> = {
    growing: { color: 'bg-green-500/10 text-green-500', label: 'Croissance' },
    new: { color: 'bg-blue-500/10 text-blue-500', label: 'Startup' },
    declining: { color: 'bg-red-500/10 text-red-500', label: 'Déclin' },
  };
  return badges[scenario] || badges.growing;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ScenarioResultProps {
  scenario: TestScenario;
  result: FullAttributionResult;
}

function LayerBreakdown({ result }: { result: FullAttributionResult }) {
  const layers = [
    {
      name: 'Baseline (Saisonnalité)',
      value: result.layer1.expectedRevenue24hNoActivation,
      color: '#6B7280',
      description: `MA7: ${formatCurrency(result.layer1.ma7)} | MA14: ${formatCurrency(result.layer1.ma14)} | MA28: ${formatCurrency(result.layer1.ma28)}`,
    },
    {
      name: 'Momentum E-commerce',
      value: result.layer2.expectedRevenue24hWithMomentum - result.layer1.expectedRevenue24hNoActivation,
      color: '#F59E0B',
      description: `×${result.layer2.momentumMultiplier.toFixed(2)} (${result.layer2.activeMomentums.map(m => m.name).join(', ') || 'Aucun'})`,
    },
    {
      name: 'Promos & Offres',
      value: result.layer3.expectedRevenue24hWithPromos - result.layer2.expectedRevenue24hWithMomentum,
      color: '#EC4899',
      description: `Score promo: ${result.layer3.promoScore.toFixed(2)} → ×${result.layer3.promoMultiplier.toFixed(2)}`,
    },
    {
      name: 'Paid Media',
      value: result.layer4.expectedRevenue24hWithAllCorrections - result.layer3.expectedRevenue24hWithPromos,
      color: '#8B5CF6',
      description: `Pression: ${result.layer4.paidPressure.toFixed(2)} | Traffic lift: ${result.layer4.trafficLift.toFixed(2)}`,
    },
    {
      name: 'Influenceur (Résiduel)',
      value: result.layer5.upliftResidual,
      color: '#10B981',
      description: `${result.layer5.influencerAttributions.length} influenceur(s) actif(s)`,
    },
  ];

  const chartData = layers.map(l => ({
    name: l.name.split(' ')[0],
    fullName: l.name,
    value: Math.max(0, l.value),
    color: l.color,
  }));

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Décomposition par couche
      </h4>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        {layers.map((layer, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background-secondary/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: layer.color }} />
              <span className="text-foreground-secondary">{layer.name}</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-foreground">{formatCurrency(layer.value)}</span>
              <p className="text-xs text-foreground-secondary">{layer.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceBreakdown({ result }: { result: FullAttributionResult }) {
  const { components, confidenceScore } = result.confidence;

  const radarData = [
    { metric: 'Signal', value: components.signalStrength * 100, fullMark: 100 },
    { metric: 'Timing', value: components.temporalPurity * 100, fullMark: 100 },
    { metric: 'Canal IG', value: components.channelEvidence * 100, fullMark: 100 },
    { metric: 'Bruit faible', value: components.confounding * 100, fullMark: 100 },
    { metric: 'Pas chevauch.', value: components.overlap * 100, fullMark: 100 },
    { metric: 'Clarté', value: components.clarity * 100, fullMark: 100 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          Score de Confiance
        </h4>
        <div className={`text-3xl font-bold ${getConfidenceColor(confidenceScore)}`}>
          {confidenceScore}
          <span className="text-lg">/100</span>
        </div>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(components).map(([key, value]) => {
          const labels: Record<string, string> = {
            signalStrength: 'Force du signal',
            temporalPurity: 'Pureté temporelle',
            channelEvidence: 'Preuve canal IG',
            confounding: 'Peu de bruit',
            overlap: 'Pas de chevauchement',
            clarity: 'Clarté attribution',
          };
          return (
            <div key={key} className="flex items-center justify-between p-2 rounded bg-background-secondary/50">
              <span className="text-foreground-secondary text-xs">{labels[key]}</span>
              <span className="font-medium">{(value * 100).toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyAnalysis({ scenario, result }: ScenarioResultProps) {
  const hourlyData = scenario.input.hourlyRevenue24h.map((revenue, hour) => ({
    hour: `${hour}h`,
    observed: revenue,
    expected: result.layer1.hourlyExpected[hour],
    uplift: Math.max(0, revenue - result.layer1.hourlyExpected[hour]),
  }));

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Analyse horaire (24h)
      </h4>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="uplift"
              name="Uplift"
              fill="#10B98133"
              stroke="#10B981"
              strokeWidth={0}
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Baseline attendu"
              stroke="#6B7280"
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="observed"
              name="CA observé"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-foreground-secondary">
        <p>
          <span className="text-green-500 font-medium">Zone verte</span> = uplift au-dessus de la baseline.
          Un pic concentré dans les 0-3h après le post = signal Instagram fort.
        </p>
      </div>
    </div>
  );
}

function InfluencerAttribution({ result }: { result: FullAttributionResult }) {
  const { influencerAttributions, upliftResidual } = result.layer5;

  if (influencerAttributions.length === 0) {
    return (
      <div className="text-center py-8 text-foreground-secondary">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Aucun influenceur actif dans cette fenêtre</p>
      </div>
    );
  }

  const pieData = influencerAttributions.map(attr => ({
    name: attr.influencer.username,
    value: attr.weight * 100,
  }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-foreground flex items-center gap-2">
        <Users className="w-4 h-4" />
        Attribution par influenceur
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                label={({ name, value }) => `${(name as string)?.split('_')[0] || ''} ${(value as number)?.toFixed(0) || 0}%`}
                labelLine={false}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {influencerAttributions.map((attr, i) => (
            <div key={attr.influencer.id} className="p-2 rounded-lg bg-background-secondary/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-accent/20">
                  <img src={attr.influencer.profilePicUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="font-medium text-sm">@{attr.influencer.username}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-foreground-secondary">CA attribué:</span>
                <span className="font-medium text-green-500">{formatCurrency(attr.attributedUplift)}</span>
                <span className="text-foreground-secondary">Poids:</span>
                <span>{(attr.weight * 100).toFixed(1)}%</span>
                <span className="text-foreground-secondary">Timing score:</span>
                <span>{(attr.timingScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-secondary">Uplift total attribué aux influenceurs</span>
          <span className="text-xl font-bold text-green-500">{formatCurrency(upliftResidual)}</span>
        </div>
      </div>
    </div>
  );
}

// Nouveau composant: Détail complet des données et calculs
function RawDataBreakdown({ scenario, result }: ScenarioResultProps) {
  const { input } = scenario;
  const { layer1, layer2, layer3, layer4, layer5, confidence } = result;

  // Calculer les sessions attendues (comme dans le modèle)
  const avgSessionsLast7 = input.historicalData.daily.slice(-7)
    .reduce((sum, d) => sum + d.sessions, 0) / 7;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Données d'entrée brutes */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
          📊 Données d'entrée brutes
        </h4>

        {/* Données observées 24h */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-accent mb-2">Fenêtre 24h observée</h5>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CA observé:</span>
              <span className="float-right font-mono font-medium">{formatCurrency(input.observedRevenue24h)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Sessions:</span>
              <span className="float-right font-mono font-medium">{input.observedSessions24h.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Sessions IG:</span>
              <span className="float-right font-mono font-medium">{input.observedIgSessions24h.toLocaleString()} ({((input.observedIgSessions24h / input.observedSessions24h) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-accent mb-2">Données historiques ({input.historicalData.daily.length} jours)</h5>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CA J-7 (moy):</span>
              <span className="float-right font-mono font-medium">{formatCurrency(layer1.ma7)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CA J-14 (moy):</span>
              <span className="float-right font-mono font-medium">{formatCurrency(layer1.ma14)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CA J-28 (moy):</span>
              <span className="float-right font-mono font-medium">{formatCurrency(layer1.ma28)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Sessions (moy):</span>
              <span className="float-right font-mono font-medium">{Math.round(avgSessionsLast7).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Contexte Promo */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-accent mb-2">Contexte Promotionnel</h5>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Remise:</span>
              <span className="float-right font-mono font-medium">{(input.promoContext.discountLevel * 100).toFixed(0)}%</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Code global:</span>
              <span className={`float-right font-mono font-medium ${input.promoContext.globalCodeActive ? 'text-green-400' : 'text-gray-500'}`}>
                {input.promoContext.globalCodeActive ? 'OUI' : 'NON'}
              </span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Bundles:</span>
              <span className={`float-right font-mono font-medium ${input.promoContext.bundlesActive ? 'text-green-400' : 'text-gray-500'}`}>
                {input.promoContext.bundlesActive ? 'OUI' : 'NON'}
              </span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Free shipping:</span>
              <span className={`float-right font-mono font-medium ${input.promoContext.freeShipping ? 'text-green-400' : 'text-gray-500'}`}>
                {input.promoContext.freeShipping ? 'OUI' : 'NON'}
              </span>
            </div>
          </div>
        </div>

        {/* Contexte Paid Media */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-accent mb-2">Paid Media (24h)</h5>
          <div className="grid grid-cols-5 gap-2 text-sm">
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Meta:</span>
              <span className="float-right font-mono font-medium">{formatCurrency(input.paidMediaContext.metaSpend24h)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Google:</span>
              <span className="float-right font-mono font-medium">{formatCurrency(input.paidMediaContext.googleSpend24h)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">Baseline:</span>
              <span className="float-right font-mono font-medium">{formatCurrency(input.paidMediaContext.paidSpendBaseline)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CPM Δ:</span>
              <span className="float-right font-mono font-medium">×{input.paidMediaContext.avgCpmChange.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded bg-background-secondary">
              <span className="text-foreground-secondary">CPC Δ:</span>
              <span className="float-right font-mono font-medium">×{input.paidMediaContext.avgCpcChange.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Influenceurs */}
        <div>
          <h5 className="text-sm font-medium text-accent mb-2">Influenceurs actifs ({input.influencers.length})</h5>
          {input.influencers.length === 0 ? (
            <p className="text-sm text-foreground-secondary italic">Aucun influenceur dans cette fenêtre</p>
          ) : (
            <div className="space-y-2">
              {input.influencers.map((inf, i) => {
                const hoursSince = (new Date(input.currentDate).getTime() - new Date(inf.postTimestamp).getTime()) / (1000 * 60 * 60);
                return (
                  <div key={i} className="p-3 rounded bg-background-secondary">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-accent/20">
                        <img src={inf.profilePicUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium">@{inf.username}</span>
                      <span className="text-xs text-foreground-secondary ml-auto">Posté il y a {hoursSince.toFixed(1)}h</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="text-foreground-secondary">Reach:</span>
                        <span className="ml-1 font-mono">{inf.reachEstimated.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Engage:</span>
                        <span className="ml-1 font-mono">{inf.engagementRate.toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Lien:</span>
                        <span className={`ml-1 ${inf.storyWithLink ? 'text-green-400' : 'text-gray-500'}`}>
                          {inf.storyWithLink ? '✓' : '✗'}
                        </span>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Code:</span>
                        <span className={`ml-1 ${inf.personalCodeUsed ? 'text-green-400' : 'text-gray-500'}`}>
                          {inf.personalCodeUsed ? '✓' : '✗'}
                        </span>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Historique:</span>
                        <span className="ml-1 font-mono">
                          {inf.historicalConfidence !== undefined ? `${(inf.historicalConfidence * 100).toFixed(0)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Calculs couche par couche */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
          🧮 Calculs détaillés par couche
        </h4>

        {/* Couche 1 */}
        <div className="mb-4 p-3 rounded-lg bg-gray-500/10 border-l-4 border-gray-500">
          <h5 className="font-medium text-gray-400 mb-2">Couche 1 - Saisonnalité (Baseline)</h5>
          <div className="text-sm space-y-1 font-mono">
            <p className="text-foreground-secondary">
              expected_base = 0.5 × MA7 + 0.3 × MA14 + 0.2 × MA28
            </p>
            <p className="text-foreground">
              = 0.5 × {layer1.ma7.toFixed(0)} + 0.3 × {layer1.ma14.toFixed(0)} + 0.2 × {layer1.ma28.toFixed(0)}
            </p>
            <p className="text-foreground">
              = {(0.5 * layer1.ma7 + 0.3 * layer1.ma14 + 0.2 * layer1.ma28).toFixed(0)} €
            </p>
            {layer1.yoyFactor !== 1 && (
              <>
                <p className="text-foreground-secondary mt-2">× yoy_factor = {layer1.yoyFactor.toFixed(3)}</p>
              </>
            )}
            <p className="text-accent font-semibold mt-2">
              → Baseline: {formatCurrency(layer1.expectedRevenue24hNoActivation)}
            </p>
          </div>
        </div>

        {/* Couche 2 */}
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border-l-4 border-yellow-500">
          <h5 className="font-medium text-yellow-500 mb-2">Couche 2 - Momentums E-commerce</h5>
          <div className="text-sm space-y-1 font-mono">
            {layer2.activeMomentums.length === 0 ? (
              <p className="text-foreground-secondary">Aucun momentum actif → multiplier = 1.00</p>
            ) : (
              <>
                <p className="text-foreground-secondary">Momentums actifs:</p>
                {layer2.activeMomentums.map((m, i) => (
                  <p key={i} className="text-foreground pl-2">
                    - {m.name}: intensité {(m.intensity * 100).toFixed(0)}% × impact {(m.impact / m.intensity * 100).toFixed(0)}% = +{(m.impact * 100).toFixed(1)}%
                  </p>
                ))}
              </>
            )}
            <p className="text-foreground-secondary mt-2">
              momentum_multiplier = {layer2.momentumMultiplier.toFixed(3)}
            </p>
            <p className="text-foreground">
              = {formatCurrency(layer1.expectedRevenue24hNoActivation)} × {layer2.momentumMultiplier.toFixed(3)}
            </p>
            <p className="text-accent font-semibold mt-2">
              → Avec momentum: {formatCurrency(layer2.expectedRevenue24hWithMomentum)}
            </p>
          </div>
        </div>

        {/* Couche 3 */}
        <div className="mb-4 p-3 rounded-lg bg-pink-500/10 border-l-4 border-pink-500">
          <h5 className="font-medium text-pink-500 mb-2">Couche 3 - Promos & Offres</h5>
          <div className="text-sm space-y-1 font-mono">
            <p className="text-foreground-secondary">
              promo_score = 0.4×discount + 0.3×code + 0.2×bundles + 0.1×shipping
            </p>
            <p className="text-foreground">
              = 0.4×{input.promoContext.discountLevel.toFixed(2)} + 0.3×{input.promoContext.globalCodeActive ? '1' : '0'} + 0.2×{input.promoContext.bundlesActive ? '1' : '0'} + 0.1×{input.promoContext.freeShipping ? '1' : '0'}
            </p>
            <p className="text-foreground">
              = {layer3.promoScore.toFixed(3)}
            </p>
            <p className="text-foreground-secondary mt-2">
              promo_multiplier = 1 + {layer3.promoScore.toFixed(3)} = {layer3.promoMultiplier.toFixed(3)}
            </p>
            <p className="text-foreground">
              = {formatCurrency(layer2.expectedRevenue24hWithMomentum)} × {layer3.promoMultiplier.toFixed(3)}
            </p>
            <p className="text-accent font-semibold mt-2">
              → Avec promos: {formatCurrency(layer3.expectedRevenue24hWithPromos)}
            </p>
          </div>
        </div>

        {/* Couche 4 */}
        <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border-l-4 border-purple-500">
          <h5 className="font-medium text-purple-500 mb-2">Couche 4 - Paid Media</h5>
          <div className="text-sm space-y-1 font-mono">
            <p className="text-foreground-secondary">
              paid_pressure = total_spend / baseline_spend
            </p>
            <p className="text-foreground">
              = ({input.paidMediaContext.metaSpend24h} + {input.paidMediaContext.googleSpend24h}) / {input.paidMediaContext.paidSpendBaseline}
              = {layer4.paidPressure.toFixed(3)}
            </p>
            <p className="text-foreground-secondary mt-2">
              traffic_lift = sessions_obs / sessions_exp = {input.observedSessions24h} / {Math.round(avgSessionsLast7)} = {layer4.trafficLift.toFixed(3)}
            </p>
            <p className="text-foreground-secondary mt-2">
              paid_influence = 0.5×pressure + 0.3×traffic + 0.2×max(cpm,cpc)
            </p>
            <p className="text-foreground">
              = 0.5×{layer4.paidPressure.toFixed(2)} + 0.3×{layer4.trafficLift.toFixed(2)} + 0.2×{Math.max(input.paidMediaContext.avgCpmChange, input.paidMediaContext.avgCpcChange).toFixed(2)}
              = {layer4.paidInfluenceScore.toFixed(3)}
            </p>
            <p className="text-foreground-secondary mt-2">
              paid_multiplier = 1 + 0.5×(score - 1) = 1 + 0.5×({layer4.paidInfluenceScore.toFixed(3)} - 1) = {layer4.paidMultiplier.toFixed(3)}
            </p>
            <p className="text-foreground">
              = {formatCurrency(layer3.expectedRevenue24hWithPromos)} × {layer4.paidMultiplier.toFixed(3)}
            </p>
            <p className="text-accent font-semibold mt-2">
              → Expected final (avant influence): {formatCurrency(layer4.expectedRevenue24hWithAllCorrections)}
            </p>
          </div>
        </div>

        {/* Couche 5 */}
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border-l-4 border-green-500">
          <h5 className="font-medium text-green-500 mb-2">Couche 5 - Attribution Influenceur</h5>
          <div className="text-sm space-y-1 font-mono">
            <p className="text-foreground-secondary">
              uplift_résiduel = CA_observé - expected_final
            </p>
            <p className="text-foreground">
              = {formatCurrency(input.observedRevenue24h)} - {formatCurrency(layer4.expectedRevenue24hWithAllCorrections)}
            </p>
            <p className={`font-semibold ${layer5.upliftResidual > 0 ? 'text-green-400' : 'text-red-400'}`}>
              = {formatCurrency(layer5.upliftResidual)}
            </p>

            {layer5.influencerAttributions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <p className="text-foreground-secondary mb-2">Répartition par influenceur:</p>
                {layer5.influencerAttributions.map((attr, i) => (
                  <div key={i} className="pl-2 mb-2">
                    <p className="text-foreground font-medium">@{attr.influencer.username}</p>
                    <p className="text-foreground-secondary text-xs">
                      signal = 0.30×reach({attr.reachScore.toFixed(2)}) + 0.25×engage({attr.engagementScore.toFixed(2)}) + 0.20×timing({attr.timingScore.toFixed(2)}) + 0.15×convert({attr.conversionSignal.toFixed(2)}) + 0.10×history({attr.historicalScore.toFixed(2)})
                    </p>
                    <p className="text-foreground text-xs">
                      = {attr.rawSignal.toFixed(3)} → poids: {(attr.weight * 100).toFixed(1)}%
                    </p>
                    <p className="text-green-400 text-xs font-semibold">
                      → CA attribué: {formatCurrency(attr.attributedUplift)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Calcul du score de confiance */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
          🎯 Calcul du Score de Confiance
        </h4>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Signal Strength */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">A) Signal Strength</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = min(uplift / (0.15 × expected), 1)
            </p>
            <p className="text-foreground text-xs font-mono">
              = min({layer5.upliftResidual.toFixed(0)} / {(0.15 * layer4.expectedRevenue24hWithAllCorrections).toFixed(0)}, 1)
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.signalStrength * 100).toFixed(1)}%</p>
          </div>

          {/* Temporal Purity */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">B) Temporal Purity</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = 0.5×share_0-1h + 0.3×share_1-3h + ...
            </p>
            <p className="text-foreground text-xs">
              Mesure la concentration de l'uplift dans les premières heures
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.temporalPurity * 100).toFixed(1)}%</p>
          </div>

          {/* Channel Evidence */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">C) Channel Evidence</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = (ig_share - 0.10) / 0.20
            </p>
            <p className="text-foreground text-xs font-mono">
              IG share = {(layer4.instagramSessionsShare * 100).toFixed(1)}%
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.channelEvidence * 100).toFixed(1)}%</p>
          </div>

          {/* Confounding */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">D) Confounding (peu de bruit)</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = 1 / (1 + 1×(mom-1) + 0.8×(promo-1) + 0.8×(paid-1))
            </p>
            <p className="text-foreground text-xs font-mono">
              = 1 / (1 + {(layer2.momentumMultiplier - 1).toFixed(2)} + {(0.8 * (layer3.promoMultiplier - 1)).toFixed(2)} + {(0.8 * (layer4.paidMultiplier - 1)).toFixed(2)})
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.confounding * 100).toFixed(1)}%</p>
          </div>

          {/* Overlap */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">E) Overlap (pas de chevauchement)</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = 1 / (1 + 0.25×(n_influencers - 1))
            </p>
            <p className="text-foreground text-xs font-mono">
              = 1 / (1 + 0.25×({input.influencers.length} - 1))
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.overlap * 100).toFixed(1)}%</p>
          </div>

          {/* Clarity */}
          <div className="p-3 rounded bg-background-secondary">
            <p className="font-medium text-foreground mb-1">F) Clarity (clarté attribution)</p>
            <p className="text-foreground-secondary text-xs font-mono">
              = (top_weight - second_weight) / 0.30
            </p>
            <p className="text-foreground text-xs">
              {layer5.influencerAttributions.length < 2 ? 'Un seul influenceur → 100%' : 'Différence entre top 2 poids'}
            </p>
            <p className="text-accent font-semibold">= {(confidence.components.clarity * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Final calculation */}
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="font-medium text-foreground mb-2">Score final:</p>
          <p className="text-sm font-mono text-foreground-secondary">
            = 0.25×signal + 0.20×temporal + 0.15×channel + 0.20×confound + 0.10×overlap + 0.10×clarity
          </p>
          <p className="text-sm font-mono text-foreground">
            = 0.25×{(confidence.components.signalStrength).toFixed(2)} + 0.20×{(confidence.components.temporalPurity).toFixed(2)} + 0.15×{(confidence.components.channelEvidence).toFixed(2)} + 0.20×{(confidence.components.confounding).toFixed(2)} + 0.10×{(confidence.components.overlap).toFixed(2)} + 0.10×{(confidence.components.clarity).toFixed(2)}
          </p>
          <p className={`text-2xl font-bold mt-2 ${getConfidenceColor(confidence.confidenceScore)}`}>
            = {confidence.confidenceScore}/100
          </p>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, result }: ScenarioResultProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const badge = getScenarioBadge(scenario.scenario);

  const upliftPercent = result.baselineRevenue > 0
    ? ((result.observedRevenue - result.baselineRevenue) / result.baselineRevenue) * 100
    : 0;

  return (
    <Card className={`p-4 ${expanded ? 'col-span-full' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{scenario.name}</h3>
            <Badge className={badge.color}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-foreground-secondary">{scenario.description}</p>
        </div>
        <div className={`text-2xl font-bold ${getConfidenceColor(result.confidence.confidenceScore)}`}>
          {result.confidence.confidenceScore}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-background-secondary/50">
          <p className="text-xs text-foreground-secondary">Observé</p>
          <p className="font-semibold text-foreground">{formatCurrency(result.observedRevenue)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-background-secondary/50">
          <p className="text-xs text-foreground-secondary">Baseline</p>
          <p className="font-semibold text-foreground">{formatCurrency(result.baselineRevenue)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-background-secondary/50">
          <p className="text-xs text-foreground-secondary">Uplift</p>
          <p className={`font-semibold ${upliftPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {upliftPercent > 0 ? '+' : ''}{upliftPercent.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-500/10">
          <p className="text-xs text-foreground-secondary">Influenceur</p>
          <p className="font-semibold text-green-500">{formatCurrency(result.layer5.upliftResidual)}</p>
        </div>
      </div>

      {/* Expected behavior */}
      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-400">{scenario.expectedBehavior}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex-1"
        >
          {expanded ? 'Réduire graphiques' : 'Voir graphiques'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRawData(!showRawData)}
          className="flex-1"
        >
          {showRawData ? 'Masquer calculs' : '📊 Voir tous les chiffres'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LayerBreakdown result={result} />
            <ConfidenceBreakdown result={result} />
          </div>
          <HourlyAnalysis scenario={scenario} result={result} />
          <InfluencerAttribution result={result} />
        </div>
      )}

      {showRawData && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <RawDataBreakdown scenario={scenario} result={result} />
        </div>
      )}
    </Card>
  );
}

function SummaryDashboard({ results }: { results: { scenario: TestScenario; result: FullAttributionResult }[] }) {
  const chartData = results.map(({ scenario, result }) => ({
    name: scenario.name.split(' ')[0],
    fullName: scenario.name,
    observed: result.observedRevenue,
    baseline: result.baselineRevenue,
    influencer: result.layer5.upliftResidual,
    other: result.upliftAttributedToOther,
    confidence: result.confidence.confidenceScore,
  }));

  // Calculate totals
  const totalObserved = results.reduce((sum, r) => sum + r.result.observedRevenue, 0);
  const totalBaseline = results.reduce((sum, r) => sum + r.result.baselineRevenue, 0);
  const totalInfluencer = results.reduce((sum, r) => sum + r.result.layer5.upliftResidual, 0);
  const avgConfidence = results.reduce((sum, r) => sum + r.result.confidence.confidenceScore, 0) / results.length;

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Vue d'ensemble - 10 scénarios de test
      </h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-background-secondary">
          <div className="flex items-center gap-2 text-foreground-secondary mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">CA Total Observé</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalObserved)}</p>
        </div>
        <div className="p-4 rounded-xl bg-background-secondary">
          <div className="flex items-center gap-2 text-foreground-secondary mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Baseline Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBaseline)}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Attribué Influenceurs</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(totalInfluencer)}</p>
        </div>
        <div className="p-4 rounded-xl bg-background-secondary">
          <div className="flex items-center gap-2 text-foreground-secondary mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm">Confiance Moyenne</span>
          </div>
          <p className={`text-2xl font-bold ${getConfidenceColor(avgConfidence)}`}>
            {avgConfidence.toFixed(0)}/100
          </p>
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              formatter={(value, name) => {
                if (name === 'Confiance') return [`${value}`, name];
                return [formatCurrency(value as number), name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="baseline" name="Baseline" stackId="a" fill="#6B7280" />
            <Bar yAxisId="left" dataKey="other" name="Autres facteurs" stackId="a" fill="#F59E0B" />
            <Bar yAxisId="left" dataKey="influencer" name="Influenceur" stackId="a" fill="#10B981" />
            <Line yAxisId="right" type="monotone" dataKey="confidence" name="Confiance" stroke="#EC4899" strokeWidth={2} dot={{ fill: '#EC4899' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TestSecretPage() {
  const scenarios = useMemo(() => generateTestScenarios(), []);
  const results = useMemo(() => {
    return scenarios.map(scenario => ({
      scenario,
      result: runFullAttribution(scenario.input),
    }));
  }, [scenarios]);

  const [filter, setFilter] = useState<'all' | 'growing' | 'new' | 'declining'>('all');

  const filteredResults = filter === 'all'
    ? results
    : results.filter(r => r.scenario.scenario === filter);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">
              Attribution Model - Stress Test
            </h1>
          </div>
          <p className="text-foreground-secondary">
            Test du modèle d'attribution à 5 couches sur 10 scénarios représentatifs
          </p>
          <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-sm text-foreground">
              <strong>Objectif :</strong> Isoler le CA incrémental réellement attribuable à un influenceur Instagram,
              en neutralisant : saisonnalité, momentums e-commerce, promos globales, et paid media.
            </p>
          </div>
        </div>

        {/* Algorithm explanation */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Logique du modèle</h2>
          <div className="grid grid-cols-5 gap-4 text-center text-sm">
            <div className="p-3 rounded-lg bg-gray-500/10">
              <div className="font-semibold text-gray-400">Couche 1</div>
              <div className="text-xs text-foreground-secondary mt-1">Saisonnalité</div>
              <div className="text-xs mt-2">MA7/14/28 + YoY</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <div className="font-semibold text-yellow-500">Couche 2</div>
              <div className="text-xs text-foreground-secondary mt-1">Momentums</div>
              <div className="text-xs mt-2">BF, Soldes, Noël...</div>
            </div>
            <div className="p-3 rounded-lg bg-pink-500/10">
              <div className="font-semibold text-pink-500">Couche 3</div>
              <div className="text-xs text-foreground-secondary mt-1">Promos</div>
              <div className="text-xs mt-2">Codes, bundles...</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10">
              <div className="font-semibold text-purple-500">Couche 4</div>
              <div className="text-xs text-foreground-secondary mt-1">Paid Media</div>
              <div className="text-xs mt-2">Meta, Google Ads</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="font-semibold text-green-500">Couche 5</div>
              <div className="text-xs text-foreground-secondary mt-1">Influenceur</div>
              <div className="text-xs mt-2">Résiduel attribué</div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-foreground-secondary">
            CA observé - (Baseline × Momentum × Promo × Paid) = <span className="text-green-500 font-semibold">CA Incrémental Influenceur</span>
          </div>
        </Card>

        {/* Summary Dashboard */}
        <SummaryDashboard results={results} />

        {/* Filter tabs */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setFilter('all')}>
              Tous ({results.length})
            </TabsTrigger>
            <TabsTrigger value="growing" onClick={() => setFilter('growing')}>
              Croissance ({results.filter(r => r.scenario.scenario === 'growing').length})
            </TabsTrigger>
            <TabsTrigger value="new" onClick={() => setFilter('new')}>
              Startup ({results.filter(r => r.scenario.scenario === 'new').length})
            </TabsTrigger>
            <TabsTrigger value="declining" onClick={() => setFilter('declining')}>
              Déclin ({results.filter(r => r.scenario.scenario === 'declining').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Scenario cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredResults.map(({ scenario, result }) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              result={result}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-foreground-secondary">
          <p>Page de test interne - Modèle d'attribution v1.0</p>
          <p className="mt-1">Les données sont générées aléatoirement à chaque chargement</p>
        </div>
      </div>
    </div>
  );
}
