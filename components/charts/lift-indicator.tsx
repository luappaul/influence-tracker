'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceIndicator } from '@/components/ui/progress';

interface LiftIndicatorProps {
  value: number;
  confidence: 'high' | 'medium' | 'low';
  baseline?: number;
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LiftIndicator({
  value,
  confidence,
  baseline = 100,
  showBar = true,
  size = 'md',
}: LiftIndicatorProps) {
  const isPositive = value > 0;
  const percentage = Math.min(Math.abs(value), 300);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="space-y-2">
      {/* Valeur principale */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-semibold tracking-tight',
            sizeClasses[size],
            isPositive ? 'text-success' : 'text-danger'
          )}
        >
          {isPositive ? '+' : ''}{value}%
        </span>
        {isPositive ? (
          <ArrowUp className="w-5 h-5 text-success" />
        ) : (
          <ArrowDown className="w-5 h-5 text-danger" />
        )}
      </div>

      {/* Barre de progression */}
      {showBar && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isPositive ? 'bg-success' : 'bg-danger'
              )}
              style={{ width: `${Math.min(percentage / 3, 100)}%` }}
            />
          </div>
          <span className="text-xs text-foreground-secondary whitespace-nowrap">
            vs baseline
          </span>
        </div>
      )}

      {/* Indicateur de confiance */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-secondary">Confiance:</span>
        <ConfidenceIndicator level={confidence} showLabel />
      </div>
    </div>
  );
}

// Version compacte pour les tableaux
interface LiftBadgeProps {
  value: number;
  size?: 'sm' | 'md';
}

export function LiftBadge({ value, size = 'md' }: LiftBadgeProps) {
  const isPositive = value > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        size === 'sm' ? 'text-sm' : 'text-base',
        isPositive ? 'text-success' : 'text-danger'
      )}
    >
      {isPositive ? (
        <ArrowUp className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      ) : (
        <ArrowDown className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
      {isPositive ? '+' : ''}{value}%
    </span>
  );
}
