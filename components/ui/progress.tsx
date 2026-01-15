'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel = false, size = 'md', variant = 'default', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantClasses = {
      default: 'bg-accent',
      success: 'bg-success',
      warning: 'bg-amber-500',
      danger: 'bg-danger',
    };

    return (
      <div className={cn('w-full', className)} {...props} ref={ref}>
        <div className={cn('w-full bg-background-secondary rounded-full overflow-hidden', sizeClasses[size])}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', variantClasses[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <p className="mt-1 text-xs text-foreground-secondary text-right">{Math.round(percentage)}%</p>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// Indicateur de confiance avec des points
interface ConfidenceIndicatorProps {
  level: 'high' | 'medium' | 'low';
  showLabel?: boolean;
}

export function ConfidenceIndicator({ level, showLabel = true }: ConfidenceIndicatorProps) {
  const config = {
    high: { dots: 4, label: 'Élevée', color: 'bg-success' },
    medium: { dots: 3, label: 'Moyenne', color: 'bg-accent' },
    low: { dots: 2, label: 'Faible', color: 'bg-foreground-secondary' },
  };

  const { dots, label, color } = config[level];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              i <= dots ? color : 'bg-border'
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-foreground-secondary">{label}</span>
      )}
    </div>
  );
}
