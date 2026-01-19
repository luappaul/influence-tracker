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

function ScenarioCard({ scenario, result }: ScenarioResultProps) {
  const [expanded, setExpanded] = useState(false);
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

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full"
      >
        {expanded ? 'Réduire' : 'Voir le détail'}
      </Button>

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
