'use client';

import { TrendingUp, ShoppingCart, Percent, Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { DashboardStats } from '@/lib/types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, trend, subtitle }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground-secondary">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-foreground-secondary mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
          <Icon className="w-5 h-5 text-accent" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <span
            className={`text-sm font-medium ${
              trend >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-sm text-foreground-secondary ml-1">vs période précédente</span>
        </div>
      )}
    </Card>
  );
}

interface CampaignStatsProps {
  stats: DashboardStats;
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="CA attribué"
        value={formatCurrency(stats.totalRevenue)}
        icon={TrendingUp}
        subtitle="Revenus générés"
      />
      <StatCard
        label="Ventes attribuées"
        value={stats.totalSales.toString()}
        icon={ShoppingCart}
        subtitle="Commandes trackées"
      />
      <StatCard
        label="Lift moyen"
        value={formatPercentage(stats.avgLift)}
        icon={Percent}
        subtitle="vs baseline"
      />
      <StatCard
        label="ROAS"
        value={`${stats.roas.toFixed(2)}x`}
        icon={Calculator}
        subtitle="Retour sur investissement"
      />
    </div>
  );
}
