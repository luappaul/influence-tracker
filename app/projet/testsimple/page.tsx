'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  runSimpleAttribution,
  generateSimpleTestScenarios,
  type SimpleTestScenario,
  type SimpleAttributionResult,
} from '@/lib/attribution-model-simple';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Tag,
  Clock,
  Users,
  ShoppingBag,
  Calendar,
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

function getConfidenceIcon(score: number) {
  if (score >= 70) return <CheckCircle className="w-5 h-5 text-green-500" />;
  if (score >= 50) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  if (score >= 30) return <HelpCircle className="w-5 h-5 text-orange-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function getConfidenceColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-red-500';
}

function getConfidenceBg(score: number): string {
  if (score >= 70) return 'bg-green-500/10 border-green-500/30';
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/30';
  if (score >= 30) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function getExpectedBadge(expected: string): { color: string; label: string } {
  const badges: Record<string, { color: string; label: string }> = {
    high: { color: 'bg-green-500/20 text-green-400', label: 'Attendu: Haute' },
    medium: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Attendu: Moyenne' },
    low: { color: 'bg-orange-500/20 text-orange-400', label: 'Attendu: Basse' },
    very_low: { color: 'bg-red-500/20 text-red-400', label: 'Attendu: Très basse' },
  };
  return badges[expected] || badges.low;
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface ScenarioCardProps {
  scenario: SimpleTestScenario;
  result: SimpleAttributionResult;
}

function ScenarioCard({ scenario, result }: ScenarioCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const expectedBadge = getExpectedBadge(scenario.expectedConfidence);
  const { input } = scenario;
  const { confidence, layer1, layer2, layer3, layer5 } = result;

  // Vérifier si le résultat correspond à l'attendu
  const confidenceLevel = confidence.score >= 70 ? 'high' :
    confidence.score >= 50 ? 'medium' :
    confidence.score >= 30 ? 'low' : 'very_low';
  const matchesExpected = confidenceLevel === scenario.expectedConfidence;

  // Données pour le pie chart d'attribution
  const attributionData = layer5.influencerAttributions.map(attr => ({
    name: attr.influencer.username,
    value: attr.attributedRevenue,
    code: attr.revenueFromCode,
  }));

  return (
    <Card className={`p-4 ${matchesExpected ? '' : 'ring-2 ring-red-500/50'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">{scenario.name}</h3>
            <Badge className={expectedBadge.color}>{expectedBadge.label}</Badge>
            {!matchesExpected && (
              <Badge className="bg-red-500/20 text-red-400">⚠️ Écart</Badge>
            )}
          </div>
          <p className="text-sm text-foreground-secondary">{scenario.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {getConfidenceIcon(confidence.score)}
          <span className={`text-2xl font-bold ${getConfidenceColor(confidence.score)}`}>
            {confidence.score}
          </span>
        </div>
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-5 gap-2 mb-3 text-center">
        <div className="p-2 rounded bg-background-secondary">
          <p className="text-[10px] text-foreground-secondary uppercase">Observé</p>
          <p className="font-semibold text-sm">{formatCurrency(result.observedRevenue)}</p>
        </div>
        <div className="p-2 rounded bg-background-secondary">
          <p className="text-[10px] text-foreground-secondary uppercase">Baseline</p>
          <p className="font-semibold text-sm">{formatCurrency(result.baselineRevenue)}</p>
        </div>
        <div className="p-2 rounded bg-background-secondary">
          <p className="text-[10px] text-foreground-secondary uppercase">Uplift</p>
          <p className={`font-semibold text-sm ${result.upliftTotal > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {result.upliftTotal > 0 ? '+' : ''}{((result.upliftTotal / result.baselineRevenue) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-2 rounded bg-green-500/10">
          <p className="text-[10px] text-foreground-secondary uppercase">Via codes</p>
          <p className="font-semibold text-sm text-green-400">{formatCurrency(result.directFromCodes)}</p>
        </div>
        <div className="p-2 rounded bg-blue-500/10">
          <p className="text-[10px] text-foreground-secondary uppercase">Attribué</p>
          <p className="font-semibold text-sm text-blue-400">{formatCurrency(result.upliftFromInfluencers)}</p>
        </div>
      </div>

      {/* Interprétation */}
      <div className={`p-2 rounded-lg border mb-3 ${getConfidenceBg(confidence.score)}`}>
        <p className="text-xs">{confidence.interpretation}</p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full"
      >
        {showDetails ? 'Masquer les détails' : 'Voir les calculs détaillés'}
      </Button>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          {/* Données d'entrée */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Données Shopify
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">Commandes 24h:</span>
                <span className="float-right font-mono">{input.ordersCount24h}</span>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">Panier moyen:</span>
                <span className="float-right font-mono">{formatCurrency(result.observedRevenue / input.ordersCount24h)}</span>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">MA7:</span>
                <span className="float-right font-mono">{formatCurrency(layer1.ma7)}</span>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">MA14:</span>
                <span className="float-right font-mono">{formatCurrency(layer1.ma14)}</span>
              </div>
            </div>
          </div>

          {/* Contexte */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Contexte
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">Momentum:</span>
                <span className="float-right">
                  {input.activeMomentums.length > 0
                    ? input.activeMomentums.map(m => m.name).join(', ')
                    : <span className="text-gray-500">Aucun</span>}
                </span>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <span className="text-foreground-secondary">Promo globale:</span>
                <span className={`float-right ${input.globalPromoActive ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {input.globalPromoActive ? `-${(input.globalPromoDiscount * 100).toFixed(0)}%` : 'Non'}
                </span>
              </div>
            </div>
          </div>

          {/* Influenceurs */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Influenceurs ({input.influencers.length})
            </h5>
            {input.influencers.length === 0 ? (
              <p className="text-sm text-foreground-secondary italic">Aucun influenceur</p>
            ) : (
              <div className="space-y-2">
                {layer5.influencerAttributions.map((attr, i) => {
                  const inf = attr.influencer;
                  const hoursSince = (new Date(input.currentDate).getTime() - new Date(inf.postTimestamp).getTime()) / (1000 * 60 * 60);
                  return (
                    <div key={i} className="p-2 rounded bg-background-secondary">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">@{inf.username}</span>
                        <span className="text-xs text-foreground-secondary">il y a {hoursSince.toFixed(1)}h</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div>
                          <span className="text-foreground-secondary">Code:</span>
                          <span className={`ml-1 ${inf.promoCode ? 'text-green-400' : 'text-gray-500'}`}>
                            {inf.promoCode || 'Aucun'}
                          </span>
                        </div>
                        <div>
                          <span className="text-foreground-secondary">Utilisations:</span>
                          <span className="ml-1 font-mono">{inf.codeUsageCount}</span>
                        </div>
                        <div>
                          <span className="text-foreground-secondary">Timing:</span>
                          <span className="ml-1 font-mono">{(attr.timingScore * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-foreground-secondary">Poids:</span>
                          <span className="ml-1 font-mono">{(attr.weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="mt-1 pt-1 border-t border-border/30 flex justify-between text-xs">
                        <span>CA code: <span className="text-green-400 font-semibold">{formatCurrency(attr.revenueFromCode)}</span></span>
                        <span>Total attribué: <span className="text-blue-400 font-semibold">{formatCurrency(attr.attributedRevenue)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calculs */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Calculs couche par couche
            </h5>
            <div className="space-y-2 text-sm font-mono">
              <div className="p-2 rounded bg-gray-500/10 border-l-4 border-gray-500">
                <p className="text-foreground-secondary">Layer 1: Baseline saisonnalité</p>
                <p>= 0.5×{layer1.ma7.toFixed(0)} + 0.3×{layer1.ma14.toFixed(0)} + 0.2×{(layer1.ma28 || layer1.ma14).toFixed(0)}</p>
                <p>× jour_semaine ({layer1.dayOfWeekMultiplier.toFixed(2)})</p>
                <p className="text-accent font-semibold">= {formatCurrency(layer1.expectedRevenue24h)}</p>
              </div>

              <div className="p-2 rounded bg-yellow-500/10 border-l-4 border-yellow-500">
                <p className="text-foreground-secondary">Layer 2: Momentum</p>
                <p>× {layer2.momentumMultiplier.toFixed(3)} {layer2.activeMomentums.length > 0 ? `(${layer2.activeMomentums.map(m => m.name).join(', ')})` : '(aucun)'}</p>
                <p className="text-accent font-semibold">= {formatCurrency(layer2.expectedWithMomentum)}</p>
              </div>

              <div className="p-2 rounded bg-pink-500/10 border-l-4 border-pink-500">
                <p className="text-foreground-secondary">Layer 3: Promo globale</p>
                <p>× {layer3.promoMultiplier.toFixed(3)} {layer3.promoActive ? `(remise ${(input.globalPromoDiscount * 100).toFixed(0)}%)` : '(aucune)'}</p>
                <p className="text-accent font-semibold">= {formatCurrency(layer3.expectedWithPromo)} (expected final)</p>
              </div>

              <div className="p-2 rounded bg-green-500/10 border-l-4 border-green-500">
                <p className="text-foreground-secondary">Layer 5: Attribution</p>
                <p>Uplift = {formatCurrency(result.observedRevenue)} - {formatCurrency(layer3.expectedWithPromo)}</p>
                <p className={result.upliftFromInfluencers > 0 ? 'text-green-400' : 'text-red-400'}>
                  = {formatCurrency(result.upliftFromInfluencers)}
                </p>
                <p className="text-foreground-secondary mt-1">
                  Dont direct codes: {formatCurrency(result.directFromCodes)} | Indirect estimé: {formatCurrency(result.indirectEstimated)}
                </p>
              </div>
            </div>
          </div>

          {/* Score de confiance détaillé */}
          <div className="p-3 rounded-lg bg-slate-800/50">
            <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Score de confiance: {confidence.score}/100
            </h5>
            <div className="grid grid-cols-5 gap-2 text-xs text-center">
              <div className="p-2 rounded bg-background-secondary">
                <p className="text-foreground-secondary mb-1">Signal</p>
                <p className="font-semibold">{(confidence.components.signalStrength * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-foreground-secondary">×0.20</p>
              </div>
              <div className="p-2 rounded bg-green-500/10">
                <p className="text-foreground-secondary mb-1">Code</p>
                <p className="font-semibold text-green-400">{(confidence.components.codeEvidence * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-foreground-secondary">×0.35</p>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <p className="text-foreground-secondary mb-1">Timing</p>
                <p className="font-semibold">{(confidence.components.temporalClarity * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-foreground-secondary">×0.15</p>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <p className="text-foreground-secondary mb-1">Bruit</p>
                <p className="font-semibold">{(confidence.components.confounding * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-foreground-secondary">×0.20</p>
              </div>
              <div className="p-2 rounded bg-background-secondary">
                <p className="text-foreground-secondary mb-1">Overlap</p>
                <p className="font-semibold">{(confidence.components.overlap * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-foreground-secondary">×0.10</p>
              </div>
            </div>
            <p className="text-xs text-foreground-secondary mt-2 text-center">
              Le <span className="text-green-400 font-semibold">code promo</span> a le poids le plus fort (×0.35) car c'est notre preuve la plus solide
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function SummaryStats({ results }: { results: { scenario: SimpleTestScenario; result: SimpleAttributionResult }[] }) {
  // Stats
  const avgConfidence = results.reduce((sum, r) => sum + r.result.confidence.score, 0) / results.length;
  const totalDirectCodes = results.reduce((sum, r) => sum + r.result.directFromCodes, 0);
  const totalAttributed = results.reduce((sum, r) => sum + r.result.upliftFromInfluencers, 0);

  // Vérifier combien correspondent aux attentes
  const matching = results.filter(r => {
    const level = r.result.confidence.score >= 70 ? 'high' :
      r.result.confidence.score >= 50 ? 'medium' :
      r.result.confidence.score >= 30 ? 'low' : 'very_low';
    return level === r.scenario.expectedConfidence;
  }).length;

  // Distribution des scores
  const distribution = [
    { name: '70+', count: results.filter(r => r.result.confidence.score >= 70).length, color: '#10B981' },
    { name: '50-69', count: results.filter(r => r.result.confidence.score >= 50 && r.result.confidence.score < 70).length, color: '#F59E0B' },
    { name: '30-49', count: results.filter(r => r.result.confidence.score >= 30 && r.result.confidence.score < 50).length, color: '#F97316' },
    { name: '<30', count: results.filter(r => r.result.confidence.score < 30).length, color: '#EF4444' },
  ];

  return (
    <Card className="p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Résultats du Stress Test</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-background-secondary">
          <p className="text-sm text-foreground-secondary">Scénarios testés</p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-background-secondary">
          <p className="text-sm text-foreground-secondary">Confiance moyenne</p>
          <p className={`text-2xl font-bold ${getConfidenceColor(avgConfidence)}`}>{avgConfidence.toFixed(0)}/100</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10">
          <p className="text-sm text-foreground-secondary">Résultats attendus</p>
          <p className={`text-2xl font-bold ${matching === results.length ? 'text-green-400' : 'text-yellow-400'}`}>
            {matching}/{results.length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10">
          <p className="text-sm text-foreground-secondary">CA tracké via codes</p>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalDirectCodes)}</p>
        </div>
      </div>

      {/* Distribution des scores */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {distribution.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-foreground-secondary">{d.name}: {d.count}</span>
          </div>
        ))}
      </div>

      <div className="h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Bar dataKey="count" radius={4}>
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TestSimplePage() {
  const scenarios = useMemo(() => generateSimpleTestScenarios(), []);
  const results = useMemo(() => {
    return scenarios.map(scenario => ({
      scenario,
      result: runSimpleAttribution(scenario.input),
    }));
  }, [scenarios]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Attribution Model - Version Réaliste
          </h1>
          <p className="text-foreground-secondary">
            Stress test avec uniquement les données Shopify + saisie manuelle
          </p>
        </div>

        {/* Explication du modèle simplifié */}
        <Card className="p-6 mb-6 bg-blue-500/5 border-blue-500/20">
          <h2 className="text-lg font-semibold text-foreground mb-3">Données utilisées (réalistes)</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-green-400 mb-2">✅ Disponibles (Shopify)</h3>
              <ul className="space-y-1 text-foreground-secondary">
                <li>• CA historique (MA7, MA14, MA28)</li>
                <li>• Commandes avec codes promo</li>
                <li>• Nombre d'utilisations par code</li>
                <li>• Panier moyen</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-yellow-400 mb-2">⚠️ Saisie manuelle</h3>
              <ul className="space-y-1 text-foreground-secondary">
                <li>• Timing du post influenceur</li>
                <li>• Promo globale active (oui/non)</li>
                <li>• Période momentum (BF, soldes...)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <h3 className="font-medium text-red-400 mb-2">❌ Non utilisées (pas dispo sans intégrations)</h3>
            <p className="text-foreground-secondary text-sm">
              Paid media, sessions, reach/engagement influenceur, données YoY
            </p>
          </div>
        </Card>

        {/* Formule simplifiée */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Formule du score de confiance</h2>
          <div className="text-sm font-mono bg-background-secondary p-4 rounded-lg">
            <p className="text-foreground-secondary mb-2">score = </p>
            <p className="pl-4">0.20 × <span className="text-foreground">signal_strength</span> (uplift significatif?)</p>
            <p className="pl-4">+ 0.35 × <span className="text-green-400 font-semibold">code_evidence</span> (commandes avec code influenceur)</p>
            <p className="pl-4">+ 0.15 × <span className="text-foreground">timing_clarity</span> (post récent?)</p>
            <p className="pl-4">+ 0.20 × <span className="text-foreground">confounding</span> (peu de momentum/promo?)</p>
            <p className="pl-4">+ 0.10 × <span className="text-foreground">overlap</span> (pas trop d'influenceurs?)</p>
          </div>
          <p className="text-sm text-foreground-secondary mt-3">
            Le <span className="text-green-400 font-semibold">code promo</span> a le poids le plus élevé (35%) car c'est la seule preuve directe et irréfutable qu'on a.
          </p>
        </Card>

        {/* Summary */}
        <SummaryStats results={results} />

        {/* Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map(({ scenario, result }) => (
            <ScenarioCard key={scenario.id} scenario={scenario} result={result} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-foreground-secondary">
          <p>Modèle simplifié v1.0 - Données générées aléatoirement</p>
        </div>
      </div>
    </div>
  );
}
